import { api, getToken } from './api';

export type RangeType = 'tags' | 'commit' | 'date' | 'working';

export interface GenerateInput {
  productId: string;
  rangeType: RangeType;
  from?: string;
  to?: string;
  model?: string;
  createReviewEntries?: boolean;
}

export interface GenerationStats {
  filesAnalyzed: number;
  chunksProcessed: number;
  commits: number;
  model: string;
  reviewEntriesCreated: number;
}

export interface GenerationResult {
  stats: GenerationStats;
  outputs: {
    developerChangelog: string;
    userReleaseNotes: string;
    githubReleaseNotes: string;
    qaChecklist: string;
  };
}

export type ProgressEvent = {
  type: 'info' | 'success' | 'warn' | 'error';
  step: string;
  message: string;
  itemIndex?: number;
  totalItems?: number;
  label?: string;
};

export type GenerateHandlers = {
  onSession?: (sessionId: string) => void;
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (result: GenerationResult) => void;
  onError?: (message: string) => void;
};

/**
 * Streams the changelog generation pipeline over SSE.
 * Uses the same fetch+ReadableStream pattern as jobStream.ts.
 */
export async function generateChangelog(
  input: GenerateInput,
  handlers: GenerateHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await fetch('/api/changelog-gen/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.message) message = errBody.message;
    } catch { /* non-JSON error body */ }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (raw: string) => {
    const lines = raw.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let payload: any;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'session') handlers.onSession?.(payload?.sessionId);
    else if (event === 'progress') handlers.onProgress?.(payload as ProgressEvent);
    else if (event === 'complete') handlers.onComplete?.(payload as GenerationResult);
    else if (event === 'error') handlers.onError?.(payload?.message || 'Generation failed');
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (block.trim()) dispatch(block);
    }
  }
}

export const getProductTags = async (productId: string): Promise<string[]> => {
  const { data } = await api.get(`/changelog-gen/tags/${productId}`);
  return data as string[];
};

export const getProductModels = async (): Promise<string[]> => {
  const { data } = await api.get('/changelog-gen/models');
  return data as string[];
};
