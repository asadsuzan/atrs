# `server/src/utils/fileUtils.ts`
**Purpose:** Safe deletion of media files referenced by a URL, dispatching to either Cloudflare R2 (remote) or the local `uploads/` directory, with a containment guard against path traversal.
**Language / Size:** TypeScript / 1350 bytes

## Exports
- `const deleteMediaFile = (url?: string | null | undefined) => void`
- `const deleteMediaFiles = (urls?: (string | null | undefined)[]) => void`

## Imports (Internal / External)
- Internal: `r2KeyFromUrl`, `deleteFromR2` from `./r2Storage`.
- External: `fs`, `path` (node builtins).

## Functions / Methods
### `deleteMediaFile(url)`
Deletes a single media file:
1. Returns immediately if `url` is falsy.
2. R2 path: calls `r2KeyFromUrl(url)`; if it returns a key, calls `deleteFromR2(key)` **fire-and-forget** (Promise `.catch` logs errors) to preserve the synchronous signature, then returns.
3. Local path: returns unless `url` starts with `/uploads/`. Strips the `/uploads/` prefix to get the filename, resolves it against `uploadsRoot`.
4. **Containment check:** refuses (logs and returns) if the resolved path is not the uploads dir itself and does not start with `uploadsRoot + path.sep` — preventing deletion outside the uploads directory (path traversal defense).
5. If the file exists (`fs.existsSync`), deletes it with `fs.unlinkSync`. Any error is caught and logged.

### `deleteMediaFiles(urls)`
Returns early unless `urls` is a real array; otherwise calls `deleteMediaFile` for each element.

## Data structures / Types / Constants
- `uploadsRoot` (private): `path.resolve(__dirname, '../../../uploads')` — absolute path to the server uploads directory.

## Important algorithms
Path-traversal containment: after resolving the user-influenced filename against `uploadsRoot`, it verifies the result is contained within the root before unlinking. R2 vs local dispatch is decided by whether the URL maps to an R2 key.

## Relationships
Depends on `r2Storage.ts` for R2 key extraction/deletion. Called by routes/services that remove products, versions, activities, or issues with attached media.

## Edge cases & known limitations
- R2 deletion is fire-and-forget: failures are logged but not surfaced to the caller (kept synchronous).
- Only URLs beginning with `/uploads/` are handled locally; foreign/absolute non-R2 URLs are silently ignored.
- Uses synchronous fs calls (`existsSync`, `unlinkSync`), which block the event loop briefly.
