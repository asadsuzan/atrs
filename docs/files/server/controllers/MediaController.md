# `server/src/controllers/MediaController.ts`
**Purpose:** Media library management: list media, delete (single/bulk, force-aware), purge orphaned files (JSON and SSE-streamed).
**Language / Size:** TypeScript / 3598 bytes
## Exports
Named exports: `getMediaList`, `deleteMedia`, `bulkDeleteMedia`, `purgeOrphaned`, `purgeOrphanedStream`.
## Imports (Internal / External)
- Internal: `../services/MediaService` (`MediaService`), `../utils/sseStream` (`runStreamJob`).
- External: `express`.
- Module-level singleton: `const mediaService = new MediaService()`.
## Handlers / Functions
- **getMediaList(req,res,next)** — Reads `req.user`. Calls `mediaService.getAllMedia(req.user)`. `200` list.
- **deleteMedia(req,res,next)** — Reads `req.params.filename`, `req.query.force` (`==='true'`). Calls `mediaService.deleteMedia(filename, force)`. On error containing `'Cannot delete referenced file'` → `400 {message}`; else `next`. `200` with result.
- **bulkDeleteMedia(req,res,next)** — Reads `req.body.filenames`, `req.body.force` (default false). Guard: non-empty array else `400`. Loops filenames, calls `mediaService.deleteMedia` per file, accumulates `{deleted[], failed[{filename,error}]}`. `200 {success:true, deleted, failed}`.
- **purgeOrphaned(req,res,next)** — Calls `mediaService.purgeOrphaned()`. `200 {success:true, count, deletedFiles}`.
- **purgeOrphanedStream(req,res)** — SSE. `runStreamJob`: `getAllMedia()` → filter `isOrphaned`, emit scan progress, loop deleting each with `deleteMedia(filename, true)`, `isCancelled()` checks, per-item `success/error` events; returns `{deleted, errors, cancelled, total}`.
## Important logic & design patterns
- Force flag distinguishes deleting referenced files; referenced-file deletion blocked with `400` unless forced.
- Bulk delete collects partial failures rather than aborting.
- Streaming purge with cancellation via `runStreamJob`.
## Relationships
- Routed by `mediaRoutes.ts` (mounted `/api/media`, behind `requireAuth`+`requireActive`; destructive ops additionally `requireAdmin`).
- Delegates to `MediaService`.
