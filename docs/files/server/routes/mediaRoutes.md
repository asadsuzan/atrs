# `server/src/routes/mediaRoutes.ts`
**Purpose:** Express router for media library listing and (admin-only) destructive media operations including orphan purge; mounted at `/api/media` (app.ts: `app.use('/api/media', requireAuth, requireActive, mediaRoutes)`).
**Language / Size:** TypeScript / 639 bytes
## Middleware applied (router-level)
- None global. `requireAdmin` (`../middlewares/auth`) is applied per-route to the destructive endpoints. `requireAuth` + `requireActive` come from the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | — | — | `MediaController.getMediaList` |
| DELETE | `/:filename` | requireAdmin | — | `MediaController.deleteMedia` |
| POST | `/bulk-delete` | requireAdmin | — | `MediaController.bulkDeleteMedia` |
| POST | `/purge-orphaned` | requireAdmin | — | `MediaController.purgeOrphaned` |
| POST | `/purge-orphaned-stream` | requireAdmin | — | `MediaController.purgeOrphanedStream` |
## Relationships
- Controller: `../controllers/MediaController`.
- Middleware: `../middlewares/auth` (`requireAdmin`).
## Notes
- Listing (`GET /`) is available to any authenticated+active user; all delete/purge operations are admin-only (orphan detection is global across owners, per comment).
- `/purge-orphaned-stream` is an SSE (streaming) endpoint.
- `:filename` is a path param identifying the media object (not a Mongo id).
