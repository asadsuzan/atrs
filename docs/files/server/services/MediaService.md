# `server/src/services/MediaService.ts`
**Purpose:** Media library service — enumerates uploaded files (local uploads dir + Cloudflare R2), computes which DB entities reference each file, and safely deletes single files or purges orphans, with owner scoping and path-traversal protection.
**Language / Size:** TypeScript / 13009 bytes

## Exports
- `interface IMediaReference` — `{ entityType: 'product'|'marketing'|'activity'; entityId; entityName; field; productId?; productName? }`.
- `interface IMediaFile` — `{ filename; url; size; mimeType; createdAt: Date; references: IMediaReference[]; isOrphaned: boolean; storage: 'local'|'r2' }`.
- `class MediaService`.
- (`interface IMediaEntities` is module-private, not exported.)

## Imports (Internal / External)
Internal:
- `../models/Product`, `../models/ProductMarketing`, `../models/Activity`
- `../utils/httpError` (createHttpError, default import)
- `../types/auth` (AuthUser type)
- `../utils/r2Storage` (isR2Active, listR2Objects, deleteFromR2, r2ObjectExists, r2PublicUrl)

External: `fs`, `path` (Node); Mongoose model statics (find + projection + populate + lean, countDocuments).

## Functions / Methods
- **constructor()** — sets `uploadsDir = path.join(__dirname, '../../../uploads')`; creates it (`mkdirSync recursive`) if missing. Wrapped in try/catch so read-only serverless filesystems (Vercel) don't throw — local media features are simply inert there.
- **getMimeType(filename): string** (private) — extension → MIME map (png, jpg/jpeg, gif, svg, webp, mp4, webm, ogg); default `application/octet-stream`.
- **safeResolve(filename): string** (private) — `path.resolve(uploadsDir, filename)`; throws 400 'Invalid filename' if resolved path escapes the uploads root (path-traversal guard).
- **loadMediaEntities(user?): Promise<IMediaEntities>** (private) — owner scope: admins or no-user see all (`{}`); others `{ ownerId: user.id }`. Parallel `Product.find`, `ProductMarketing.find` (populate productId name/slug), `Activity.find` (populate productId name/slug), all with narrow projections + lean.
- **collectReferences(fileUrl, entities): IMediaReference[]** (private) — scans every media-bearing field for an exact string match to `fileUrl` (see Important algorithms).
- **getAllMedia(user?): Promise<IMediaFile[]>** — lists local uploads (skips dotfiles/non-files) then R2 objects (when `isR2Active()`), building IMediaFile with references + `isOrphaned = references.length === 0`. Non-admins skip files with zero references (can't see others'/orphans). R2 listing failure is caught/logged and degrades to local-only. Sorted by `createdAt` descending.
- **assertUnreferenced(fileUrl, filename): Promise<void>** (private) — parallel `countDocuments` across Product (banner/icon), ProductMarketing (thumbnailImage/trailerVideo/tutorialVideo/keyFeatures.mediaUrl/screenshots.url), Activity (mediaUrl/mediaUrls/items.mediaUrl/items.mediaUrls); throws `Error('Cannot delete referenced file: <name>. It is in use.')` if any count > 0.
- **deleteMedia(filename, force=false): Promise<{success, filename}>** — local file first (`safeResolve`): if exists and not `force`, `assertUnreferenced('/uploads/<file>')`, then `fs.unlinkSync`. Else if `isR2Active()` and `r2ObjectExists(filename)`: same guard on `r2PublicUrl`, then `deleteFromR2`. Else throws `Error('File <name> not found')`.
- **purgeOrphaned(): Promise<string[]>** — `getAllMedia()` (admin/global scope, no user), filters `isOrphaned`, deletes each (R2 via deleteFromR2, else `safeResolve` + unlink); per-file errors caught/logged; returns deleted filenames.

## Data structures / Types / Constants
- `uploadsDir` (instance) — resolved uploads directory path.
- `IMediaReference`, `IMediaFile` (exported); `IMediaEntities` (private).

## Important algorithms

### Reference collection — `collectReferences`
Exact-match `fileUrl` against every stored media URL, emitting a reference with a human-readable `field` path:
- Products: `banner`, `icon`.
- Marketing: `thumbnailImage`, `trailerVideo`, `tutorialVideo`, `keyFeatures[i].mediaUrl`, `screenshots[i].url`. Product name resolved from populated `productId.name`, falling back to `pluginName`, then 'Unknown Product'.
- Activities: `mediaUrl`, `mediaUrls[i]`, `items[i].mediaUrl`, `items[i].mediaUrls[j]`. entityName formatted `title (product)` or `title -> item.title (product)`.
A file with zero collected references is orphaned.

### Listing + owner visibility — `getAllMedia`
Local dir scan + optional R2 listing, each object cross-referenced via `collectReferences`. Non-admins never see files that none of their own content references (`!isAdmin && references.length === 0` → skip), so orphans and other users' files stay hidden from them; admins see everything including orphans.

### Safe deletion
`deleteMedia` refuses referenced files unless `force`, using DB `countDocuments` (`assertUnreferenced`) rather than the in-memory reference scan; `force` bypasses the check. `safeResolve` prevents path traversal for all local file operations.

## Relationships
- Models: Product, ProductMarketing, Activity (both for reference discovery and unreferenced-count checks).
- Utils: r2Storage (Cloudflare R2 backend), httpError.
- Consumer: media controller/routes (library listing, delete, purge orphans).

## Edge cases & known limitations
- Reference matching is exact string equality on the stored URL; a URL stored in a different form (encoding, host variant) would read as orphaned.
- Constructor tolerates read-only FS; on such deployments local media is inert and only R2 is meaningful.
- `getAllMedia` throws only if the local scan throws; R2 listing failures degrade to local-only.
- `deleteMedia` prefers a local file over an R2 object of the same name (local checked first).
- `assertUnreferenced` and `purgeOrphaned` throw plain `Error` (not http errors); `safeResolve` throws a 400 http error.
- `purgeOrphaned` runs unscoped (global admin view), so it can delete any user's orphaned files.
