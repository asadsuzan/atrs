# Appendix — Coding & Architectural Conventions

> The recurring patterns that hold across the ATRS codebase. Each is
> source-traceable to the per-file docs under [`../files/`](../files/) and to
> [`../architecture/overview.md`](../architecture/overview.md). Follow these when
> adding or changing code.

---

## 1. Ownership scoping on every access

Every domain record carries an `ownerId`. Services **must** scope reads with
`scopeFilter(user, base)` and guard single documents with `assertOwner(doc, user)`
(or `ownerOrAssigneeFilter`/`assertOwnerOrAssignee` for assignable entities like
Issues). Admins are unrestricted; a missing user yields a filter that matches
nothing. Scoping lives in **services**, never controllers.
→ [`utils/ownership`](../files/server/utils/ownership.md), [server-layers.md](../directories/server-layers.md).

## 2. 404-on-denial (no id enumeration)

Ownership failures return **404 Not found**, never 403. Users therefore cannot
probe which ids exist. Applied uniformly by `assertOwner`/`assertOwnerOrAssignee`.
→ [`utils/ownership`](../files/server/utils/ownership.md).

## 3. Zod `validate()` HOF at the route boundary

Input validation is a higher-order middleware `validate(schema)` that parses
`{ body, query, params }` and writes the coerced/stripped values back onto the
request (delete-then-`Object.assign` for the getter-backed `req.query`/`req.params`).
Thrown `ZodError`s are forwarded to the central error handler → **400**.
Schemas live in `server/src/schemas/*`.
→ [`middlewares/validate`](../files/server/middlewares/validate.md),
[`schemas/`](../files/server/schemas/).

## 4. Centralized error shaping

The last middleware, `errorHandler`, maps errors uniformly: `ZodError` → 400,
Mongo duplicate-key `11000` → 409, otherwise `err.statusCode || 500`. In
production, 5xx messages/stacks are hidden unless `err.expose === true` (or
`statusCode < 500`). Create errors with the `createHttpError` helper.
→ [`middlewares/errorHandler`](../files/server/middlewares/errorHandler.md),
[`utils/httpError`](../files/server/utils/httpError.md).

## 5. Audit logging on mutations

Every create/update/delete calls
`AuditLogService.logEvent(action, entityType, entityId, entityName, details, actor)`.
It is **fire-and-forget** — it swallows its own errors so a logging failure never
breaks the operation — and it SSE-notifies root admins about **non-root** actors
only.
→ [`AuditLogService`](../files/server/services/AuditLogService.md).

## 6. SSE `runStreamJob` pattern for long-running work

Bulk/cascade/import jobs run through `runStreamJob(req, res, handler)`, which:
writes SSE headers (incl. `X-Accel-Buffering: no`), registers a cancellable
session, polls `refreshFromStore` every 2s for cross-instance cancels, cancels on
client disconnect, and emits `session` → `progress` → `complete`/`error`. The
handler must cooperatively check `isCancelled()`. Streaming routes use
`requireAuthSSE` (Bearer header **or** `?token=`).
→ [`utils/sseStream`](../files/server/utils/sseStream.md),
[`services/ImportSessionManager`](../files/server/services/ImportSessionManager.md),
[`middlewares/auth`](../files/server/middlewares/auth.md).

## 7. Client mini-player pattern for SSE jobs

Each streaming job has a context provider + a `*MiniPlayer` mounted once in
`App.tsx`, so progress persists across route changes. Never tie a running job's
state to a page component.
→ [client-components.md](../directories/client-components.md),
[`jobs/`](../files/client/components/jobs/), glossary "mini-player".

## 8. React Query key naming

Server state is fetched via TanStack Query with feature-namespaced keys
(e.g. `dashboardActivities`, `allVersions`, `['release', productId]`). Mutations
invalidate the specific keys they affect. Services stay stateless; keys are owned
by the page/hook.
→ [client-services.md](../directories/client-services.md),
[`Dashboard`](../files/client/pages/Dashboard.md).

## 9. Single-source versioning

Version ordering and the "Latest"/"Unreleased" flags are computed **only** in
`lib/versions` (`decorateVersions`, `summarizeLabels`), surfaced via
`useVersions` and rendered with `VersionBadge`. Do not re-derive version state
from activity label strings.
→ [`lib/versions`](../files/client/lib/versions.md),
[`hooks/useVersions`](../files/client/hooks/useVersions.md), user memory
`versioning-single-source`.

## 10. Import review queue

Uncertain auto-derived data is flagged `needsReview` (+ `reviewReason`,
`importConfidence`) rather than silently trusted, and surfaced on the `/review`
page for human confirmation. Applies to WP.org-imported Activities and public
Issues.
→ [`Activity`](../files/server/models/Activity.md),
[`Issue`](../files/server/models/Issue.md),
[`Review`](../files/client/pages/Review.md), user memory `import-review-queue`.

## 11. Idempotent imports & syncs via unique partial indexes

Repeated imports/syncs must not duplicate rows. Enforced at the schema level:
- Activities: unique `{productId, importSourceKey}` (partial, only when
  `importSourceKey` exists) — dedup WP.org readme entries.
- Versions: unique `{productId, source, externalId}` (partial, only for non-empty
  string `externalId`) — idempotent GitHub release sync.
`seedAndMigrate` also dedupes legacy data at boot.
→ [`Activity`](../files/server/models/Activity.md),
[`Version`](../files/server/models/Version.md),
[`seedAndMigrate`](../files/server/scripts/seedAndMigrate.md).

## 12. Per-owner unique slugs

Product slugs are unique **within an owner's namespace**, not globally: compound
unique index `{ownerId, slug}`; `disambiguateSlug` appends `-2`, `-3`, … against
the set of the owner's existing slugs. The legacy global `slug_1` index is dropped
at boot.
→ [`utils/slug`](../files/server/utils/slug.md),
[`Product`](../files/server/models/Product.md),
[`seedAndMigrate`](../files/server/scripts/seedAndMigrate.md).

## 13. Write-only secrets

Secrets are never sent to the client. The UI exposes a boolean `*Set` flag and
only transmits a value when the user enters a new one; R2 secrets are additionally
sealed at rest with `crypto.sealSecret` and dropped from the serverless config
seed (env takes over). Applies to R2 `secretAccessKey` and the Ollama cloud key.
→ [`Settings`](../files/client/pages/Settings.md),
[`utils/crypto`](../files/server/utils/crypto.md),
[`utils/appConfig`](../files/server/utils/appConfig.md).

## 14. Path-traversal guards on filesystem access

Any path derived from user input (media deletion, repo-path browsing) is
contained within an allowed base directory before use, rejecting `..` escapes.
→ [`utils/fileUtils`](../files/server/utils/fileUtils.md),
[`FsController`](../files/server/controllers/FsController.md).

## 15. JWT auth conventions

- HS256 pinned; payload `{ sub, role, isRoot, name?, email?, iat? }`; `JWT_SECRET`,
  `expiresIn = JWT_EXPIRES_IN || '7d'`; boot fails hard on missing/weak secret.
- Bearer **header only** for normal routes (`requireAuth`); `?token=` allowed
  **only** on SSE routes (`requireAuthSSE`).
- `requireActive` invalidates tokens issued before `passwordChangedAt`.
- Client stores the token in `localStorage['atrs_token']`; a 401 clears it and
  redirects to `/login`.
→ [`middlewares/auth`](../files/server/middlewares/auth.md),
[`services/api`](../files/client/services/api.md).

## 16. Deployment-mode branches via `isServerless()`

Behavior that differs between local and Vercel (config store, media store, DB
retries, trust proxy, session mirroring) branches on `isServerless()` rather than
scattering `process.env.VERCEL` checks.
→ [`utils/appConfig`](../files/server/utils/appConfig.md),
[`../architecture/overview.md §2`](../architecture/overview.md).

## 17. Pure transforms in dist-builder

Transform functions (`stripProMarkers`, `applyJsonPatch`, `applyTextEdits`, …)
are side-effect-free and return descriptors; `index.ts` performs the actual file
writes/deletes. Config-driven — no plugin-specific logic in the engine.
→ [tools-dist-builder.md](../directories/tools-dist-builder.md).
