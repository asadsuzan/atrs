# `server/src/routes/jobRoutes.ts`
**Purpose:** Express router providing a generic cancellation endpoint for any in-flight streaming job (bulk delete, media purge, user cascade, etc.); mounted at `/api/jobs` (app.ts: `app.use('/api/jobs', requireAuth, requireActive, jobRoutes)`).
**Language / Size:** TypeScript / 991 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts` (noted in a file comment).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/cancel` | — | — (inline body guard) | inline handler → `importSessionManager.requestCancel` |
## Relationships
- Service: `../services/ImportSessionManager` (`importSessionManager`).
- No separate controller — the handler is defined inline in the route file.
## Notes
- Handler validates `req.body.sessionId` inline (`400` if missing/not a string), calls `importSessionManager.requestCancel(sessionId, req.user!.id)`, returns `404` if the session isn't found, else `200 {message:'Cancellation requested'}`.
- Cancellation flags the session so its loop halts at the next item boundary; already-processed deletes are **not** rolled back (per file comment).
