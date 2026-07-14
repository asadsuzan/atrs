# ATRS Server REST API Reference

Authoritative reference for the ATRS Express API. Base URL: all routes are under `/api` (mounted in `server/src/app.ts`). Sourced from `docs/files/server/routes/**`, `docs/files/server/controllers/**`, `docs/files/server/schemas/**`, `app.md`, and `middlewares/auth.md`, cross-checked against `server/src/app.ts` and `server/src/routes/*`.

---

## 1. Cross-cutting concerns

### 1.1 Middleware order (global, from `app.ts`)
1. `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })`
2. `cors({ origin: <allow-list fn>, credentials: true })`
3. `app.use('/api', apiLimiter)` — global rate limit scoped to `/api`
4. `customLogger` — HTTP request logging
5. `express.json({ limit: '5mb' })`
6. `express.urlencoded({ extended: true, limit: '5mb' })`
7. `app.use('/uploads', express.static(...))` — static uploads (local-storage provider only; on serverless media lives in Cloudflare R2)
8. Route mounts (see domains below)
9. `errorHandler` — last; turns forwarded `ZodError` into `400 Validation Error`

Body size limit is **5 MB** for JSON and urlencoded payloads. Trust proxy is set (`trust proxy = 1`) only on serverless so `X-Forwarded-For` is honored by the rate limiters.

### 1.2 Rate limiters
| Limiter | Scope | Window | Max / IP | Notes |
|---------|-------|--------|----------|-------|
| `apiLimiter` | all `/api/*` | 15 min | 1000 | `standardHeaders: true`, `legacyHeaders: false`, custom message |
| `authLimiter` | `POST /api/auth/register`, `/login`, `/check-email`, `/password-reset-request` | 15 min | 10 | `skipSuccessfulRequests: true` (only failed attempts count) |
| `reportLimiter` | `POST /api/public/products/:id/issues` | 1 hour | 10 | Stacks on top of the global `apiLimiter` |

All limiters are cumulative; a request to a limited endpoint is counted by both `apiLimiter` and its route-specific limiter.

### 1.3 CORS allow-list
Origins come from `process.env.CLIENT_ORIGIN` (comma-separated) or fall back to `defaultOrigins`: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://192.168.0.199:5173`. The origin callback returns `(null, true)` when there is no `Origin` header or the origin is allow-listed, otherwise `(null, false)` — it never throws. Disallowed/`null` origins simply receive no CORS headers (this deliberately allows plain iframe form-navigation such as the readme-validator while still blocking cross-origin XHR reads). `credentials: true`.

### 1.4 Auth guard legend
| Guard | Meaning |
|-------|---------|
| **public** | No auth. No token required. |
| **requireAuth** | Valid `Authorization: Bearer <jwt>` required (HS256, alg-pinned). Attaches `req.user`. 401 if missing/invalid/expired. Token-in-header **only** (query strings leak). |
| **requireActive** | (Always paired with requireAuth.) Re-reads the user from DB each request: 401 if account no longer exists; 403 if `status !== 'active'`; 401 `Session expired` if the token was issued before the account's `passwordChangedAt`. Re-syncs role/name/email onto `req.user`. |
| **requireAdmin** | (Adds to requireAuth+requireActive.) 403 unless `req.user.role === 'admin'`. |
| **requireAuthSSE** | Same as requireAuth but also accepts the JWT via `?token=<jwt>` query param (because browser `EventSource` cannot set headers). Used **only** by SSE subscribe routes. |

JWT: HS256, `expiresIn = JWT_EXPIRES_IN || 7d`. Secret validated fail-fast at boot (`assertJwtSecretAtBoot`): missing secret is always fatal; a weak/short (<32 char) or placeholder secret is fatal in production, a warning otherwise.

### 1.5 Validation
Route-level `validate(schema)` (`middlewares/validate.ts`) parses `{ body, query, params }` with a Zod schema and writes the coerced/stripped values back onto the request; a `ZodError` is forwarded to `errorHandler` → `400`. Schema field details are in the per-domain tables and in `docs/files/server/schemas/**`. Where a route has no Zod schema, input hardening is done inside the controller (noted per endpoint).

### 1.6 SSE (Server-Sent Events) endpoints
All streaming endpoints respond `200` with `Content-Type: text/event-stream` and stream progress rather than a single JSON body. Most use the shared `runStreamJob` helper (`utils/sseStream.ts`), which: writes SSE headers + `: ok`, enables socket keep-alive, registers a cancellable session and emits a `session` event carrying the `sessionId`, forwards per-item progress events (`{ type: 'info'|'success'|'warn'|'error', step, message, itemIndex?, totalItems?, label? }`), then a final `complete` (or `error`) event. Two endpoints hand-roll their own SSE loop (WP.org import, notifications subscribe).

**Cancellation:** `runStreamJob` jobs can be cancelled via `POST /api/jobs/cancel` (`{ sessionId }`) or by the client disconnecting. Already-processed work is **not** rolled back (exception: WP.org import rolls back created products on cancel/disconnect).

Full list of SSE endpoints:

| Method + Path | Guard | Style | Cancellable |
|---------------|-------|-------|-------------|
| `POST /api/products/bulk-delete-stream` | requireAuth+requireActive | runStreamJob | yes (jobs/cancel) |
| `POST /api/products/import-from-wporg` | requireAuth+requireActive | hand-rolled SSE | yes (jobs/cancel, `/import-from-wporg/cancel`, or disconnect; rolls back created) |
| `POST /api/activities/bulk-delete-stream` | requireAuth+requireActive | runStreamJob | yes |
| `POST /api/media/purge-orphaned-stream` | requireAuth+requireActive+requireAdmin | runStreamJob | yes |
| `POST /api/users/:id/delete-stream` | requireAuth+requireActive+requireAdmin | runStreamJob (after JSON pre-flight) | yes |
| `POST /api/changelog-gen/generate` | requireAuth+requireActive | runStreamJob | yes |
| `GET /api/notifications/subscribe` | requireAuthSSE+requireActive | hand-rolled SSE (long-lived) | client disconnect only |

### 1.7 Mount map (from `app.ts`)
| Prefix | Guard at mount | Router |
|--------|----------------|--------|
| `/api/auth` | public (per-route guards) | authRoutes |
| `/api/tools` | public | readmeToolsRoutes |
| `/api/public` | public | publicRoutes |
| `/api/products` | requireAuth, requireActive | productRoutes |
| `/api/activities` | requireAuth, requireActive | activityRoutes |
| `/api/reports` | requireAuth, requireActive | reportRoutes |
| `/api/upload` | requireAuth, requireActive | uploadRoutes |
| `/api/media` | requireAuth, requireActive (+requireAdmin per-route) | mediaRoutes |
| `/api/audit-logs` | requireAuth, requireActive | auditLogRoutes |
| `/api/versions` | requireAuth, requireActive | versionRoutes |
| `/api/issues` | requireAuth, requireActive | issueRoutes |
| `/api/feature-requests` | requireAuth, requireActive | featureRequestRoutes |
| `/api/streak` | requireAuth, requireActive | streakRoutes |
| `/api/jobs` | requireAuth, requireActive | jobRoutes |
| `/api/github` | requireAuth, requireActive | githubRoutes |
| `/api/changelog-gen` | requireAuth, requireActive | changelogGenRoutes |
| `/api/ai` | requireAuth, requireActive | aiRoutes |
| `/api/notifications` | none at mount (per-route guards) | notificationRoutes |
| `/api/users` | requireAuth, requireActive, requireAdmin | userRoutes |
| `/api/config` | requireAuth, requireActive, requireAdmin | configRoutes |
| `/api/export` | requireAuth, requireActive, requireAdmin | inline (ExportController) |
| `/api/health` | public | inline |

**Common error responses (all domains):** `400` validation/guard failure, `401` unauthenticated / session expired, `403` inactive account or insufficient role, `404` not found (owner-scoped resources return 404 rather than 403 to avoid leaking existence), `500` unhandled (via `errorHandler`). Owner scoping is enforced in the service layer via `req.user`; resources belonging to other owners read as `404`.

---

## 2. Auth — `/api/auth`

Router mounted public; guards applied per-route. Controller: `AuthController` → `AuthService`.

| Method + Path | Guard | Validation | Handler | Success | Response shape | Notes |
|---------------|-------|------------|---------|---------|----------------|-------|
| `POST /register` | public + authLimiter | `registerSchema` (name 1–120, email, password 8–200) | `register` | 201 | `{ message, user }` (message advertises admin-approval gate) | Rate-limited |
| `POST /login` | public + authLimiter | `loginSchema` (email, password ≥1) | `login` | 200 | `{ token, user }` | Rate-limited |
| `GET /me` | requireAuth+requireActive | — | `me` | 200 | user | |
| `PATCH /me` | requireAuth+requireActive | `updateMeSchema` (name 1–120 opt, jobTitle ≤120 opt) | `updateMe` | 200 | updated user | |
| `POST /check-email` | public + authLimiter | `emailOnlySchema` (email) | `checkEmail` | 200 | account-lookup result | Step 1 of forgot-password flow; rate-limited |
| `POST /password-reset-request` | public + authLimiter | `emailOnlySchema` (email) | `requestPasswordReset` | 200 | ack | Step 2; records request + notifies admins; rate-limited |
| `POST /change-password` | requireAuth+requireActive | `changePasswordSchema` (currentPassword ≥1, newPassword 8–200) | `changePassword` | 200 | ack | Also serves forced one-time-password change after admin reset; invalidates prior tokens |

---

## 3. Products — `/api/products`

Guard at mount: requireAuth + requireActive. Controllers: `ProductController`, `ProductMarketingController` (class instance), `ReleaseController`, `FsController`. Literal routes are declared before `/:id`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /` | `createProductSchema` (name req; category enum plugin/block/theme/standalone req; githubUrl url or ''; status enum; icon/banner/wpOrgSlug/wpReadme/repoPath opt) | `createProduct` | 201 | product | |
| `GET /` | — | `getProducts` | 200 | products (owner-scoped; query filters) | |
| `DELETE /bulk` | — (inline guard) | `bulkDeleteProducts` | 200 | delete result | `400` if `ids` not a non-empty array |
| `POST /bulk-delete-stream` | — (guards internally) | `bulkDeleteProductsStream` | 200 SSE | per-item events + `{ deleted, errors, cancelled, total }` | **SSE** (runStreamJob); emits cascade counts (activities/versions/marketing) per id; `400` if `ids` empty before stream; cancellable |
| `GET /stale` | — | `getStaleProducts` | 200 | stale products (threshold = `getStaleAlertDays()`) | |
| `GET /browse-dirs` | — (query `path`, no Zod) | `FsController.browseDirs` | 200 | `{ path, parent, sep, isRoot, home, drives:[], dirs:[{name,path}] }` | Jailed to repo-browse root; `400` path not found/not a dir, `403` permission denied |
| `GET /wporg-preview` | — (query `username`) | `wpOrgPreview` | 200 | preview | `400` if `username` missing |
| `GET /wporg-preview-by-slug` | — (query `slugs`, split on whitespace/comma) | `wpOrgPreviewBySlug` | 200 | preview | `400` if slug list empty |
| `POST /import-from-wporg` | — (body `username`, `slugs`) | `importFromWpOrg` | 200 SSE | `session` event, `progress` events, `complete` `{ created, updated, errors, cancelled, rolledBack }` or `error` | **SSE** (hand-rolled); `400` if `slugs` empty before stream; cancellable via `/import-from-wporg/cancel`, jobs/cancel, or disconnect (rolls back created) |
| `POST /import-from-wporg/cancel` | — (inline body guard) | `cancelWpOrgImport` | 200 | `{ message:'Cancellation requested' }` | `400` if `sessionId` missing/not string; `404` if session not found |
| `GET /:id` | `idParamSchema` | `getProductById` | 200 | product | `404` if not found |
| `GET /:id/release` | `idParamSchema` | `ReleaseController.getProductRelease` | 200 | full release payload (incl. export formats) | `404` if not found |
| `GET /:id/wp-stats` | `idParamSchema` | `getProductWpStats` | 200 | WP.org stats, or `{ slug:null }` if no `wpOrgSlug` | `404` if product missing |
| `PATCH /:id` | `updateProductSchema` (all fields optional + publicChangelogEnabled/publicIssuesEnabled/listedInDirectory booleans) | `updateProduct` | 200 | updated product | `404` if not found |
| `DELETE /:id` | `idParamSchema` | `deleteProduct` | 200 | `{ message:'Product deleted successfully' }` | `404` if not found |
| `GET /:id/marketing` | `idParamSchema` | `marketingController.getMarketingData` | 200 | `{ status:'success', data }` — empty template (not 404) when none exists | Envelope response shape |
| `PUT /:id/marketing` | `upsertMarketingSchema` (all optional, `.passthrough()`; keyFeatures/allFeatures/demos/screenshots/faqs arrays) | `marketingController.upsertMarketingData` | 200 | `{ status:'success', data }` | |
| `DELETE /:id/marketing` | `idParamSchema` | `marketingController.deleteMarketingData` | 200 | `{ status:'success', message:'Marketing data deleted successfully' }` | `404 { status:'error', message:'Marketing data not found' }` if none |

`params.id` on product schemas is a plain string (not ObjectId-validated); marketing `params.id` is ObjectId.

---

## 4. Activities (changelog entries) — `/api/activities`

Guard at mount: requireAuth + requireActive. Controller: `ActivityController` → `ActivityService`. Bulk/literal routes precede `/:id`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /bulk-update` | `bulkUpdateActivitiesSchema` (`.strict()`: ids[objectId] min1; update strict obj with type/tier/priority/versionId/tags/addTags/removeTags/activityDate/needsReview) | `bulkUpdateActivities` | 200 | `{ message:'Updated N activities', count }` | `.strict()` blocks NoSQL operator injection; `400` if ids empty |
| `DELETE /bulk-delete` | `bulkDeleteActivitiesSchema` (ids[objectId] min1) | `bulkDeleteActivities` | 200 | `{ message:'Deleted N activities', count }` | `400` if ids empty |
| `POST /bulk-delete-stream` | — (guards internally) | `bulkDeleteActivitiesStream` | 200 SSE | per-item events + `{ deleted, errors, cancelled, total }` | **SSE** (runStreamJob); `400 { message:'ids must be a non-empty array' }` before stream; cancellable |
| `POST /` | `createActivitySchema` (productId objectId, type enum feature/improvement/bug-fix, title, shortDescription, activityDate req; tier/priority/versionId/referenceUrl/relatedIssueIds/displayOrder/tags/media*/items/assigneeIds/hours opt) | `createActivity` | 201 | activity | |
| `GET /` | — | `getActivities` | 200 | activities (owner-scoped; query filters) | |
| `GET /:id` | `idParamSchema` | `getActivityById` | 200 | activity | `404 { message:'Activity not found' }` |
| `PATCH /:id` | `updateActivitySchema` (all create fields optional + `needsReview`) | `updateActivity` | 200 | updated activity | `404` if not found |
| `PATCH /:id/reorder` | `idParamSchema` (+ body `displayOrder`) | `reorderActivity` | 200 | reordered activity | `400` if `displayOrder` missing; `404` if not found |
| `DELETE /:id` | `idParamSchema` | `deleteActivity` | 200 | `{ message:'Activity deleted successfully' }` | `404` if not found |

---

## 5. Versions — `/api/versions`

Guard at mount: requireAuth + requireActive. Controller: `VersionController` → `VersionService`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /` | `createVersionSchema` (productId objectId req; label min1 req; notes/status enum released/unreleased/releasedAt/author opt) | `createVersion` | 201 | version | |
| `GET /` | — (query `productId` opt) | `getVersions` | 200 | versions (all owner products if no productId; product populated) | |
| `GET /:id` | `idParamSchema` | `getVersionById` | 200 | version | `404` if not found |
| `PATCH /:id` | `updateVersionSchema` (productId/label optional) | `updateVersion` | 200 | updated version | `404` if not found |
| `DELETE /:id` | `idParamSchema` | `deleteVersion` | 200 | `{ message:'Version deleted successfully' }` | `404` if not found |

---

## 6. Issues — `/api/issues`

Guard at mount: requireAuth + requireActive. Controller: `IssueController` → `IssueService`. `/pending-review` precedes `/:id`. (Public issue endpoints are in §17.)

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /` | `createIssueSchema` (productId objectId, title min1 req; description/status/severity/reporter/versionLabel/mediaUrls/dates/assigneeIds/hours opt) | `createIssue` | 201 | issue | |
| `GET /` | — (query `productId` opt) | `getIssues` | 200 | issues (all owner products if no productId; product populated) | |
| `GET /pending-review` | — | `getPendingReviewIssues` | 200 | issues awaiting owner review | |
| `GET /:id` | `idParamSchema` | `getIssueById` | 200 | issue | `404` if not found |
| `PATCH /:id` | `updateIssueSchema` (title/productId optional + `needsReview`) | `updateIssue` | 200 | updated issue | `404` if not found |
| `DELETE /:id` | `idParamSchema` | `deleteIssue` | 200 | `{ message:'Issue deleted successfully' }` | `404` if not found |

---

## 7. Feature requests — `/api/feature-requests`

In-app feature requests for the ATRS platform itself. Guard at mount: requireAuth + requireActive. Controller: `FeatureRequestController` → `FeatureRequestService`. Admin-only triage fields enforced in the service.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /` | `createFeatureRequestSchema` (title trim 3–200 req; description ≤5000 opt) | `createFeatureRequest` | 201 | feature request | |
| `GET /` | — | `getFeatureRequests` | 200 | requests array | |
| `PATCH /:id` | `updateFeatureRequestSchema` (title/description opt; status enum pending/planned/in-progress/done/declined; adminNote ≤2000 — status/adminNote admin-only in service) | `updateFeatureRequest` | 200 | updated request | `404` if not found |
| `DELETE /:id` | `idParamSchema` | `deleteFeatureRequest` | 200 | `{ message:'Feature request deleted successfully' }` | `404` if not found |

---

## 8. Reports — `/api/reports`

Guard at mount: requireAuth + requireActive. Controller: `ReportController` → `ReportService`. No Zod; query hardening done in controller. All owner/product-scoped; `ownerId` is an optional cross-owner (admin) scoping param.

| Method + Path | Query params | Handler | Success | Notes |
|---------------|--------------|---------|---------|-------|
| `GET /monthly` | `month`,`year` OR `startDate`,`endDate`; `productId`,`ownerId` opt | `getMonthlyReport` | 200 | Custom date range wins if both dates present; else `month` (1–12) + `year` (2000–2100) required → `400` if missing/out of range |
| `GET /trend` | `months` (clamped 1–60, default 6), `productId` | `getTrend` | 200 | Invalid `months` silently falls back to 6 |
| `GET /annual` | `year` (2000–2100, else current year), `productId`,`ownerId` | `getAnnual` | 200 | Invalid `year` silently falls back to current year |

---

## 9. Streak (daily logging) — `/api/streak`

Personal private work journal + streak stats. Guard at mount: requireAuth + requireActive. Controller: `StreakController` → `StreakService`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `GET /` | — (query `tzOffset` int, default 0) | `getLoggingStreak` | 200 | streak stats | Timezone-aware (client `getTimezoneOffset()`) |
| `POST /log` | `createDailyLogSchema` (note trim 3–500) | `createDailyLog` | 201 | log entry | Logs today |
| `DELETE /log/:id` | `idParamSchema` | `deleteDailyLog` | 200 | `{ message:'Note deleted' }` | `404 { message:'Note not found' }` |

---

## 10. Media / Upload

### 10.1 Upload — `/api/upload`
Guard at mount: requireAuth + requireActive. No controller; logic inline in router.

| Method + Path | Middleware | Handler | Success | Notes |
|---------------|------------|---------|---------|-------|
| `POST /` | multer `single('file')` (disk or memory storage chosen per request) | inline | 200 | Allow-list: MIME ∈ {png,jpeg,gif,webp,mp4,webm,ogg} AND ext ∈ {.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.ogg}; **SVG excluded** (XSS). Max 25 MB. Magic-byte sniff (`sniffMedia`) after allow-list. R2 backend if `isR2Active()` else disk; serverless+R2 inactive → `400`. Multer/size errors → `400`; R2 upload failure → `502` |

### 10.2 Media library — `/api/media`
Guard at mount: requireAuth + requireActive. Destructive ops additionally require **requireAdmin** (per-route). Controller: `MediaController` → `MediaService`.

| Method + Path | Guard | Handler | Success | Response shape | Notes |
|---------------|-------|---------|---------|----------------|-------|
| `GET /` | requireAuth+requireActive | `getMediaList` | 200 | media list | Any authenticated+active user |
| `DELETE /:filename` | +requireAdmin | `deleteMedia` | 200 | delete result | `:filename` is a media object name (not Mongo id); `?force=true` to delete referenced files; `400` if referenced and not forced |
| `POST /bulk-delete` | +requireAdmin | `bulkDeleteMedia` | 200 | `{ success:true, deleted:[], failed:[{filename,error}] }` | `400` if `filenames` empty; collects partial failures; body `force` default false |
| `POST /purge-orphaned` | +requireAdmin | `purgeOrphaned` | 200 | `{ success:true, count, deletedFiles }` | Orphan detection is global across owners |
| `POST /purge-orphaned-stream` | +requireAdmin | `purgeOrphanedStream` | 200 SSE | scan progress + per-item events + `{ deleted, errors, cancelled, total }` | **SSE** (runStreamJob); cancellable |

---

## 11. GitHub — `/api/github`

Guard at mount: requireAuth + requireActive. Controller: `GitHubController` → `GitHubService`. Token stored encrypted, scoped to the calling user.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `GET /status` | — | `getStatus` | 200 | connection status | |
| `POST /connect` | `connectGithubSchema` (token min1) | `connect` | 200 | status | Validates + stores encrypted |
| `DELETE /connect` | — | `disconnect` | 200 | `{ connected:false, login:null, connectedAt:null }` | |
| `POST /products/:id/sync-releases` | `syncReleasesSchema` (params.id objectId) | `syncReleases` | 200 | sync result | Writes GitHub Releases into Versions (source 'github') |

---

## 12. Changelog generation (AI) — `/api/changelog-gen`

Guard at mount: requireAuth + requireActive. Controller: `ChangelogGenController` → `ChangelogGenService.runPipeline`. Ownership + repo-path jail enforced before any git/subprocess access.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /generate` | `generateChangelogSchema` (productId objectId, rangeType enum tags/commit/date/working req; from/to gitRef; model ≤120; createReviewEntries bool. `.refine`: `from` required unless rangeType=working) | `generate` | 200 SSE | pipeline progress + `complete`/`error` | **SSE** (runStreamJob); loads product, `assertOwner`, requires `repoPath` (`400`), `assertRepoPathAllowed`; cancellable. gitRef refined against argument injection (no leading `-`, no control chars) |
| `GET /tags/:productId` | inline `{ params: { productId: objectId } }` | `getTags` | 200 | git tag array | `git tag --sort=-creatordate` (cwd=repoPath, 10s); `400 'No repository path'` if none; returns `[]` on git failure |
| `GET /models` | — | `getModels` | 200 | Ollama model name array | Returns `[]` on non-ok/thrown error |

---

## 13. AI suggest — `/api/ai`

Guard at mount: requireAuth + requireActive. Controller: `AiController` → `AiService`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `POST /suggest` | `aiSuggestSchema` (task enum title/description req; entity 1–60 req; context record opt; title ≤300 opt) | `suggest` | 200 | `{ titles }` (task=title) or `{ description }` (task=description) | Provider/model failure → `502 { message }` (not `next`) |

---

## 14. Notifications — `/api/notifications`

Mounted **without** guards; each route applies its own. Controller: `NotificationController` (direct Mongoose access, every query scoped by `userId`). SSE + config-read endpoints defined inline in the router.

| Method + Path | Guard | Handler | Success | Response shape | Notes |
|---------------|-------|---------|---------|----------------|-------|
| `GET /` | requireAuth+requireActive | `getMyNotifications` | 200 | up to 50 most recent (sorted `createdAt` desc) | |
| `PATCH /read-all` | requireAuth+requireActive | `markAllAsRead` | 200 | `{ message:'All notifications marked as read' }` | Declared before `/:id/read` |
| `PATCH /:id/read` | requireAuth+requireActive | `markAsRead` | 200 | updated notification | `404` if not found/not owned |
| `DELETE /:id` | requireAuth+requireActive | `deleteNotification` | 200 | `{ message:'Notification deleted successfully' }` | `404` if not found/not owned |
| `GET /subscribe` | **requireAuthSSE**+requireActive | inline → `notificationManager.addClient` | 200 SSE | live notification stream | **SSE** (hand-rolled); JWT via header **or** `?token=<jwt>`; unsubscribes on `req.on('close')` |
| `GET /nav-settings` | requireAuth+requireActive | inline → `readAppConfig()` | 200 | nav settings | Defensively returns defaults on error |
| `GET /branding` | requireAuth+requireActive | inline → `readAppConfig()` | 200 | branding config | Defensively returns defaults on error |
| `GET /sounds` | requireAuth+requireActive | inline → `readAppConfig()` | 200 | sound settings | Defensively returns defaults on error |

---

## 15. Users (admin) — `/api/users`

Guard at mount: requireAuth + requireActive + **requireAdmin** (entire router). Controller: `UserController` → `UserService`. No Zod; manual validation in controller.

| Method + Path | Handler | Success | Response shape | Notes |
|---------------|---------|---------|----------------|-------|
| `GET /` | `listUsers` | 200 | users (query filters) | |
| `PATCH /:id/approve` | `approveUser` | 200 | updated user | |
| `PATCH /:id/suspend` | `suspendUser` | 200 | updated user | |
| `PATCH /:id/reactivate` | `reactivateUser` | 200 | updated user | |
| `PATCH /:id/role` | `setUserRole` | 200 | updated user | Body `role` coerced: `'admin'` else `'user'` |
| `POST /:id/reset-password` | `resetUserPassword` | 200 | ack | Body `password` string 8–200 (`400` otherwise) |
| `POST /:id/reassign` | `reassignOwnership` | 200 | result | Body `toUserId` |
| `POST /:id/delete-stream` | `deleteUserStream` | 200 SSE | cascade progress + `complete`/`error` | **SSE** (runStreamJob after JSON pre-flight); `404` if user missing, `403` if `isRoot` (root admin cannot be deleted); cancellable |
| `DELETE /:id` | `deleteUser` | 200 | ack | Optional `?reassignTo=<id>` reassigns ownership before delete |

---

## 16. Config (admin) — `/api/config`

Guard at mount: requireAuth + requireActive + **requireAdmin** (entire router). Controller: `ConfigController`. No Zod; extensive manual validation.

| Method + Path | Handler | Success | Response shape | Notes |
|---------------|---------|---------|----------------|-------|
| `GET /` | `getConfig` | 200 | effective config (falls back to `DEFAULT_APP_CONFIG`) | Write-only secrets returned as `''` + boolean flags (`secretAccessKeySet`, `ollamaCloudKeySet`) |
| `POST /` | `updateConfig` | 200 | `{ message, config }` | Validates server (port 1–65535, mongodbUri scheme), storage (provider enum + required R2 fields), branding (hex accentColor, logoUrl allow-list), navigation.mode, staleAlert.days (1–365) → `400` on failure. Secrets sealed at rest. Non-serverless: may rewrite `.env` and `process.exit(0)` in production |
| `POST /storage/test` | `testStorageConnection` | 200 | R2 round-trip result | Blank fields fall back to stored/env; write/read/delete round-trip via `testR2Connection` |

---

## 17. Public (no auth) — `/api/public`

Mounted public. Read-only directory + hosted changelog/issues pages, plus one rate-limited public write. Controllers: `ProductController`, `ReleaseController`, `IssueController`. Products opt in via `publicChangelogEnabled` / `publicIssuesEnabled` / `listedInDirectory`.

| Method + Path | Validation | Handler | Success | Response shape | Notes |
|---------------|------------|---------|---------|----------------|-------|
| `GET /products` | — | `ProductController.getPublicProducts` | 200 | `{ products }` | Bypasses owner scoping; backs `/explore` |
| `GET /changelog/:id` | — | `ReleaseController.getPublicChangelog` | 200 | `{ product, releases, unreleased }` (no export formats) | `404 'Changelog not found'` for malformed id, missing product, or `!publicChangelogEnabled` |
| `GET /issues/:id` | — | `IssueController.getPublicIssues` | 200 | `{ product:{id,name,slug,description,icon,githubUrl,wpOrgSlug}, issues }` | `404 'Issues not found'` for malformed id, missing product, or `!publicIssuesEnabled` |
| `POST /products/:id/issues` | reportLimiter + `publicReportIssueSchema` (title trim 3–200 req; description ≤5000; versionLabel ≤60; reporter ≤120; reporterEmail email or ''; `website` honeypot must be empty) | `IssueController.reportPublicIssue` | 201 | `{ ok:true }` | **Rate-limited** (reportLimiter 10/hr/IP). `404` for malformed id; honeypot: `website` truthy → silent `201 { ok:true }` (bot dropped). Created issues queued for owner review |

---

## 18. Tools (public) — `/api/tools`

Mounted public (an iframe navigation can't send the JWT header). Controller: `ReadmeToolsController`.

| Method + Path | Handler | Success | Notes |
|---------------|---------|---------|-------|
| `GET /readme-validator` | `readmeValidatorProxy` | upstream status | Reverse-proxies `wordpress.org/.../readme-validator/`; strips `X-Frame-Options`/COEP/COOP, sets `Content-Security-Policy: sandbox allow-forms allow-scripts allow-popups`; `Content-Type: text/html` |
| `POST /readme-validator` | `readmeValidatorProxy` | upstream status | Forwards form submission as `application/x-www-form-urlencoded` to the same handler |

---

## 19. Jobs — `/api/jobs`

Guard at mount: requireAuth + requireActive. No controller; inline handler → `importSessionManager.requestCancel`. Generic cancellation for any in-flight streaming job.

| Method + Path | Handler | Success | Response shape | Notes |
|---------------|---------|---------|----------------|-------|
| `POST /cancel` | inline | 200 | `{ message:'Cancellation requested' }` | Body `sessionId` (string) validated inline → `400` if missing/not string; `404` if session not found. Flags the session to halt at next item boundary; processed work **not** rolled back |

---

## 20. Audit logs — `/api/audit-logs`

Guard at mount: requireAuth + requireActive. Controller: `AuditLogController` → `AuditLogService`. No Zod.

| Method + Path | Query params | Handler | Success | Notes |
|---------------|--------------|---------|---------|-------|
| `GET /` | `page`,`entityType`,`action`,`startDate`,`search`,`userId`,`limit` | `getAuditLogs` | 200 | Dual-mode: any filter param present → filtered/paginated `getLogs`; otherwise `getRecentLogs(limit, default 20)` |

---

## 21. Export (admin) & Health

Both mounted directly in `app.ts` (not via route files).

| Method + Path | Guard | Handler | Success | Response shape | Notes |
|---------------|-------|---------|---------|----------------|-------|
| `GET /api/export` | requireAuth+requireActive+requireAdmin | `ExportController.exportAllData` | 200 | `{ exportDate, products, activities, marketing, versions }` | Global **unscoped** export (all records); `Content-Disposition: attachment; filename="atrs-export.json"`; pretty-printed JSON |
| `GET /api/health` | public | inline | 200 | `{ status:'ok', message:'ATRS API is running' }` | Liveness probe |
