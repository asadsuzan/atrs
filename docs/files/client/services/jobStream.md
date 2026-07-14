# `client/src/services/jobStream.ts`
**Purpose:** Generic SSE job runner shared by every bulk/cascade action. Uses `fetch` + a stream reader (so it can POST a body and send the JWT), and provides a cancel helper.
**Language / Size:** TS / 3100 bytes

## Exports
Types: `JobProgress` (`{ type, step, message, itemIndex?, totalItems?, label? }`), `JobSummary` (`{ errors?, cancelled?, total?, [key]: any }`), `JobHandlers` (`{ onSession?, onProgress?, onComplete?, onError? }`).
Functions: `streamJob`, `cancelJob`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api, getToken }` from `./api`. `streamJob` uses raw `fetch` + `getToken()`; `cancelJob` uses the axios `api`.

## Functions
- **`streamJob(method: 'POST' | 'DELETE', url: string, body: any, handlers: JobHandlers, signal?: AbortSignal): Promise<void>`** — `fetch(\`/api${url}\`, { method, ... })`. `url` is relative to `/api`. Headers: `Content-Type: application/json` plus `Authorization: Bearer <token>` when present. Body = `JSON.stringify(body)` when `body !== undefined`, else undefined. `signal` allows hard cancel (disconnect). Parses the SSE stream (blank-line separated blocks; `event:`/`data:` lines) and dispatches: `session`→`onSession(sessionId)`, `progress`→`onProgress`, `complete`→`onComplete(summary)`, `error`→`onError`.
- **`cancelJob(sessionId: string): Promise<void>`** — `POST /api/jobs/cancel` (axios); body `{ sessionId }`; requests cancellation of an in-flight job.

## Error handling
`streamJob`: if `!res.ok || !res.body`, builds `Request failed (<status>)`, tries to read a JSON error `message`, calls `handlers.onError(message)` and returns (no throw). Malformed SSE JSON blocks skipped.

## Relationships
- Consumed by `JobStreamContext` / `JobStreamProvider` and the job UI (`JobStreamDialog`, `JobStreamMiniPlayer`) for bulk/cascade operations. `url` is supplied per-action by callers.
- Backend targets: any streaming job route under `/api` (POST/DELETE); cancel targets `/api/jobs/cancel`.
