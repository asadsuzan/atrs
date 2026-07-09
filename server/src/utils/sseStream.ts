import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { importSessionManager } from '../services/ImportSessionManager';

/**
 * A single progress event pushed to the client during a streaming job.
 * `itemIndex`/`totalItems` drive the progress bar; `label` is an optional
 * short tag (e.g. a product name) shown in the live console.
 */
export type StreamEvent = {
  type: 'info' | 'success' | 'warn' | 'error';
  step: string;
  message: string;
  itemIndex?: number;
  totalItems?: number;
  label?: string;
};

export interface StreamJobContext {
  emit: (e: StreamEvent) => void;
  isCancelled: () => boolean;
  userId: string;
}

/**
 * Runs `handler` as a Server-Sent Events stream: sets SSE headers, registers a
 * cancellable session (so the client can stop it via /api/jobs/cancel or by
 * disconnecting), emits a `session` event with the id, then forwards progress
 * events and a final `complete` (or `error`). Shared by every bulk/cascade
 * action so they all get the same live-console + minimizable UX.
 */
export async function runStreamJob(
  req: Request,
  res: Response,
  handler: (ctx: StreamJobContext) => Promise<Record<string, any> | void>,
): Promise<void> {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable output buffering in Nginx / proxy layers
  });
  res.write(': ok\n\n');
  req.socket.setKeepAlive(true);
  req.socket.setTimeout(0);

  const userId = req.user!.id;
  const sessionId = randomUUID();
  importSessionManager.create(sessionId, userId);

  // On serverless, poll the shared store so a cancel that lands on another
  // instance is pulled into this instance's in-memory flag (no-op locally).
  const cancelPoll = setInterval(() => {
    void importSessionManager.refreshFromStore(sessionId);
  }, 2000);

  // A client disconnect cancels the job (stops processing further items).
  let clientGone = false;
  req.on('close', () => {
    clientGone = true;
    void importSessionManager.requestCancel(sessionId, userId);
  });

  const send = (event: string, data: unknown) => {
    if (clientGone || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('session', { sessionId });

  try {
    const result = await handler({
      emit: (e) => send('progress', e),
      isCancelled: () => importSessionManager.isCancelled(sessionId),
      userId,
    });
    send('complete', result ?? {});
  } catch (err: any) {
    console.error('[runStreamJob] error:', err);
    send('error', { message: err?.message || 'Operation failed' });
  } finally {
    clearInterval(cancelPoll);
    importSessionManager.delete(sessionId);
    if (!res.writableEnded) res.end();
  }
}
