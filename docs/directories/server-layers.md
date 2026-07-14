# Directory Guide — Server Layering (controller → service → repository → model)

> How a request flows through `server/src` and where each responsibility lives.
> Grounded in [`../architecture/overview.md §4`](../architecture/overview.md) and
> the per-file docs under [`../files/server/`](../files/server/).

## The layers

```
routes/*        mount point + auth guards + validate(schema) + dispatch
   │
controllers/*   HTTP shape: read req.user/params/body, call service,
   │            set status codes, drive SSE (runStreamJob)
   │
services/*      business logic: ownership scoping, audit logging,
   │            external integrations (WP.org, GitHub, Ollama, R2)
   │
repositories/*  (3) reusable data-access wrappers over models
   │
models/*        Mongoose schemas + indexes (12)
   │
MongoDB
```

Not every path touches a repository — only Product, Activity, and
ProductMarketing have dedicated repos
([`ProductRepository`](../files/server/repositories/ProductRepository.md),
[`ActivityRepository`](../files/server/repositories/ActivityRepository.md),
[`ProductMarketingRepository`](../files/server/repositories/ProductMarketingRepository.md)).
Other services call Mongoose models directly.

## Where each concern lives

### Routes (`routes/`, 20)
Declare the URL surface and attach middleware in order: auth guards
(`requireAuth`/`requireActive`/`requireAdmin`, or `requireAuthSSE` on streaming
endpoints) → `validate(schema)` → controller method. App-level guards are set at
mount time in [`app.ts`](../files/server/app.md); `/api/notifications` applies its
guards inside the router instead
([`notificationRoutes`](../files/server/routes/notificationRoutes.md)).

### Controllers (`controllers/`, 21)
Own the **HTTP contract only**: pull `req.user`, `req.params`, validated
`req.body`/`req.query`; call one or more services; choose status codes; and for
long jobs call [`runStreamJob`](../files/server/utils/sseStream.md) to open an SSE
stream. They contain no direct DB queries of substance and no ownership logic —
that belongs to services. Example:
[`ProductController`](../files/server/controllers/ProductController.md),
[`ActivityController`](../files/server/controllers/ActivityController.md),
[`FsController`](../files/server/controllers/FsController.md) (repo-path browsing).

### Services (`services/`, ~20 incl. `ai/`)
The heart of the backend. Each service:
- **Scopes by owner** — builds queries with
  [`scopeFilter(user, base)`](../files/server/utils/ownership.md) and guards
  single-doc access with `assertOwner(doc, user)` (or the assignee variants for
  Issues/tasks). Admins bypass scoping.
- **Writes audit logs** on mutations via
  [`AuditLogService.logEvent(...)`](../files/server/services/AuditLogService.md)
  (fire-and-forget; failures are swallowed so the operation still succeeds).
- **Talks to external systems** where relevant:
  [`ProductService`](../files/server/services/ProductService.md) +
  [`WpStatsService`](../files/server/services/WpStatsService.md) (WordPress.org
  info API + SVN import pipeline),
  [`GitHubService`](../files/server/services/GitHubService.md) (release sync),
  [`ai/AiService`](../files/server/services/ai/AiService.md) (Ollama),
  media services (R2/local).
- **Drives streaming jobs** via
  [`ImportSessionManager`](../files/server/services/ImportSessionManager.md)
  (cooperative cancel) and real-time fan-out via
  [`NotificationManager`](../files/server/services/NotificationManager.md).

### Repositories (`repositories/`, 3)
Thin, reusable query wrappers where the same access patterns recur (products,
activities, marketing). They centralize find/aggregate shapes so services don't
duplicate them. Most other entities are simple enough to be queried directly from
their service.

### Models (`models/`, 12)
Mongoose schemas define fields, enums, defaults, and — importantly — the
**indexes that encode invariants**:
- Per-owner unique product slug: `{ownerId, slug}` unique
  ([`Product`](../files/server/models/Product.md)).
- Idempotent import dedup: `{productId, importSourceKey}` unique partial index
  ([`Activity`](../files/server/models/Activity.md)).
- Idempotent GitHub sync: `{productId, source, externalId}` unique partial index
  ([`Version`](../files/server/models/Version.md)).
- TTL cross-instance cancel: `JobSession.createdAt expires 3600`
  ([`JobSession`](../files/server/models/JobSession.md)).

## Validation vs. ownership vs. audit — a summary

| Concern | Layer | Mechanism |
|---|---|---|
| **Input validation** | route (middleware) | [`validate(schema)`](../files/server/middlewares/validate.md) with Zod schemas in `schemas/` → `ZodError` → 400 |
| **AuthN** | route (middleware) | `requireAuth` / `requireAuthSSE` ([`auth`](../files/server/middlewares/auth.md)) |
| **Active/role check** | route (middleware) | `requireActive` (DB lookup, token invalidation), `requireAdmin` |
| **Ownership / AuthZ** | service | [`scopeFilter`/`assertOwner`](../files/server/utils/ownership.md); 404-on-denial |
| **Audit trail** | service | [`AuditLogService.logEvent`](../files/server/services/AuditLogService.md) on mutations |
| **Error shaping** | middleware (last) | [`errorHandler`](../files/server/middlewares/errorHandler.md): Zod→400, dup key 11000→409, else `statusCode||500` |

## Conventions

- Controllers never scope by owner — services do. This keeps authorization in one
  layer and prevents a controller from accidentally leaking cross-owner data.
- 404 (not 403) is returned on ownership denial everywhere, so users can't probe
  which ids exist.
- Audit logging is best-effort and must never break the mutation it records.

See [conventions](../appendix/conventions.md) for the codified rules.
