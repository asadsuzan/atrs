# ATRS — System Architecture Overview

> ATRS = **Automated Townhall Report System**. Monorepo (`package.json` name
> `atrs-monorepo`, v1.0.0). This document synthesizes the per-file docs under
> `docs/files/**` and the grounded facts in `docs/inventory/KNOWLEDGE-BASE.md §0`.
> Every claim is traceable to a cited source file.

---

## 1. Monorepo layout

npm workspaces are `client` + `server` (root `package.json`). A standalone
`tools/dist-builder` and a Vercel serverless entry `api/index.ts` sit alongside.

| Path | Role | Key entry files |
|------|------|-----------------|
| `client/` | React + Vite SPA (workspace) | `client/src/main.tsx`, `client/src/App.tsx` |
| `server/` | Express + Mongoose API (workspace) | `server/src/index.ts` (local), `server/src/app.ts` (app factory) |
| `api/` | Vercel serverless function entry | `api/index.ts` (wraps `server` `app` + `bootstrap`) |
| `tools/dist-builder` | Standalone distribution builder | — |
| `uploads/` | Local media storage root (local provider only) | served at `/uploads` |
| `docs/` | Reverse-engineering documentation tree | — |
| `app.config.json` | Runtime app config (local FS provider) | read/written by `utils/appConfig.ts` |

Root scripts (`package.json`): `dev` runs client+server concurrently; `build`
builds client then server; `test` runs server tests; Vercel uses
`buildCommand: npm run build:client`, `outputDirectory: client/dist` (`vercel.json`).

---

## 2. Two deployment modes

The same Express `app` (`server/src/app.ts`) serves both modes; the switch is
`isServerless()` = `!!process.env.VERCEL` (`server/src/utils/appConfig.ts`).

| Concern | Local (Express) | Serverless (Vercel) |
|---|---|---|
| Entry | `server/src/index.ts` → `app.listen(PORT\|\|5000, '0.0.0.0')` | `api/index.ts` → `await bootstrap(); return app(req,res)` |
| `bootstrap()` timing | called at startup, **not awaited** (accepts connections while DB connects) | **awaited** per cold start (memoized) |
| DB connect retries | default 5, linear backoff `2000ms*attempt` | `connectDB(1)` — single attempt, fail fast |
| Env loading | `dotenv.config()` on repo-root `.env` | skipped (platform injects env) |
| `trust proxy` | off | `app.set('trust proxy', 1)` (client IP via `X-Forwarded-For` for rate-limit keying) |
| Config store | `app.config.json` file (atomic tmp+rename write) | MongoDB `AppConfig` singleton `{singleton:'app'}` + 30s stale-while-revalidate cache |
| Media storage | local `uploads/` dir, served static at `/uploads` | Cloudflare R2 (read-only FS) |
| SSE registry / job sessions | pure in-memory (single node) | in-memory + MongoDB mirror (`JobSession`) for cross-instance cancel |

`bootstrap()` (memoized, `app.ts:162`): `assertJwtSecretAtBoot()` →
`connectDB(serverless?1:undefined)` → `loadAppConfigCache()` →
`seedAndMigrate()` (non-fatal, swallowed). A failed boot nulls the memo so the
next request retries (`server/src/app.ts`).

`vercel.json` rewrites: `/api/:path*` → `/api/index`; everything except
`/api/` and `/uploads/` → `/index.html` (SPA fallback).

---

## 3. Architecture diagram

```
                          BROWSER (SPA)
  client/src/main.tsx → App.tsx (providers + router)
  - axios `api` (baseURL "/api", JWT from localStorage "atrs_token")   services/api.ts
  - EventSource / fetch-stream for SSE (token via ?token= query)
        │  HTTPS (same-origin; dev proxy or Vercel routes /api → backend)
        ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  ENTRY:  local server/src/index.ts   |   serverless api/index.ts  │
  │            app.listen()              |     bootstrap()+app(req,res)│
  └───────────────────────────┬──────────────────────────────────────┘
                              ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  EXPRESS APP  (server/src/app.ts)                                  │
  │  middleware chain (in order):                                      │
  │   helmet → cors(allow-list) → /api rateLimit(1000/15min)           │
  │   → customLogger → json(5mb) → urlencoded(5mb)                     │
  │   → static /uploads (local only)                                   │
  │   → ROUTE MOUNTS (per-mount auth guards) → errorHandler (last)     │
  └───────────────────────────┬──────────────────────────────────────┘
                              ▼
     ROUTES  (server/src/routes/*)  ── auth guards per mount ──▶
                              ▼
     CONTROLLERS (server/src/controllers/*)  — HTTP shape, status codes,
                                               SSE via utils/sseStream
                              ▼
     SERVICES (server/src/services/*)  — business logic, WP.org pipeline,
                                          AI, GitHub, notifications, jobs
                              ▼
     REPOSITORIES (3) + MODELS (12, Mongoose)  (server/src/{repositories,models})
                              ▼
                        ┌───────────┐
                        │  MongoDB  │  (Product, Activity, Version, User,
                        └───────────┘   AppConfig, JobSession, Notification, …)

  EXTERNAL INTEGRATIONS (called from services/utils):
   - WordPress.org  : plugins info API 1.2 + SVN (WebDAV PROPFIND/REPORT)  ProductService, WpStatsService
   - GitHub REST    : release sync                                          utils/github.ts, GitHubService
   - Ollama (AI)    : /api/generate JSON-mode completions                   services/ai/AiService, utils/ollama
   - Cloudflare R2  : S3-compatible media storage (serverless)             utils/r2Storage.ts
```

---

## 4. Request lifecycle (authed request)

1. Client calls an API via the shared axios `api` (baseURL `/api`,
   `client/src/services/api.ts`). The request interceptor injects
   `Authorization: Bearer <token>` from `localStorage['atrs_token']`.
2. The request enters the Express middleware chain (`server/src/app.ts`):
   `helmet` → `cors` (allow-list from `CLIENT_ORIGIN`, else vite defaults) →
   `/api` rate limiter (1000/IP/15min) → `customLogger` → body parsers.
3. The route mount applies its auth guards (`server/src/middlewares/auth.ts`):
   `requireAuth` (Bearer header only) → `requireActive` (DB user lookup;
   token invalidation, role/status sync) → optionally `requireAdmin`.
4. The route (`server/src/routes/*`) dispatches to a controller
   (`server/src/controllers/*`), often after Zod `validate(schema)`
   (`server/src/middlewares/validate.ts`) which mutates `req.query`/`req.params`.
5. The controller calls a service (`server/src/services/*`) which performs
   ownership-scoped business logic and writes audit logs.
6. The service reads/writes via repositories/Mongoose models
   (`server/src/{repositories,models}`) against MongoDB.
7. Errors bubble to `errorHandler` (`server/src/middlewares/errorHandler.ts`):
   ZodError→400, Mongo dup key 11000→409, else `err.statusCode||500`
   (prod hides message/stack for 5xx unless `err.expose`).

See `data-flow.md` for the full numbered traces (CRUD, SSE jobs, notifications,
React Query).

---

## 5. Auth model

JWT is **HS256** pinned (`server/src/middlewares/auth.ts`). Payload
`JwtPayload { sub, role:'admin'|'user', isRoot, name?, email?, iat? }`; signed
with `JWT_SECRET`, `expiresIn = JWT_EXPIRES_IN || '7d'`.
`assertJwtSecretAtBoot()` fails hard if the secret is missing (always) or weak
(prod); the client stores the token in `localStorage['atrs_token']`.

| Guard | Rule | Notes |
|---|---|---|
| `requireAuth` | Bearer **header only** | deliberately NOT `?token=` (leak risk) |
| `requireAuthSSE` | Bearer header **OR** `?token=` query | EventSource can't set headers; used only on streaming routes |
| `requireActive` | DB lookup: 401 if user gone, 403 if status≠active | invalidates tokens issued before `passwordChangedAt` (iat, 1s slack); syncs role/isRoot/name/email onto `req.user` |
| `requireAdmin` | `role === 'admin'` | |

**Route mounts and guards** (`server/src/app.ts:112–147`):

| Guard set | Mount prefixes |
|---|---|
| Public (none) | `/api/auth`, `/api/tools` (readme-validator proxy), `/api/public` (hosted changelog/issues), `GET /api/health` |
| `requireAuth, requireActive` | `/api/products`, `/api/activities`, `/api/reports`, `/api/upload`, `/api/media`, `/api/audit-logs`, `/api/versions`, `/api/issues`, `/api/feature-requests`, `/api/streak`, `/api/jobs`, `/api/github`, `/api/changelog-gen`, `/api/ai` |
| Guards **internal** to router | `/api/notifications` — mounted without app-level guards; each route applies its own (`requireAuth`/`requireActive`, or `requireAuthSSE` on `/subscribe`) — see `server/src/routes/notificationRoutes.ts` |
| `requireAuth, requireActive, requireAdmin` | `/api/users`, `/api/config`, `GET /api/export` |

Client-side, the axios response interceptor turns any `401` into
`clearToken()` + full-page redirect to `/login`
(`client/src/services/api.ts`).

---

## 6. Storage: local vs Cloudflare R2

Selected by `storage.provider` in app config, with env fallback
(`server/src/utils/r2Storage.ts` `getStorageConfig()`): explicit `'r2'`/`'local'`
wins; otherwise if all five `R2_*` env vars are present it defaults to `'r2'`.

- **Local**: files under `uploads/`, served static at `/uploads`
  (`app.ts`). Deletions go through `deleteMediaFile` with a path-traversal
  containment guard (`server/src/utils/fileUtils.ts`).
- **R2** (`isR2Active()`): S3-compatible client (`region:'auto'`, endpoint
  `https://<accountId>.r2.cloudflarestorage.com`), credential-keyed client cache,
  `uploadToR2`/`deleteFromR2`/`r2ObjectExists`/`listR2Objects`/`testR2Connection`
  (put→head→delete probe). Secret is sealed at rest (`crypto.sealSecret`) and
  dropped on serverless config seed (can't decrypt cross-machine), so
  `R2_SECRET_ACCESS_KEY` env takes over (`utils/appConfig.ts loadAppConfigCache`).
- `deleteMediaFile` dispatches R2 vs local by whether the URL maps to an R2 key
  (`r2KeyFromUrl`) — R2 deletes are fire-and-forget to preserve a sync signature.

---

## 7. External integrations

| Integration | Where | What it does |
|---|---|---|
| **WordPress.org** | `ProductService` (`server/src/services/ProductService.ts`), `WpStatsService` | Plugin info API 1.2 (`query_plugins`, `plugin_information`); SVN via WebDAV `PROPFIND`/`REPORT` on `plugins.svn.wordpress.org` for version tags + release notes + `trunk/readme.txt`; live ecosystem stats (installs, rank, …). Powers the SSE import pipeline. |
| **GitHub REST** | `server/src/utils/github.ts`, `GitHubService` | No SDK — fetch-based. `parseRepo`, `getAuthenticatedUser` (token validate), `listReleases` (paginated, skips drafts). Per-user PAT; Enterprise via `GITHUB_API_URL`. |
| **Ollama (AI)** | `server/src/services/ai/AiService.ts`, `utils/ollama` | JSON-mode `/api/generate` completions for "Suggest title"/"Generate description" and the changelog generator. Local or cloud (`changelogGen.ollamaMode`), model default `qwen2.5-coder`. |
| **Cloudflare R2** | `server/src/utils/r2Storage.ts` | S3-compatible media storage (see §6). |

---

## 8. Key config / env vars

From `KNOWLEDGE-BASE.md` and `utils/appConfig.ts`:

- Server/boot: `PORT`, `MONGODB_URI` (default `mongodb://127.0.0.1:27017/atrs`),
  `NODE_ENV`, `VERCEL` (serverless flag), `CLIENT_ORIGIN` (comma-sep CORS
  allow-list).
- Auth/seed: `JWT_SECRET`, `JWT_EXPIRES_IN`, `ROOT_ADMIN_EMAIL/PASSWORD/NAME`.
- Integrations: `GITHUB_API_URL`, `R2_*` (accountId/bucket/publicBaseUrl/
  accessKeyId/secretAccessKey), Ollama endpoint/model via app config.
- `app.config.json` (`DEFAULT_APP_CONFIG`): `server`, `sounds`, `navigation`,
  `changelogGen`, `staleAlert.days` (default 7, clamped 1–365), `branding`,
  `storage`.

---

## 9. Bootstrap seed & migration

`seedAndMigrate()` (non-fatal; `server/src/scripts/seedAndMigrate.ts`):
(1) drop legacy global `slug_1` index (slugs now unique per-owner via compound
`{ownerId,slug}`); (2) dedupe imported Activities by `{productId,importSourceKey}`
and Versions by `{productId,label}`, then `Activity.createIndexes()`;
(3) `ensureRootAdmin()` from `ROOT_ADMIN_*`; (4) back-fill `ownerId=root._id` on
ownerless Product/Activity/Version/ProductMarketing.
