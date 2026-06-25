import { api, getToken } from './api';

export type ImportProgress = {
  type: 'info' | 'success' | 'warn' | 'error';
  slug?: string;
  step: string;
  message: string;
  pluginIndex?: number;
  totalPlugins?: number;
};

export type ImportSummary = {
  created: number;
  updated: number;
  errors: string[];
  cancelled?: boolean;
  rolledBack?: number;
};

type StreamHandlers = {
  onSession?: (sessionId: string) => void;
  onProgress?: (event: ImportProgress) => void;
  onComplete?: (summary: ImportSummary) => void;
  onError?: (message: string) => void;
};

export const getProducts = async (params?: any) => {
  const finalParams = { limit: 1000, ...params };
  const { data } = await api.get('/products', { params: finalParams });
  return data;
};

export const getProductById = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const createProduct = async (product: any) => {
  const { data } = await api.post('/products', product);
  return data;
};

export const updateProduct = async ({ id, ...product }: any) => {
  const { data } = await api.patch(`/products/${id}`, product);
  return data;
};

export const deleteProduct = async (id: string) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const bulkDeleteProducts = async (ids: string[]) => {
  const { data } = await api.delete('/products/bulk', { data: { ids } });
  return data;
};

export const wpOrgPreview = async (username: string) => {
  const { data } = await api.get('/products/wporg-preview', { params: { username } });
  return data;
};

export const wpOrgPreviewBySlug = async (slugs: string[]) => {
  const { data } = await api.get('/products/wporg-preview-by-slug', { params: { slugs: slugs.join(',') } });
  return data;
};

export const importFromWpOrg = async (username: string, slugs: string[]) => {
  const { data } = await api.post('/products/import-from-wporg', { username, slugs }, { timeout: 120000 });
  return data;
};

/**
 * Streams the WP.org import as Server-Sent Events. Uses fetch() + a stream
 * reader (rather than the native EventSource) so we can POST a body and send
 * the bearer token via the Authorization header. Pass an AbortSignal to cancel
 * the import (e.g. when the dialog is closed mid-stream).
 */
export const importFromWpOrgStream = async (
  username: string,
  slugs: string[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> => {
  const token = getToken();
  const res = await fetch('/api/products/import-from-wporg', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ username, slugs }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Import request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* non-JSON error body — keep the default message */
    }
    handlers.onError?.(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Parse one SSE event block ("event: x\ndata: {...}") and dispatch it.
  const dispatch = (raw: string) => {
    const lines = raw.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return; // comment / keep-alive line
    let payload: any;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'session') handlers.onSession?.(payload?.sessionId);
    else if (event === 'progress') handlers.onProgress?.(payload as ImportProgress);
    else if (event === 'complete') handlers.onComplete?.(payload as ImportSummary);
    else if (event === 'error') handlers.onError?.(payload?.message || 'Import failed');
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (block.trim()) dispatch(block);
    }
  }
};

/**
 * Requests graceful cancellation of an in-flight import. The server stops the
 * import loop, rolls back products created in that session, and streams the
 * rollback over the still-open import stream.
 */
export const cancelImportSession = async (sessionId: string): Promise<void> => {
  await api.post('/products/import-from-wporg/cancel', { sessionId });
};
