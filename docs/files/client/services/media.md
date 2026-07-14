# `client/src/services/media.ts`
**Purpose:** Media library management — list uploaded files (with reference/orphan info), delete single/bulk, and purge orphaned files.
**Language / Size:** TS / 1340 bytes

## Exports
Types: `IMediaReference` (`{ entityType: 'product'|'marketing'|'activity', entityId, entityName, field, productId?, productName? }`), `IMediaFile` (`{ filename, url, size, mimeType, createdAt, references, isOrphaned, storage?: 'local'|'r2' }`).
Functions: `getMediaList`, `deleteMedia`, `bulkDeleteMedia`, `purgeOrphanedMedia`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getMediaList(): Promise<IMediaFile[]>`** — `GET /api/media`.
- **`deleteMedia(filename: string, force = false): Promise<{ success; filename }>`** — `DELETE /api/media/{encodeURIComponent(filename)}`; query `{ force }`.
- **`bulkDeleteMedia(filenames: string[], force = false): Promise<{ success; deleted: string[]; failed: {filename;error}[] }>`** — `POST /api/media/bulk-delete`; body `{ filenames, force }`.
- **`purgeOrphanedMedia(): Promise<{ success; count; deletedFiles: string[] }>`** — `POST /api/media/purge-orphaned`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the MediaManager page (route `/media`).
- Backend target: `/api/media/*`.
