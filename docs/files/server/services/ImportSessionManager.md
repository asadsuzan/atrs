# `server/src/services/ImportSessionManager.ts`
**Purpose:** Process-local registry of in-flight streaming-job sessions (WP.org import, bulk delete) with a cooperative cancellation flag, mirrored to MongoDB on serverless so a cancel that lands on a different instance still reaches the running job.
**Language / Size:** TypeScript / 3128 bytes

## Exports
- `const importSessionManager` — singleton instance of the (module-private) `ImportSessionManager` class.

## Imports (Internal / External)
Internal:
- `../utils/appConfig` (isServerless)
- `../models/JobSession` (JobSession — Mongoose model for the cross-instance mirror)

External: Mongoose model statics (create, updateOne, findOne + select + lean, deleteOne); global `Map`.

## Functions / Methods
- **create(id, userId): void** — sets local `sessions.set(id, { cancelled:false, userId })`. On serverless also `JobSession.create({ sessionId:id, userId, cancelled:false })` fire-and-forget (`.catch` logs `[jobs]: failed to persist session:`). Side effects: in-memory + (serverless) DB write.
- **requestCancel(id, userId?): Promise<boolean>** — flips the local flag immediately when a matching session exists (and userId matches, if provided), setting `found`. On serverless also `JobSession.updateOne({sessionId, [userId]}, {$set:{cancelled:true}})`; `found` becomes true if `matchedCount > 0`. DB errors are caught and logged, not thrown. Returns whether a matching session existed locally or in the store.
- **isCancelled(id): boolean** — synchronous; returns `sessions.get(id)?.cancelled ?? false`. Used by job loops between items.
- **refreshFromStore(id): Promise<void>** — serverless only (no-op otherwise). If the local session exists and is not already cancelled, `JobSession.findOne({sessionId}).select('cancelled').lean()`; if `doc.cancelled` sets local `session.cancelled = true`. Transient DB errors swallowed (retry next tick). Called on an interval by the streaming handler to pull a cross-instance cancel into local memory.
- **delete(id): void** — removes local session; on serverless `JobSession.deleteOne({sessionId})` fire-and-forget (errors ignored).

## Data structures / Types / Constants
- `sessions: Map<string, { cancelled: boolean; userId: string }>` (private instance field).

## Important algorithms

### Cross-instance cancellation model
- Single-node: purely in-memory; DB round-trips skipped entirely (`isServerless()` gates every JobSession call).
- Serverless (Vercel): the running instance holds the local flag but a cancel request may hit a different instance. Cancel writes the flag to both local memory and the JobSession collection; the instance running the job periodically calls `refreshFromStore()` to pull a remote cancel into its local memory, so `isCancelled()` stays synchronous for the tight job loop.

## Relationships
- Consumers: WP.org import SSE route (ProductService import pipeline via `onProgress`/`isCancelled`), bulk-delete streaming jobs. The session `id` is emitted as the first SSE event; a cancel endpoint calls `requestCancel`.
- Model: JobSession (serverless mirror).
- Util: appConfig.isServerless (deployment mode switch).

## Edge cases & known limitations
- Local flag is the fast path; DB is only consulted on serverless and only pulled in via the poller — so cross-instance cancels have the latency of the caller's `refreshFromStore` interval.
- All DB operations are best-effort: create/cancel/delete failures are logged or ignored and never surface to the caller (cancel still returns based on the local match / matchedCount).
- `requestCancel` returns true if either the local session OR the persisted row matched.
- No TTL/GC beyond explicit `delete()`; abandoned sessions rely on the caller cleaning up.
