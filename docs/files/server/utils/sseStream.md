# `server/src/utils/sseStream.ts`
**Purpose:** Runs a long-running handler as a Server-Sent Events (SSE) stream with a cancellable session — shared by every bulk/cascade action to give a uniform live-console + minimizable UX with progress, completion/error events, and client-disconnect cancellation.
**Language / Size:** TypeScript / 2909 bytes

## Exports
- `type StreamEvent`
- `interface StreamJobContext`
- `async function runStreamJob(req, res, handler): Promise<void>`

## Imports (Internal / External)
- Internal: `importSessionManager` from `../services/ImportSessionManager`.
- External: `Request`, `Response` from `express`; `randomUUID` from `crypto`.

## Functions / Methods
### `runStreamJob(req, res, handler)`
1. Writes SSE response headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no` to defeat Nginx/proxy buffering), writes an initial `: ok\n\n` comment, and enables socket keep-alive with no timeout.
2. Reads `userId` from `req.user!.id`, generates a `sessionId` via `randomUUID`, and registers it with `importSessionManager.create`.
3. Starts a 2s interval (`cancelPoll`) calling `importSessionManager.refreshFromStore(sessionId)` — on serverless, pulls a cancel that landed on another instance into this instance's in-memory flag (no-op locally).
4. Registers `req.on('close')` to set `clientGone = true` and request cancellation — a client disconnect cancels the job.
5. Defines `send(event, data)` which writes `event: <event>\ndata: <json>\n\n`, guarding against `clientGone`/`res.writableEnded`.
6. Sends a `session` event with the `sessionId`.
7. Invokes `handler({ emit, isCancelled, userId })` where `emit` sends `progress` events, `isCancelled` reflects `importSessionManager.isCancelled(sessionId)`. On success sends `complete` with the result (or `{}`).
8. On throw, logs and sends an `error` event with the message.
9. `finally`: clears the poll interval, deletes the session, and ends the response if not already ended.

## Data structures / Types / Constants
- `StreamEvent`: `{ type: 'info'|'success'|'warn'|'error', step, message, itemIndex?, totalItems?, label? }` — `itemIndex`/`totalItems` drive the progress bar; `label` is an optional short tag.
- `StreamJobContext`: `{ emit(e), isCancelled(), userId }` passed to the handler.

## Important algorithms
SSE event framing; cooperative cancellation via a shared session store polled every 2s (cross-instance on serverless) plus a local disconnect hook; guarded writes to avoid writing to a closed stream.

## Relationships
Depends on `ImportSessionManager` service for session lifecycle and cross-instance cancel propagation. Relies on auth middleware having populated `req.user`. Used by bulk/cascade route handlers (imports, cascades) that need streaming progress.

## Edge cases & known limitations
- Requires `req.user` to be set (non-null assertion `req.user!.id`); unauthenticated use would throw.
- Cancellation is cooperative — the handler must check `isCancelled()` to actually stop.
- Cross-instance cancel relies on the 2s poll, so there can be up to ~2s latency on serverless.
- Writes are suppressed once the client disconnects or the response ends.
