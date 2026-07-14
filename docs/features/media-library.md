# Media Library

**Summary:** End-to-end media handling for ATRS — a hardened single-file upload endpoint (MIME + extension allow-list, SVG excluded, 25 MB cap, magic-byte sniffing, R2 or local backend) feeding a library page where files are listed with usage references and (for admins) deleted, bulk-deleted, or purged of orphans via a streamed job.

## User-facing entry points
- **Media Library page** at `/media` (`MediaManager`): browse/search all uploads, inspect per-file usage references, single/bulk delete, and "Purge Unused" orphan purge.
- **Upload/pick surfaces embedded in forms** (product/activity/changelog/marketing editors):
  - `MediaUploader` — drag-and-drop / click / clipboard-paste upload zone with previews and a "Browse Library" path.
  - `MediaLibraryDialog` — modal picker to select existing library assets (single or multiple).
  - `MediaCarousel` + `MediaLightbox` — read-only gallery/zoom display of image/video URLs.

## Client pieces
- **Page:** `client/src/pages/MediaManager.tsx` — filters (search, type image/video/gif, usage in-use/orphaned, product, sort), stat cards, animated media grid, selection mode, and 4 dialogs (Details, Delete confirm, Bulk purge confirm, Bulk delete confirm).
- **Components:** `MediaUploader` (`client/src/components/ui/MediaUploader.tsx`), `MediaLibraryDialog` (`client/src/components/media/MediaLibraryDialog.tsx`), `MediaCarousel` (`client/src/components/ui/media-carousel.tsx`), `MediaLightbox` (`client/src/components/ui/media-lightbox.tsx`).
- **Services:**
  - `client/src/services/media.ts` — `getMediaList()` (GET), `deleteMedia(filename, force)` (DELETE, `?force`), `bulkDeleteMedia(filenames, force)` (POST), `purgeOrphanedMedia()` (POST). Types `IMediaFile`, `IMediaReference`.
  - `client/src/services/api.ts` — `uploadFile(file)`: builds `FormData` field `file`, `POST /api/upload`, returns `response.data.url`.
- **React Query keys:** `['mediaList']` (list; invalidated after delete/bulk-delete/purge), `['products', { limit: 100 }]` (product filter dropdown — deliberately distinct from the default 1000-item `['products']` cache to avoid collision). `MediaLibraryDialog` gates both queries on `open`.
- **Contexts:** `JobStreamContext` (`useJobStream().runJob`) drives the streamed orphan purge at `/media/purge-orphaned-stream`.
- **Mutations:** `deleteMutation`, `bulkDeleteMutation` (both invalidate `['mediaList']`); single delete uses `force: !isOrphaned`, bulk delete uses `force: selectedInUseCount > 0`.

## Server pieces
- **Upload — `POST /api/upload`** (`server/src/routes/uploadRoutes.ts`, mount guard `requireAuth` + `requireActive`): no controller; logic inline. A `multer single('file')` middleware is built per request so the storage backend can switch without restart.
  - Backend selection: `isR2Active()` → memory storage + `uploadToR2`; else disk storage. Serverless with R2 inactive → `400` (read-only FS).
  - Allow-list: MIME ∈ {png, jpeg, gif, webp, mp4, webm, ogg} AND ext ∈ {.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.ogg}; **SVG excluded (XSS)**. Max 25 MB.
  - Defense-in-depth: after the allow-list, `sniffMedia` (`server/src/utils/fileSignature.ts`) verifies magic bytes — R2 path checks the buffer before upload; disk path reads back the first 16 bytes and unlinks on mismatch. Multer/size errors → `400`; R2 upload failure → `502`.
- **Library — `/api/media`** (`server/src/routes/mediaRoutes.ts`, mount guard `requireAuth` + `requireActive`; destructive ops add `requireAdmin`) → `server/src/controllers/MediaController.ts` → `server/src/services/MediaService.ts`:
  - `GET /` → `getMediaList` (any authed+active user).
  - `DELETE /:filename` → `deleteMedia` (admin; `?force=true` to delete referenced files; `400` if referenced and not forced). `:filename` is a media object name, not a Mongo id.
  - `POST /bulk-delete` → `bulkDeleteMedia` (admin; collects partial failures `{ deleted[], failed[{filename,error}] }`; `400` if empty).
  - `POST /purge-orphaned` → `purgeOrphaned` (admin; JSON `{ success, count, deletedFiles }`).
  - `POST /purge-orphaned-stream` → `purgeOrphanedStream` (admin; SSE via `runStreamJob`, cancellable).
- **Storage backends:** `server/src/utils/r2Storage.ts` (S3-compatible Cloudflare R2: upload/delete/exists/list/URL, config+env resolution, connection probe) and the local `uploads/` directory (`express.static('/uploads')`, local provider only).
- **Deletion helper:** `server/src/utils/fileUtils.ts` (`deleteMediaFile`/`deleteMediaFiles`) dispatches R2 vs local, with a path-traversal containment guard; used by cascade deletes across products/versions/activities/marketing.

## Data model
- Media files are not their own Mongo collection — they live on disk (`uploads/`) or in R2, keyed by flat filename. The library is derived at request time.
- **Reference discovery** (`MediaService.collectReferences` / `assertUnreferenced`) scans media-bearing fields across three collections by exact URL match:
  - `Product`: `banner`, `icon`.
  - `ProductMarketing`: `thumbnailImage`, `trailerVideo`, `tutorialVideo`, `keyFeatures[].mediaUrl`, `screenshots[].url`.
  - `Activity`: `mediaUrl`, `mediaUrls[]`, `items[].mediaUrl`, `items[].mediaUrls[]`.
- `IMediaFile` shape returned to the client: `{ filename, url, size, mimeType, createdAt, references[], isOrphaned, storage: 'local'|'r2' }`. `isOrphaned = references.length === 0`.

## Notable behaviors & edge cases
- **Owner visibility:** non-admins never see files that none of their own content references (orphans and other owners' files are hidden). Admins see everything, including orphans. Listing sorts by `createdAt` descending.
- **Orphan purge is global/admin-scoped:** `purgeOrphaned` runs unscoped (`getAllMedia()` with no user), so it can delete any owner's orphaned files. The streamed variant emits scan progress + per-item success/error and honors cancellation between items; processed deletions are not rolled back.
- **Force semantics:** referenced files are refused with a `400` ("Cannot delete referenced file") unless `force=true`, which bypasses the DB `countDocuments` guard. Bulk delete collects partial failures instead of aborting on the first error.
- **Reference matching is exact string equality** on the stored URL — a URL stored in a different encoding/host form would read as orphaned (false positive risk for purge).
- **Path-traversal defense:** `MediaService.safeResolve` and `fileUtils` both refuse resolved paths escaping the uploads root (`400 Invalid filename` / silent skip).
- **R2 vs local precedence:** `deleteMedia` checks the local file first, then R2; R2 deletion in `fileUtils` is fire-and-forget (logged, not surfaced) to keep a synchronous signature.
- **Read-only serverless FS:** `MediaService` constructor tolerates a failed `mkdirSync`; on such deployments local media is inert and only R2 is meaningful. Static `/uploads` is served only for the local provider.
- **Magic-byte sniffer** needs ≥12 bytes; ambiguous formats fall through to `null` (never returns `'unknown'`), relying on the allow-list + `nosniff` + random re-name as layered defense.
- **Client display quirks:** `MediaUploader`/`MediaCarousel` detect video purely by file extension (`.mp4/.webm/.ogg`); extension-less video URLs render as `<img>`. The clipboard-paste listener is global but self-scoped by hover/focus so multiple uploaders on a page don't cross-fire.

## Related docs
- [MediaManager page](../files/client/pages/MediaManager.md)
- [MediaLibraryDialog](../files/client/components/media/MediaLibraryDialog.md)
- [MediaUploader](../files/client/components/ui/MediaUploader.md)
- [media-carousel](../files/client/components/ui/media-carousel.md)
- [media-lightbox](../files/client/components/ui/media-lightbox.md)
- [client service: media](../files/client/services/media.md)
- [client service: api (uploadFile)](../files/client/services/api.md)
- [uploadRoutes](../files/server/routes/uploadRoutes.md)
- [mediaRoutes](../files/server/routes/mediaRoutes.md)
- [MediaController](../files/server/controllers/MediaController.md)
- [MediaService](../files/server/services/MediaService.md)
- [r2Storage util](../files/server/utils/r2Storage.md)
- [fileUtils](../files/server/utils/fileUtils.md)
- [fileSignature](../files/server/utils/fileSignature.md)
- [Server API reference §10 Media/Upload](../api/server-api-endpoints.md)
- [Client → Endpoint map](../api/client-endpoint-map.md)
