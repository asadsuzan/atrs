import { api, getToken } from './api';

export type JobProgress = {
  type: 'info' | 'success' | 'warn' | 'error';
  step: string;
  message: string;
  itemIndex?: number;
  totalItems?: number;
  label?: string;
};

export type JobSummary = {
  errors?: string[];
  cancelled?: boolean;
  total?: number;
  [key: string]: any;
};

export type JobHandlers = {
  onSession?: (sessionId: string) => void;
  onProgress?: (event: JobProgress) => void;
  onComplete?: (summary: JobSummary) => void;
  onError?: (message: string) => void;
};

/**
 * Runs a streaming (SSE) job over fetch + a stream reader so we can POST a body
 * and send the bearer token. Shared by every bulk/cascade action. `url` is
 * relative to /api. Pass an AbortSignal to hard-cancel (disconnect).
 */
export async function streamJob(
  method: 'POST' | 'DELETE',
  url: string,
  body: any,
  handlers: JobHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.message) message = errBody.message;
    } catch {
      /* non-JSON error body */
    }
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
    if (dataLines.length === 0) return; // comment / keep-alive
    let payload: any;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'session') handlers.onSession?.(payload?.sessionId);
    else if (event === 'progress') handlers.onProgress?.(payload as JobProgress);
    else if (event === 'complete') handlers.onComplete?.(payload as JobSummary);
    else if (event === 'error') handlers.onError?.(payload?.message || 'Operation failed');
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

/** Requests cancellation of an in-flight streaming job (stops further processing). */
export const cancelJob = async (sessionId: string): Promise<void> => {
  await api.post('/jobs/cancel', { sessionId });
};
