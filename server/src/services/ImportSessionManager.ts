import { isServerless } from '../utils/appConfig';
import { JobSession } from '../models/JobSession';

/**
 * Registry of in-flight streaming-job sessions (WP.org import, bulk delete, …).
 *
 * Each active job registers a session keyed by a random id. The client receives
 * that id as the first SSE event and can later hit the cancel endpoint, which
 * flips the session's `cancelled` flag; the job loop polls `isCancelled()`
 * between items and, when set, stops and rolls back.
 *
 * State is process-local for speed. On serverless (Vercel) the cancel request
 * may hit a different instance than the one running the job, so the flag is
 * ALSO mirrored in MongoDB ({@link JobSession}); the running instance's
 * `refreshFromStore()` poller pulls a cross-instance cancel back into local
 * memory so `isCancelled()` can stay synchronous. On a single-node deployment
 * the DB round-trips are skipped entirely.
 */
class ImportSessionManager {
  private sessions = new Map<string, { cancelled: boolean; userId: string }>();

  create(id: string, userId: string): void {
    this.sessions.set(id, { cancelled: false, userId });
    if (isServerless()) {
      JobSession.create({ sessionId: id, userId, cancelled: false }).catch((err) =>
        console.error('[jobs]: failed to persist session:', err?.message || err)
      );
    }
  }

  /**
   * Requests cancellation. Flips the local flag immediately (same-instance fast
   * path) and, on serverless, the persisted flag too. Resolves true if a
   * matching session existed locally or in the store.
   */
  async requestCancel(id: string, userId?: string): Promise<boolean> {
    const session = this.sessions.get(id);
    let found = false;
    if (session && (!userId || session.userId === userId)) {
      session.cancelled = true;
      found = true;
    }
    if (isServerless()) {
      try {
        const filter: Record<string, any> = { sessionId: id };
        if (userId) filter.userId = userId;
        const r = await JobSession.updateOne(filter, { $set: { cancelled: true } });
        if (r.matchedCount > 0) found = true;
      } catch (err: any) {
        console.error('[jobs]: failed to persist cancel:', err?.message || err);
      }
    }
    return found;
  }

  isCancelled(id: string): boolean {
    return this.sessions.get(id)?.cancelled ?? false;
  }

  /**
   * Serverless only: pull a cross-instance cancel from the store into local
   * memory. Called on an interval by the streaming handler.
   */
  async refreshFromStore(id: string): Promise<void> {
    if (!isServerless()) return;
    const session = this.sessions.get(id);
    if (!session || session.cancelled) return;
    try {
      const doc = await JobSession.findOne({ sessionId: id }).select('cancelled').lean();
      if (doc?.cancelled) session.cancelled = true;
    } catch {
      /* transient DB error — try again on the next tick */
    }
  }

  delete(id: string): void {
    this.sessions.delete(id);
    if (isServerless()) {
      JobSession.deleteOne({ sessionId: id }).catch(() => {});
    }
  }
}

export const importSessionManager = new ImportSessionManager();
