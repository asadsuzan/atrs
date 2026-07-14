# Directory Guide — `server/src`

> The Express + Mongoose API (npm workspace `server`). The same `app` factory
> serves both **local** (`index.ts` → `app.listen`) and **serverless**
> (`../../api/index.ts` → `bootstrap()` + `app(req,res)`) modes. Facts here are
> grounded in [`../architecture/overview.md`](../architecture/overview.md) and
> the per-file docs under [`../files/server/`](../files/server/).

## Role

`server/src` implements the whole backend: authentication, ownership-scoped CRUD
for every domain entity, the WordPress.org import pipeline, GitHub release sync,
AI (Ollama) completions, SSE streaming jobs, real-time notifications, media
storage (local / Cloudflare R2), audit logging, and reporting.

## Layout

| Subfolder | Count | Role | Key docs |
|---|---|---|---|
| `app.ts`, `index.ts` | 2 | App factory + local entry | [`app`](../files/server/app.md), [`index`](../files/server/index.md) |
| `config/` | 1 | DB connection | [`db`](../files/server/config/db.md) |
| `controllers/` | 21 | HTTP shape: parse req, call service, status codes, SSE | [`../files/server/controllers/`](../files/server/controllers/) |
| `services/` | ~20 | Business logic (+ `ai/` subfolder) | [`../files/server/services/`](../files/server/services/) |
| `repositories/` | 3 | Data-access wrappers over models | [`ProductRepository`](../files/server/repositories/ProductRepository.md), [`ActivityRepository`](../files/server/repositories/ActivityRepository.md), [`ProductMarketingRepository`](../files/server/repositories/ProductMarketingRepository.md) |
| `models/` | 12 | Mongoose schemas | [`../files/server/models/`](../files/server/models/) |
| `schemas/` | 13 | Zod request-validation schemas | [`../files/server/schemas/`](../files/server/schemas/) |
| `middlewares/` | 5 | auth, validate, errorHandler, logger | [`../files/server/middlewares/`](../files/server/middlewares/) |
| `routes/` | 20 | Express routers (mount points + guards) | [`../files/server/routes/`](../files/server/routes/) |
| `utils/` | 23 | Cross-cutting helpers | [`../files/server/utils/`](../files/server/utils/) |
| `scripts/` | 1 | Boot-time seed & migrate | [`seedAndMigrate`](../files/server/scripts/seedAndMigrate.md) |
| `types/` | 1 | Express `Request.user` augmentation | [`auth`](../files/server/types/auth.md) |

The controller→service→repository→model layering is documented separately in
[server-layers.md](server-layers.md).

## Bootstrap & entry

- [`app.ts`](../files/server/app.md) — builds the Express app; middleware chain
  `helmet → cors(allow-list) → /api rate limit (1000/15min) → customLogger →
  json/urlencoded (5mb) → static /uploads (local) → route mounts → errorHandler`.
  `bootstrap()` is memoized: `assertJwtSecretAtBoot()` → `connectDB()` →
  `loadAppConfigCache()` → `seedAndMigrate()` (non-fatal).
- [`index.ts`](../files/server/index.md) — local entry: `app.listen(PORT||5000)`,
  calls `bootstrap()` un-awaited, graceful SIGTERM/SIGINT shutdown.
- The serverless entry is `api/index.ts` (repo root, see
  [project-root.md](project-root.md)): `await bootstrap(); return app(req,res)`.

## API surface (route mounts, `app.ts`)

| Guard set | Mounts |
|---|---|
| Public | `/api/auth`, `/api/tools`, `/api/public`, `GET /api/health` |
| `requireAuth, requireActive` | `/api/products`, `/api/activities`, `/api/reports`, `/api/upload`, `/api/media`, `/api/audit-logs`, `/api/versions`, `/api/issues`, `/api/feature-requests`, `/api/streak`, `/api/jobs`, `/api/github`, `/api/changelog-gen`, `/api/ai` |
| Guards internal to router | `/api/notifications` |
| `+ requireAdmin` | `/api/users`, `/api/config`, `GET /api/export` |

## Key models

12 Mongoose models: [`User`](../files/server/models/User.md),
[`Product`](../files/server/models/Product.md) (category enum
`plugin|block|theme|standalone`),
[`Activity`](../files/server/models/Activity.md) (changelog entries),
[`Version`](../files/server/models/Version.md),
[`Issue`](../files/server/models/Issue.md),
[`FeatureRequest`](../files/server/models/FeatureRequest.md),
[`ProductMarketing`](../files/server/models/ProductMarketing.md) (1-to-1 product),
[`DailyLog`](../files/server/models/DailyLog.md) (streak),
[`Notification`](../files/server/models/Notification.md),
[`AuditLog`](../files/server/models/AuditLog.md),
[`AppConfig`](../files/server/models/AppConfig.md) (serverless config singleton),
[`JobSession`](../files/server/models/JobSession.md) (cross-instance SSE cancel,
TTL 1h).

## Conventions

- **Ownership scoping** on every read/write via
  [`utils/ownership`](../files/server/utils/ownership.md)
  (`scopeFilter`/`assertOwner`); denial returns **404**, never 403 (no id
  enumeration). Admins are unrestricted.
- **Zod validation** via the [`validate(schema)`](../files/server/middlewares/validate.md)
  HOF; `ZodError` → 400 in [`errorHandler`](../files/server/middlewares/errorHandler.md).
- **Audit logging** on mutations through
  [`AuditLogService`](../files/server/services/AuditLogService.md) (fire-and-forget,
  never throws).
- **SSE jobs** via [`utils/sseStream`](../files/server/utils/sseStream.md)
  `runStreamJob` + [`ImportSessionManager`](../files/server/services/ImportSessionManager.md).
- **Deployment-mode switches** via `isServerless()` in
  [`utils/appConfig`](../files/server/utils/appConfig.md).

See [server-layers.md](server-layers.md) for how these responsibilities are
distributed across the layers, and [conventions](../appendix/conventions.md) for
the full list.
