# `server/src/routes/uploadRoutes.ts`
**Purpose:** Express router for single-file media uploads, switching between local disk and Cloudflare R2 backends per request with MIME/extension allow-listing and magic-byte sniffing; mounted at `/api/upload` (app.ts: `app.use('/api/upload', requireAuth, requireActive, uploadRoutes)`).
**Language / Size:** TypeScript / 4719 bytes
## Middleware applied (router-level)
- None global. `requireAuth` + `requireActive` come from the mount in `app.ts`. The single route builds and invokes a `multer` middleware **inside** the handler (per-request, so the backend can be switched without restart).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/` | multer `single('file')` (disk or memory storage, chosen per request) | — (allow-list + signature checks) | inline handler |
## Relationships
- Utils: `../utils/r2Storage` (`isR2Active`, `uploadToR2`), `../utils/appConfig` (`isServerless`), `../utils/fileSignature` (`sniffMedia`).
- External: `multer`, `path`, `fs`.
- No separate controller — logic lives inline in the route file.
## Notes
- No dedicated controller; the upload flow is entirely in the router.
- Allow-list: MIME ∈ {png, jpeg, gif, webp, mp4, webm, ogg} AND extension ∈ {.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.ogg}. **SVG intentionally excluded** (XSS vector). Max size 25 MB.
- Backend selection per request: `isR2Active()` → memory storage + `uploadToR2`; otherwise disk storage. On serverless with R2 inactive, returns `400` (read-only FS).
- Defense-in-depth: after the allow-list, `sniffMedia` verifies magic bytes. R2 path checks the buffer before upload; disk path reads back the first 16 bytes and deletes the file if the signature doesn't match. Multer errors are surfaced as JSON `400` (size → friendly message); R2 upload failure → `502`.
- The uploads directory is created at module load only when not serverless and missing.
