# `server/src/utils/r2Storage.ts`
**Purpose:** Cloudflare R2 (S3-compatible) storage integration — resolves R2 settings (config + env fallback, encrypted secret), builds/caches an S3 client, and provides upload/delete/exists/list/URL/connection-test helpers.
**Language / Size:** TypeScript / 8243 bytes

## Exports
- `const sealR2Secret = sealSecret`, `const isSealedR2Secret = isSealedSecret` (aliases)
- `interface R2Settings`, `interface StorageConfig`, `interface R2Object`, `interface R2TestResult`
- `function getStorageConfig(): StorageConfig`
- `function isR2Configured(r2): boolean`
- `function isR2Active(): boolean`
- `function r2PublicUrl(key, r2?): string`
- `function r2KeyFromUrl(url?, r2?): string | null`
- `async function uploadToR2(buffer, key, contentType): Promise<string>`
- `async function deleteFromR2(key): Promise<void>`
- `async function r2ObjectExists(key): Promise<boolean>`
- `async function testR2Connection(r2): Promise<R2TestResult>`
- `async function listR2Objects(): Promise<R2Object[]>`

## Imports (Internal / External)
- Internal: `readAppConfig` from `./appConfig`; `sealSecret`, `isSealedSecret`, `unsealSecret` from `./crypto`.
- External: `@aws-sdk/client-s3` (`S3Client`, `PutObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`, `ListObjectsV2Command`).

## Functions / Methods
### `getStorageConfig()`
Reads `readAppConfig()?.storage` and its `r2` block. Determines `provider`: explicit `'r2'`/`'local'` wins; otherwise if all five `R2_*` env vars are set (`envR2Complete`) defaults to `'r2'`, else `'local'`. Fills each R2 field from config OR the matching `R2_*` env var (trimmed; `publicBaseUrl` also strips trailing slashes). `secretAccessKey` is passed through `unsealR2Secret` (decrypts a sealed stored secret; env value passes through unchanged).

### `isR2Configured(r2)`
True when all five fields (`accountId`, `bucket`, `publicBaseUrl`, `accessKeyId`, `secretAccessKey`) are non-empty.

### `isR2Active()`
True when provider is `'r2'` AND `isR2Configured` passes.

### `getClient(r2)` (private)
Lazily builds and caches a single `S3Client` (`region: 'auto'`, endpoint `https://<accountId>.r2.cloudflarestorage.com`). Cache key is `accountId|accessKeyId|secretAccessKey`; the client is rebuilt when credentials change (settings edited at runtime).

### `r2PublicUrl(key, r2?)`
Returns `<publicBaseUrl>/<key>`.

### `r2KeyFromUrl(url?, r2?)`
Returns the object key if `url` starts with `<publicBaseUrl>/`, else null. Rejects empty keys and any key containing `/` or `..` (generated keys are flat filenames). Returns null when no `publicBaseUrl` is configured.

### `uploadToR2(buffer, key, contentType)`
`PutObjectCommand` with `CacheControl: 'public, max-age=31536000, immutable'`. Returns the public URL.

### `deleteFromR2(key)`
`DeleteObjectCommand`.

### `r2ObjectExists(key)`
`HeadObjectCommand`; returns true on success, false when the error is a 404/`NotFound`, and rethrows otherwise.

### `testR2Connection(r2)`
Validates unsaved candidate settings with a fresh (non-cached) client via a put → head → delete round-trip on a probe key `.atrs-connection-probe-<timestamp>`. Returns `{ ok, message }`, mapping errors: `NoSuchBucket`/404 → bucket not found; 401/403/`InvalidAccessKeyId`/`SignatureDoesNotMatch` → auth failed; `ENOTFOUND` → can't reach R2 (check Account ID); else generic. Always `client.destroy()` in `finally`.

### `listR2Objects()`
Paginates `ListObjectsV2Command` via `ContinuationToken`/`IsTruncated`, accumulating `{ key, size, lastModified }` (skips entries without `Key`).

## Data structures / Types / Constants
- `R2Settings`: `{ accountId, bucket, publicBaseUrl, accessKeyId, secretAccessKey }`.
- `StorageConfig`: `{ provider: 'local' | 'r2', r2: R2Settings }`.
- `R2Object`: `{ key, size, lastModified }`. `R2TestResult`: `{ ok, message }`.
- Module cache: `cachedClient`, `cachedClientKey`.

## Important algorithms
Config-with-env-fallback resolution; credential-keyed client caching to survive runtime settings changes; end-to-end connection probe; paginated listing.

## Relationships
Depends on `appConfig.ts` and `crypto.ts` (seal/unseal). Used by `fileUtils.ts` (`r2KeyFromUrl`, `deleteFromR2`), upload handlers (`uploadToR2`), the storage settings UI (`testR2Connection`, `isR2Active`), and media/maintenance routes (`listR2Objects`, `r2ObjectExists`).

## Edge cases & known limitations
- The cached client is shared process-wide; changing credentials invalidates it by key comparison only (no TTL).
- `r2KeyFromUrl` only recognizes flat filename keys under the configured public base URL; nested-path keys are rejected.
- `testR2Connection` uses a fresh client each call (never the cache) since the settings are unsaved.
- Requires all five R2 settings before any operation is considered configured/active.
