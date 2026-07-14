# `server/src/controllers/ConfigController.ts`
**Purpose:** Admin app-configuration: read effective config, test R2 storage connection, and persist merged config (sounds, navigation, changelogGen, staleAlert, branding, storage, server) plus optional .env server settings.
**Language / Size:** TypeScript / 15343 bytes
## Exports
Named exports: `getConfig`, `testStorageConnection`, `updateConfig`. Module-private helper `readEnvFile`.
## Imports (Internal / External)
- Internal: `../utils/sanitize` (`hasControlChars`), `../utils/appConfig` (`readAppConfig`, `saveAppConfig`, `isServerless`, `DEFAULT_APP_CONFIG`), `../utils/crypto` (`sealSecret`, `isSealedSecret`), `../utils/r2Storage` (`sealR2Secret`, `isSealedR2Secret`, `getStorageConfig`, `testR2Connection`).
- External: `express`, `fs`, `path`.
- Module constant: `envPath = path.resolve(__dirname,'../../../.env')`.
## Handlers / Functions
- **getConfig(req,res,next)** — GET. Reads stored config (`readAppConfig`), falls back to `DEFAULT_APP_CONFIG` when empty (no 404 on fresh deploy). For `storage`: returns effective non-secret values via `getStorageConfig()`; the R2 `secretAccessKey` is write-only (returned as `''` plus boolean `secretAccessKeySet`). For `changelogGen`: `ollamaCloudKey` returned as `''` plus `ollamaCloudKeySet`. `200` with data.
- **testStorageConnection(req,res,next)** — POST /storage/test. Reads `req.body` R2 fields; blanks fall back to current stored/env values (`getStorageConfig().r2`). Sanitizes via `clean` (rejects control chars, trims), strips trailing slashes on `publicBaseUrl`. Calls `testR2Connection(candidate)` (write/read/delete round-trip). `200` with result.
- **readEnvFile()** (private) — Parses `.env` into a key→value map, skipping comments/blank lines; preserves unmanaged keys.
- **updateConfig(req,res,next)** — POST. Reads `req.body`: `server`, `sounds`, `navigation`, `changelogGen`, `staleAlert`, `branding`, `storage`. No Zod (extensive manual validation). Loads existing config, migrates legacy `codeTracker`→`changelogGen`, deletes `codeTracker`. Validates: server port (1–65535) and mongodbUri (`mongodb://`/`mongodb+srv://`, no control chars) → `400` on failure; storage provider enum + required R2 fields (config or `R2_*` env) when provider is `r2`; R2 publicBaseUrl must be http(s); branding fields sanitized/length-capped, logoUrl must match `https?://|/|data:image/`, accentColor must be a hex color; navigation.mode enum; staleAlert.days clamped 1–365. Write-only secrets (`storage.r2.secretAccessKey`, `changelogGen.ollamaCloudKey`) are sealed via `sealR2Secret`/`sealSecret`; blank keeps existing (and seals legacy plaintext). Persists via `saveAppConfig(mergedConfig)`. If server settings changed and not serverless, rewrites `.env` (PORT/MONGODB_URI) via temp-file rename, responds with restart message, and in production `process.exit(0)` after 1s. `200 {message, config}`.
## Important logic & design patterns
- Write-only secret handling (never returned to browser; sealed at rest; legacy plaintext migrated on save).
- Effective-value merging: stored config layered over `R2_*`/`OLLAMA_*` env fallbacks.
- Serverless-aware: skips `.env` writes and process restart on serverless.
- Atomic `.env` write via `.tmp` + `renameSync`.
- Extensive inline sanitization (`hasControlChars`, length caps, regex allow-lists).
## Relationships
- Routed by `configRoutes.ts` (mounted `/api/config`, behind `requireAuth`+`requireActive`+`requireAdmin`).
- Depends on appConfig/crypto/r2Storage/sanitize utilities.
