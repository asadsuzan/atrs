# `client/src/services/changelogGen.ts`
**Purpose:** AI changelog-generation pipeline. Streams generation progress over Server-Sent Events (via `fetch` + a `ReadableStream` reader so it can POST a body and send the JWT), plus small axios helpers for available git tags and AI models.
**Language / Size:** TS / 3574 bytes

## Exports
Types: `RangeType` (`'tags' | 'commit' | 'date' | 'working'`), `GenerateInput`, `GenerationStats`, `GenerationResult`, `ProgressEvent`, `GenerateHandlers`.
Functions: `generateChangelog`, `getProductTags`, `getProductModels`.

### Key types
- `GenerateInput`: `{ productId, rangeType, from?, to?, model?, createReviewEntries? }`.
- `GenerationResult`: `{ stats: GenerationStats, outputs: { developerChangelog, userReleaseNotes, githubReleaseNotes, qaChecklist } }`.
- `ProgressEvent`: `{ type: 'info'|'success'|'warn'|'error', step, message, itemIndex?, totalItems?, label? }`.
- `GenerateHandlers`: `{ onSession?, onProgress?, onComplete?, onError? }`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api, getToken }` from `./api`. The streaming function uses raw `fetch` (not `api`) and reads `getToken()` to build the Authorization header manually.

## Functions
- **`generateChangelog(input: GenerateInput, handlers: GenerateHandlers, signal?: AbortSignal): Promise<void>`** — `POST /api/changelog-gen/generate` via `fetch`. Headers: `Content-Type: application/json` plus `Authorization: Bearer <token>` when a token exists. Body = `JSON.stringify(input)`. `signal` allows abort. Reads the response as an SSE stream: splits on blank lines (`\n\n`), parses `event:`/`data:` lines, JSON-parses the data, and dispatches by event name — `session`→`onSession(sessionId)`, `progress`→`onProgress`, `complete`→`onComplete(result)`, `error`→`onError`.
- **`getProductTags(productId: string): Promise<string[]>`** — `GET /api/changelog-gen/tags/{productId}` (axios); returns `data`.
- **`getProductModels(): Promise<string[]>`** — `GET /api/changelog-gen/models` (axios); returns `data`.

## Error handling
`generateChangelog`: if `!res.ok || !res.body`, builds `Request failed (<status>)`, tries to parse a JSON error body for a `message`, and calls `handlers.onError(message)` then returns (does not throw). Malformed SSE JSON blocks are skipped. The axios helpers have no explicit try/catch.

## Relationships
- Consumed by the ChangelogGenerator page (route `/changelog-generator`) and its context (`ChangelogGenProvider` / `ChangelogGenMiniPlayer`).
- Backend target: `/api/changelog-gen/*`.
