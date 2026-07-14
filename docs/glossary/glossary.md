# ATRS Glossary

> Alphabetized domain and technical terms. Each entry: a concise definition and
> where it appears in the codebase (file references into
> [`../files/`](../files/)). Grounded in the per-file docs,
> [`../inventory/KNOWLEDGE-BASE.md`](../inventory/KNOWLEDGE-BASE.md), and
> [`../architecture/overview.md`](../architecture/overview.md).

---

### Activity / Changelog entry
The core content unit: a per-product changelog item of `type` **feature**,
**improvement**, or **bug-fix**, with title, short description, optional `tier`
(free/pro), tags, media, `versionId`, and `activityDate`. The UI page is titled
"Changelogs". Model: [`Activity`](../files/server/models/Activity.md); service
[`ActivityService`](../files/server/services/ActivityService.md); page
[`Activities`](../files/client/pages/Activities.md); form
[`ActivityForm`](../files/client/components/activities/ActivityForm.md).

### apiLimiter
Express rate limiter applied to all `/api` routes: 15-minute window, max **1000**
requests per IP (`express-rate-limit`). Keyed by client IP (`trust proxy` on
serverless). See [`app`](../files/server/app.md).

### AppConfig / app config
Runtime application configuration (server, sounds, navigation, changelogGen,
staleAlert, branding, storage). **Local:** the `app.config.json` file is the
source of truth. **Serverless:** the [`AppConfig`](../files/server/models/AppConfig.md)
Mongo singleton (`{singleton:'app'}`) with a 30s stale-while-revalidate cache.
Read/written by [`utils/appConfig`](../files/server/utils/appConfig.md); edited
via [`Settings`](../files/client/pages/Settings.md) +
[`config` service](../files/client/services/config.md).

### assertOwner / ownership assertion
`assertOwner(doc, user)` in [`utils/ownership`](../files/server/utils/ownership.md)
throws `404 Not found` if the document is missing or not owned by the user
(admins pass). Companion `assertOwnerOrAssignee` also allows assignees. Enforces
the **404-on-denial** policy so ids can't be enumerated.

### ATRS
**Automated Townhall Report System.** The whole product; monorepo
`atrs-monorepo` v1.0.0 (root [`package.json`](../files/root/package-json.md)).

### Audit logging
Every mutation records an entry (action, entityType, entityId, actor) via
[`AuditLogService.logEvent`](../files/server/services/AuditLogService.md), which
also SSE-notifies root admins of **non-root** activity. Fire-and-forget: it
swallows its own errors so it never breaks the underlying operation. Model
[`AuditLog`](../files/server/models/AuditLog.md); page
[`AuditLogs`](../files/client/pages/AuditLogs.md).

### Changelog Generator
AI feature (`/changelog-generator`) that analyzes git changes over a range
(working/tags/commit/date) and produces four outputs — dev changelog, user
release notes, GitHub release notes, QA checklist — via an Ollama pipeline
(git → classify → summarize → report → review). Page
[`ChangelogGenerator`](../files/client/pages/ChangelogGenerator.md); context
[`ChangelogGenContext`](../files/client/contexts/ChangelogGenContext.md); service
[`ChangelogGenService`](../files/server/services/ChangelogGenService.md); survives
navigation via [`ChangelogGenMiniPlayer`](../files/client/components/jobs/ChangelogGenMiniPlayer.md).

### DailyLog / Streak
A `DailyLog` is one entry in a user's private daily work journal; the **streak**
is the count of consecutive days with a log — the app's habit mechanic. Model
[`DailyLog`](../files/server/models/DailyLog.md); service
[`StreakService`](../files/server/services/StreakService.md);
[`streak` service](../files/client/services/streak.md);
[`StreakCard`](../files/client/components/dashboard/StreakCard.md).

### Feature Request
A request for the ATRS platform itself, submitted in-app and triaged by admins
(status pending/planned/in-progress/done/declined). Model
[`FeatureRequest`](../files/server/models/FeatureRequest.md); page
[`FeatureRequests`](../files/client/pages/FeatureRequests.md).

### importConfidence
Enum `high|medium|low` on an imported Activity indicating how certain the import
heuristics were (e.g. when guessing an entry's type). Low-confidence entries are
flagged `needsReview`. See [`Activity`](../files/server/models/Activity.md) and
the [Review](../files/client/pages/Review.md) queue.

### ImportSessionManager
Process-local registry of in-flight streaming-job sessions with a cooperative
cancel flag, mirrored to the `JobSession` Mongo collection on serverless so a
cancel that lands on a different instance still reaches the running job
(pulled back via `refreshFromStore`).
[`ImportSessionManager`](../files/server/services/ImportSessionManager.md).

### importSourceKey
Stable identity for an imported changelog entry, formatted `version|normalized-title`,
used to dedupe WP.org readme imports idempotently via the unique partial index
`{productId, importSourceKey}`. See [`Activity`](../files/server/models/Activity.md)
and [`seedAndMigrate`](../files/server/scripts/seedAndMigrate.md).

### Issue
A bug/issue tracked per product, from **internal** or **public** sources
(severity low→critical; status open→closed). Public submissions arrive flagged
`needsReview`. Model [`Issue`](../files/server/models/Issue.md); service
[`IssueService`](../files/server/services/IssueService.md); components
[`IssueManager`](../files/client/components/issues/IssueManager.md),
[`ReportIssueDialog`](../files/client/components/issues/ReportIssueDialog.md);
public page [`PublicIssues`](../files/client/pages/PublicIssues.md).

### JobSession
Mongoose model holding the cross-instance cancellation flag for a streaming job
(`sessionId`, `userId`, `cancelled`), TTL-expiring after 1h. Only used on
serverless. [`JobSession`](../files/server/models/JobSession.md).

### Marketing Hub
Per-product marketing/landing-page content (hero, features, demos, screenshots,
FAQs, …), 1-to-1 with a Product. Model
[`ProductMarketing`](../files/server/models/ProductMarketing.md); service
[`ProductMarketingService`](../files/server/services/ProductMarketingService.md);
component [`MarketingManager`](../files/client/components/marketing/MarketingManager.md)
(with a [`SmartParser`](../files/client/components/marketing/SmartParser.md)).

### mini-player
A persistent, minimizable UI surface for a long-running SSE job that survives
route navigation (mounted once in `App.tsx`, driven by a context). Examples:
[`JobStreamMiniPlayer`](../files/client/components/jobs/JobStreamMiniPlayer.md),
[`WpImportMiniPlayer`](../files/client/components/products/WpImportMiniPlayer.md),
[`ChangelogGenMiniPlayer`](../files/client/components/jobs/ChangelogGenMiniPlayer.md).

### needsReview / review queue
Boolean flag on auto-derived data (imported Activities, public Issues) that is
uncertain and should be human-checked before it's trusted; `reviewReason`
explains why (e.g. `uncertain-type`). Surfaced on the
[`Review`](../files/client/pages/Review.md) page. See
[`Activity`](../files/server/models/Activity.md),
[`Issue`](../files/server/models/Issue.md).

### NotificationManager
Singleton **in-memory** SSE registry of connected clients with targeted dispatch
(per-user, root admins, admins, broadcast), a 30s keep-alive heartbeat, and
dead-socket reaping. Process-local — not shared across serverless instances.
[`NotificationManager`](../files/server/services/NotificationManager.md); client
[`NotificationContext`](../files/client/contexts/NotificationContext.md),
[`NotificationBell`](../files/client/components/layout/NotificationBell.md).

### Ollama
The LLM backend for all AI features (JSON-mode `/api/generate` completions), used
by the Changelog Generator and "Suggest title"/"Generate description". Local or
cloud mode (`changelogGen.ollamaMode`), default model `qwen2.5-coder`.
[`utils/ollama`](../files/server/utils/ollama.md),
[`ai/AiService`](../files/server/services/ai/AiService.md).

### Owner / ownership scoping (scopeFilter / assertOwner)
Every domain record has an `ownerId`. Services scope queries with
`scopeFilter(user, base)` (non-admins → `{ownerId: user.id}`; admins →
unrestricted) and guard single documents with `assertOwner`. Denial is a 404.
[`utils/ownership`](../files/server/utils/ownership.md).

### Product (kinds: plugin / block / theme / standalone)
A product owned by a user; `category` enum is **plugin**, **block**, **theme**,
or **standalone**. WP products carry `wpOrgSlug`/`wpReadme`; standalone products
may omit `githubUrl`. Slugs are unique **per owner** (`{ownerId, slug}`). Model
[`Product`](../files/server/models/Product.md); service
[`ProductService`](../files/server/services/ProductService.md); pages
[`Products`](../files/client/pages/Products.md),
[`ProductDetails`](../files/client/pages/ProductDetails.md).

### R2 storage (Cloudflare R2)
S3-compatible object storage used for media on serverless (read-only FS).
Selected by `storage.provider` (or auto when all five `R2_*` env vars exist).
Client cache keyed by credentials; secret sealed at rest. Local mode uses the
`uploads/` dir instead. [`utils/r2Storage`](../files/server/utils/r2Storage.md).

### Release / ReleasePublish
The act of cutting a product release: assembling released version + its
changelog entries and formatting release notes (readme / markdown). Service
[`ReleaseService`](../files/server/services/ReleaseService.md);
[`utils/releaseFormat`](../files/server/utils/releaseFormat.md); component
[`ReleasePublish`](../files/client/components/products/ReleasePublish.md);
[`release` service](../files/client/services/release.md).

### released / unreleased (Version tags)
A [`Version`](../files/server/models/Version.md) has `status` **released** or
**unreleased**. In the UI, "Unreleased" versions sort first and the newest
*released* version is flagged "Latest" — computed centrally in
[`lib/versions`](../files/client/lib/versions.md) (`decorateVersions`,
`summarizeLabels`). Any status other than the literal `'unreleased'` counts as
released.

### requireAuth / requireActive / requireAdmin / requireAuthSSE
Auth middleware ([`auth`](../files/server/middlewares/auth.md)):
- **requireAuth** — validates the JWT from the `Authorization: Bearer` header
  only (never `?token=`, to avoid leaks).
- **requireAuthSSE** — accepts the Bearer header **or** a `?token=` query param
  (EventSource can't set headers); used only on streaming routes.
- **requireActive** — DB user lookup: 401 if gone, 403 if not active; invalidates
  tokens issued before `passwordChangedAt`; syncs role/isRoot/name/email onto
  `req.user`.
- **requireAdmin** — requires `role === 'admin'`.

### Root admin
The bootstrapped super-admin (`isRoot`), seeded from
`ROOT_ADMIN_EMAIL/PASSWORD/NAME` by
[`seedAndMigrate`](../files/server/scripts/seedAndMigrate.md). Root admins
receive live SSE audit notifications about other users' activity and back-fill
own ownerless records. Root always counts as admin.

### serverless vs local mode
Two deployment modes of the same Express `app`, switched by `isServerless()` =
`!!process.env.VERCEL`. Local: `app.listen`, dotenv, `app.config.json`,
`uploads/`. Serverless: `bootstrap()` per cold start, `trust proxy`,
`AppConfig` singleton, R2 storage, `JobSession` mirror. See
[`../architecture/overview.md §2`](../architecture/overview.md) and
[`utils/appConfig`](../files/server/utils/appConfig.md).

### single-source versioning
The rule that version ordering, "Latest"/"Unreleased" flags, and version lists
are computed in **one place** — [`lib/versions`](../files/client/lib/versions.md)
+ [`useVersions`](../files/client/hooks/useVersions.md) +
[`VersionBadge`](../files/client/components/versions/VersionBadge.md) — never
re-derived from activity label strings. (See user memory
`versioning-single-source`.)

### SSE streaming job (runStreamJob)
The uniform pattern for long-running work (WP.org import, bulk delete, media
purge, changelog generation): the controller calls
[`runStreamJob`](../files/server/utils/sseStream.md), which opens an SSE stream,
registers a cancellable session, polls for cross-instance cancels every 2s, and
emits `session`/`progress`/`complete`/`error` events. Client side: `jobStream`
service + `jobs/` mini-players. Auth via `requireAuthSSE`.

### SVN metadata (WP.org)
Version tags, per-version release notes, and `trunk/readme.txt` pulled from
`plugins.svn.wordpress.org` via WebDAV `PROPFIND`/`REPORT`, part of the WP.org
import pipeline. [`ProductService`](../files/server/services/ProductService.md),
[`WpStatsService`](../files/server/services/WpStatsService.md).

### Version
A product version/release (manual or GitHub-synced): `label`, `status`
(released/unreleased), `releasedAt`, `source` (manual/github), `externalId`.
GitHub sync is idempotent via a unique partial index
`{productId, source, externalId}`. Model
[`Version`](../files/server/models/Version.md); service
[`VersionService`](../files/server/services/VersionService.md); component
[`VersionManager`](../files/client/components/versions/VersionManager.md).

### WP.org import
The SSE pipeline that imports a WordPress.org plugin's metadata, readme, version
tags, and changelog into a Product — using the plugin info API 1.2 and SVN.
Emits progress, dedupes via `importSourceKey`, and flags uncertain entries
`needsReview`. [`ProductService`](../files/server/services/ProductService.md);
dialog [`WpOrgImportDialog`](../files/client/components/products/WpOrgImportDialog.md);
persistent [`WpImportMiniPlayer`](../files/client/components/products/WpImportMiniPlayer.md);
context [`WpImportContext`](../files/client/contexts/WpImportContext.md).

### write-only secrets
Secrets (R2 `secretAccessKey`, Ollama cloud key) are never returned to the
client; the UI shows a `*Set` boolean and only sends a new value when the user
enters one. R2 secrets are also sealed at rest (`crypto.sealSecret`). See
[`Settings`](../files/client/pages/Settings.md),
[`utils/crypto`](../files/server/utils/crypto.md),
[`utils/appConfig`](../files/server/utils/appConfig.md).
