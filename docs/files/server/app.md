# `server/src/app.ts`

**Purpose:** Builds and configures the Express application: environment loading, security/CORS/rate-limit/logging/body-parsing middleware, static file serving, all route mounts (with per-mount auth guards), the error handler, and a memoized `bootstrap()` used by both the local server and the Vercel serverless function. Proven from the `express()` instance creation (line 47), the middleware `app.use(...)` chain, the route mounts (lines 112-143), and the exported `bootstrap`/`default app`.
**Language / Size:** TypeScript / 6172 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `bootstrap` | function | `bootstrap(): Promise<void>` | Memoized one-time startup: JWT check, DB connect, config cache load, seed/migrate |
| `app` (default) | const (Express) | `Express` | The configured Express application instance |

## Imports
- Internal:
  - `./middlewares/logger` → `customLogger`
  - `./config/db` → `connectDB` (default)
  - `./middlewares/errorHandler` → `errorHandler`
  - `./middlewares/auth` → `requireAuth, requireActive, requireAdmin, assertJwtSecretAtBoot`
  - `./scripts/seedAndMigrate` → `seedAndMigrate`
  - `./utils/appConfig` → `isServerless, loadAppConfigCache`
  - Route modules: `./routes/productRoutes`, `activityRoutes`, `reportRoutes`, `uploadRoutes`, `auditLogRoutes`, `versionRoutes`, `issueRoutes`, `configRoutes`, `mediaRoutes`, `authRoutes`, `userRoutes`, `notificationRoutes`, `jobRoutes`, `githubRoutes`, `readmeToolsRoutes`, `publicRoutes`, `featureRequestRoutes`, `streakRoutes`, `changelogGenRoutes`, `aiRoutes`
  - `./controllers/ExportController` → `exportAllData`
- External: `express` (+ types `Express, Request, Response`), `cors`, `helmet`, `express-rate-limit`, `dotenv`, `path`

## Functions / Classes
**`bootstrap(): Promise<void>`** — One-time startup work shared by local server and Vercel function.
- Algorithm:
  1. If `bootPromise` is already set, return it (memoization — concurrent serverless invocations share one attempt).
  2. Otherwise create the promise from an async IIFE that: calls `assertJwtSecretAtBoot()`; awaits `connectDB(isServerless() ? 1 : undefined)` (serverless cold starts get a single attempt — fail fast, no backoff); awaits `loadAppConfigCache()`; awaits `seedAndMigrate()` wrapped in `.catch()` that logs but swallows the error.
  3. Attaches `bootPromise.catch(() => { bootPromise = null; })` so a failed attempt clears the memo, letting the next request retry rather than caching the failure.
  4. Returns `bootPromise`.
- Side effects: DB connection, config cache load, DB seeding/migration; may call `process.exit(1)` indirectly via `assertJwtSecretAtBoot`.
- Error handling: seed/migrate failures are logged and swallowed; other steps reject the returned promise (and reset the memo).

**Module-level configuration (runs at import time):**
- **Env loading:** `if (!isServerless())` resolve `path.resolve(__dirname, '../../.env')`, `dotenv.config({ path })`, log the path; log any `result.error`. WHY: on Vercel env vars are injected by the platform, so dotenv is skipped there.
- **Trust proxy:** `if (isServerless()) app.set('trust proxy', 1)`. WHY: behind Vercel's proxy the client IP arrives via `X-Forwarded-For`; without this, `express-rate-limit` would key every request to the proxy IP.
- **CORS allow-list:** builds a `Set` from `process.env.CLIENT_ORIGIN` (comma-separated) or `defaultOrigins` (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://192.168.0.199:5173`); each trimmed and truthy-filtered. Origin callback returns `callback(null, true)` when there is no Origin header or the origin is in the set; otherwise `callback(null, false)` — it does NOT throw, so disallowed/`null` origins simply get no CORS headers (allows iframe form-navigation like the readme-validator while still blocking cross-origin XHR reads). `credentials: true`.
- **Rate limiter:** `apiLimiter` — `windowMs: 15*60*1000` (15 min), `max: 1000` per window per IP, `standardHeaders: true`, `legacyHeaders: false`, custom `message`. Applied to `/api`.

## Interfaces / Types / Constants / Enums / Global variables
- `defaultOrigins: string[]` — fallback CORS origins.
- `allowedOrigins: Set<string>` — computed CORS allow-list.
- `apiLimiter` — configured `express-rate-limit` instance.
- `app: Express` — the app instance.
- `bootPromise: Promise<void> | null` — module-level memoization slot for `bootstrap()`.

## Important logic & design patterns
- **Middleware order (exact, as applied):**
  1. `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })` — security headers, allowing cross-origin static assets.
  2. `cors({ origin: <allow-list fn>, credentials: true })`.
  3. `app.use('/api', apiLimiter)` — rate limiting scoped to `/api`.
  4. `customLogger` — HTTP request logging.
  5. `express.json({ limit: '5mb' })`.
  6. `express.urlencoded({ extended: true, limit: '5mb' })`.
  7. `app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))` — static uploads (local-storage provider only; on Vercel media lives in Cloudflare R2).
  8. Route mounts (see below).
  9. `app.use(errorHandler)` — last.
- **Route mounts and guards:**
  - Public (no auth): `/api/auth` → authRoutes; `/api/tools` → readmeToolsRoutes (WP.org readme validator reverse proxy for iframe embedding); `/api/public` → publicRoutes (read-only hosted changelog).
  - `requireAuth, requireActive`: `/api/products`, `/api/activities`, `/api/reports`, `/api/upload`, `/api/media`, `/api/audit-logs`, `/api/versions`, `/api/issues`, `/api/feature-requests`, `/api/streak`, `/api/jobs`, `/api/github`, `/api/changelog-gen`, `/api/ai`.
  - `/api/notifications` → notificationRoutes mounted WITHOUT the app-level guards (auth handled inside the route module — not determinable from this file).
  - `requireAuth, requireActive, requireAdmin`: `/api/users`, `/api/config`, and `GET /api/export` → `exportAllData`.
  - `GET /api/health` → returns `{ status: 'ok', message: 'ATRS API is running' }`.
- **Memoized boot with failure-reset** pattern for serverless idempotency.

## Relationships (who this depends on / who likely consumes it)
- Consumes: all route modules, the four middlewares, `connectDB`, `seedAndMigrate`, `appConfig` utils, `ExportController`.
- Consumed by: `server/src/index.ts` (imports `app` default and `bootstrap`) and presumably the Vercel serverless entrypoint (not in this file set).

## Lifecycle (when it runs / is instantiated)
- Module top-level runs on first import (env load, app creation, middleware/route wiring).
- `bootstrap()` runs on demand — called by `index.ts` at startup and (per comments) by the serverless handler per cold start; memoized so it effectively runs once per successful attempt.
