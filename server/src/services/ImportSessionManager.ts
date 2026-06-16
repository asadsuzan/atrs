/**
 * In-memory registry of in-flight WP.org import streams.
 *
 * Each active import registers a session keyed by a random id. The client
 * receives that id as the first SSE event and can later hit the cancel
 * endpoint, which flips the session's `cancelled` flag. The import loop polls
 * `isCancelled()` between plugins and, when set, stops and rolls back.
 *
 * Sessions are scoped to the owning user so one user can't cancel another's
 * import. State is process-local — fine for a single-node deployment; a
 * multi-node setup would need a shared store.
 */
class ImportSessionManager {
  private sessions = new Map<string, { cancelled: boolean; userId: string }>();

  create(id: string, userId: string): void {
    this.sessions.set(id, { cancelled: false, userId });
  }

  /** Marks a session cancelled. Returns true if a matching session existed. */
  cancel(id: string, userId?: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (userId && session.userId !== userId) return false;
    session.cancelled = true;
    return true;
  }

  isCancelled(id: string): boolean {
    return this.sessions.get(id)?.cancelled ?? false;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }
}

export const importSessionManager = new ImportSessionManager();
