# `server/src/utils/appConfig.ts`
**Purpose:** Reads/persists the app configuration, transparently switching between a local `app.config.json` file and a MongoDB-backed cache on serverless (read-only FS) platforms.
**Language / Size:** TypeScript / 5133 bytes

## Exports
- `function isServerless(): boolean`
- `const DEFAULT_APP_CONFIG: Record<string, any>`
- `async function loadAppConfigCache(): Promise<void>`
- `function readAppConfig(): any`
- `async function saveAppConfig(config): Promise<void>`
- `const DEFAULT_STALE_DAYS = 7`
- `function getStaleAlertDays(): number`

## Imports (Internal / External)
- Internal: `AppConfig` model from `../models/AppConfig`.
- External: `fs`, `path` (node builtins).

## Functions
### `isServerless(): boolean`
Returns `!!process.env.VERCEL`. True on Vercel (read-only FS) → config lives in MongoDB instead of the file.

### `readConfigFile(): any` (private)
Reads and JSON-parses `configPath` (`<root>/app.config.json`, resolved from `__dirname/../../../`). On any error or missing file, returns `{}`.

### `fetchConfigFromDb(): Promise<Record|null>` (private)
`AppConfig.findOne({ singleton: 'app' }).lean()`; returns `doc.data` or null.

### `loadAppConfigCache(): Promise<void>`
Purpose: Load the serverless in-memory config cache from MongoDB at bootstrap.
Algorithm: No-op unless `isServerless()`. Fetch from DB; if present, set `cache`. Otherwise seed: read the bundled file (`readConfigFile`); if empty use `{...DEFAULT_APP_CONFIG}`. **Drops** `seed.storage.r2.secretAccessKey` (sets to '') because it was sealed with the local machine's key and can't be decrypted on this platform — so the `R2_SECRET_ACCESS_KEY` env var / re-entry takes over. Set `cache = seed` and upsert into MongoDB with `$setOnInsert` (catch/log seed failures). Set `cacheLoadedAt = Date.now()`.
Side effects: mutates module cache, writes to MongoDB, logs errors.

### `readAppConfig(): any`
Local: returns `readConfigFile()` directly. Serverless: stale-while-revalidate — if `cache` exists and older than `CACHE_TTL_MS` (30s) and no refresh in flight, kicks off a background `loadAppConfigCache()` (errors swallowed) and returns `cache ?? readConfigFile()`. Synchronous by design (called deep inside request handlers).

### `saveAppConfig(config): Promise<void>`
Serverless: `AppConfig.updateOne({singleton:'app'}, {$set:{data:config}}, {upsert:true})`, updates cache and `cacheLoadedAt`. Local: **atomic write** — write to `${configPath}.tmp` then `fs.renameSync` over the real file.

### `getStaleAlertDays(): number`
Reads `readAppConfig()?.staleAlert?.days`, coerces to Number. If not finite or < 1, returns `DEFAULT_STALE_DAYS` (7). Otherwise `Math.min(Math.floor(d), 365)` — clamped to [1,365].

## Types / Constants
- `configPath` (private): resolved absolute path to `app.config.json`.
- `DEFAULT_APP_CONFIG`: full default config — `server` (port 5000, `mongodb://localhost:27017/atrs`), `sounds`, `navigation`, `changelogGen` (model `qwen2.5-coder`, `ollamaMode:'local'`), `staleAlert.days:7`, `branding`, `storage` (provider `local`, empty r2 block). Secrets stay empty.
- Cache state: `CACHE_TTL_MS = 30_000`, `cache`, `cacheLoadedAt`, `refreshInFlight`.
- `DEFAULT_STALE_DAYS = 7`.

## Important logic & design patterns
Dual-backend config store (file vs MongoDB) selected by `VERCEL`. In-memory stale-while-revalidate cache keeps `readAppConfig` synchronous. Atomic file write (tmp + rename) avoids torn config. Serverless secret handling drops undecryptable sealed R2 secret to favor env var.

## Environment variables / config read
- `process.env.VERCEL` (serverless detection).
- Reads/writes `app.config.json` on disk (local) or the `AppConfig` MongoDB singleton (`{ singleton: 'app' }`).

## Relationships (who uses it)
Central config source; used by `ollama.ts`, `r2Storage.ts` (`readAppConfig`), settings routes (`saveAppConfig`), stale-alert dashboard logic (`getStaleAlertDays`), and bootstrap (`loadAppConfigCache`).
