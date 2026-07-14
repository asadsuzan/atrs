# `server/src/services/ProductService.ts`
**Purpose:** CRUD + ownership-scoped product management, plus the full WordPress.org import pipeline (author/slug lookup, SVN version + readme sync, cascade delete).
**Language / Size:** TypeScript / 41790 bytes

## Exports
- `IMPORTED_CHANGELOG_DESC` (const, module-private — not exported; used internally).
- `type ImportProgress` — SSE progress event shape: `{ type: 'info'|'success'|'warn'|'error'; slug?; step; message; pluginIndex?; totalPlugins? }`.
- `class ProductService` — the service (default consumer: ProductController).

## Imports (Internal / External)
Internal:
- `../repositories/ProductRepository` (data access)
- `../models/Product` (IProduct, Product), `../models/Activity` (Activity), `../models/Version` (Version), `../models/ProductMarketing` (ProductMarketing)
- `../utils/slug` (baseSlug, disambiguateSlug)
- `./AuditLogService`, `./ActivityService`, `./ProductMarketingService`
- `../utils/fileUtils` (deleteMediaFiles)
- `../utils/ownership` (scopeFilter, assertOwner)
- `../utils/pagination` (parseLimit, parsePage)
- `../utils/httpError` (createHttpError)
- `../utils/sanitize` (escapeRegex)
- `../utils/readmeChangelog` (parseReadmeChangelog)
- `../types/auth` (AuthUser type)

External: global `fetch` (Node), Mongoose model statics (find, aggregate, insertMany, bulkWrite, updateMany, startSession/withTransaction), WordPress.org REST + SVN (WebDAV) over HTTP.

## Functions / Methods
- **constructor()** — instantiates `ProductRepository`.
- **uniqueSlugForOwner(name, ownerId, excludeId?): Promise<string>** (private) — builds a slug unique within an owner. Steps: baseSlug(name); regex filter `^base(-\d+)?$` scoped to ownerId (excluding excludeId on update); `Product.find(...).distinct('slug')` → Set of taken slugs; `disambiguateSlug`. DB read only.
- **createProduct(data, user): Promise<IProduct>** — creates a product with a retry loop (4 attempts) because uniqueSlugForOwner is read-then-write and can race the `{ownerId,slug}` unique index. On Mongo error code 11000 it retries (recomputing slug); other errors rethrown. On success writes audit log CREATE/PRODUCT. After 4 failures throws 409. Side effects: DB write, audit log.
- **getProducts(query, user): Promise<any>** — owner-scoped list via `scopeFilter(user)`; optional `search` (regex on name, escaped), `category`, `status`; admins may add `ownerId`. Pagination via parsePage/parseLimit; delegates to `repository.findAll`.
- **getProductById(id, user): Promise<IProduct|null>** — findById; 404 if missing; `assertOwner` (non-admins 404 on others' products).
- **getPublicProducts(): Promise<any[]>** — public, no auth. `Product.find({status:'active', listedInDirectory:{$ne:false}})` (`$ne:false` keeps legacy products lacking the field), projected minimal safe fields, sorted by name; maps to public DTO with booleans for publicChangelogEnabled/publicIssuesEnabled.
- **getStaleProducts(user, days): Promise<{days,products}>** — products with no changelog activity within `days`. Steps: cutoff = now − days; owner-scoped Product.find; Activity.aggregate `$group` max activityDate per productId; map lastActivityAt; filter to null-or-older-than-cutoff; sort most-stale-first (null "never" to top). DB reads only.
- **updateProduct(id, data, user): Promise<IProduct|null>** — 404 if missing; 403 if not admin and not owner; deletes `data.ownerId` (ownership not editable); recomputes slug if name changed (excluding self); repository.update; audit UPDATE.
- **bulkDeleteProducts(ids, user): Promise<{deleted,errors}>** — loops deleteProduct per id, tallying deleted count and per-id error messages.
- **fetchWpOrgPlugins(username): Promise<any[]>** — HTTP GET WordPress.org `query_plugins` API (action=query_plugins, request[author]=username, per_page=100, fields icons/banners/tags/short_description/versions). Throws if `!response.ok`. Returns `data.plugins || []`.
- **fetchWpOrgPluginBySlug(slug): Promise<any|null>** — HTTP GET `plugin_information` API by slug. Returns null on !ok or when payload has `error` or missing `slug`.
- **fetchSvnVersionData(slug): Promise<{label,releasedAt,author,notes}[]>** (private) — see Important algorithms. Fetches version tags + release notes from `plugins.svn.wordpress.org` via WebDAV (PROPFIND + REPORT). Returns [] on any failure (all wrapped in try/catch, warnings logged).
- **fetchSvnReadme(slug): Promise<string>** (private) — HTTP GET `plugins.svn.wordpress.org/<slug>/trunk/readme.txt`; returns '' on !ok or throw.
- **wpOrgPreview(username, user): Promise<any[]>** — fetchWpOrgPlugins then flags `alreadyImported` (Product.find owner+wpOrgSlug distinct), classifies block vs plugin by tags, returns preview DTOs.
- **wpOrgPreviewBySlug(slugs, user): Promise<any[]>** — resolves each slug via fetchWpOrgPluginBySlug (Promise.all, drops unknown), then same preview shape as wpOrgPreview.
- **importFromWpOrg(username, slugs, user, onProgress?, isCancelled?): Promise<any>** — THE import pipeline. See Important algorithms. Emits ImportProgress via onProgress; cancellation checked between plugins; returns `{created, updated, errors, cancelled, rolledBack}`.
- **deleteProduct(id, user): Promise<IProduct|null>** — 404/403 guards; tries `deleteProductTransactional`; if `isTransactionUnsupported` falls back to `deleteProductSequential`; other errors rethrown.
- **isTransactionUnsupported(err): boolean** (private) — true when standalone mongod (codeName IllegalOperation, code 20/263, or messages about replica set / transactions not supported / retryable writes).
- **deleteProductTransactional(id, product, user): Promise<IProduct|null>** (private) — collects child media URLs first, then a Mongoose session `withTransaction` deleting Activity, Version, ProductMarketing, then the Product; after commit runs afterDeleteCleanup + deleteMediaFiles (filesystem can't be in the transaction).
- **getCascadeCounts(productId): Promise<{activities,versions,marketing}>** — parallel countDocuments for progress reporting.
- **collectChildMediaUrls(productId): Promise<string[]>** (private) — gathers mediaUrl/mediaUrls from activities (+ items) and marketing (trailerVideo/tutorialVideo/thumbnailImage/keyFeatures/screenshots/demos), filtered truthy.
- **deleteProductSequential(id, user): Promise<IProduct|null>** (private) — non-transactional cascade for standalone mongod: deletes children first via ActivityService.bulkDeleteActivities + ProductMarketingService.deleteMarketingData + Version.deleteMany; accumulates errors and THROWS if any (product intentionally not deleted so it isn't half-done). Then repository.delete + audit DELETE + deleteMediaFiles([icon,banner]).
- **afterDeleteCleanup(id, product, user): Promise<void>** (private) — audit DELETE + deleteMediaFiles([icon,banner]) after a transactional commit.

## Data structures / Types / Constants
- `IMPORTED_CHANGELOG_DESC` = 'Imported from WordPress.org changelog — add details.' — placeholder shortDescription for readme-imported changelog entries.
- `ImportProgress` (exported type, SSE event).
- Block-classification tag set: `['block','blocks','gutenberg','gutenberg-blocks','gutenberg-block']` (lowercased) → category 'block' else 'plugin'.

## Important algorithms

### WordPress.org import pipeline — `importFromWpOrg`
Inputs: `username` (optional), `slugs[]`, `user`, `onProgress` callback, `isCancelled` predicate.
1. Resolve the plugin list. If `username` present: `fetchWpOrgPlugins(username)` (query_plugins API), then keep only plugins whose slug is in `slugs`. Else (slug-only): `fetchWpOrgPluginBySlug` for each slug in parallel, drop unknowns, emit `warn` for missing ones. Emits `fetch-api` info events.
2. Loop each plugin (index/total tracked in `pctx`). Cancellation checked at loop top; if cancelled sets `wasCancelled` and breaks (the in-flight plugin, if any, always finishes — no half-written product).
3. Classify block vs plugin from `Object.keys(plugin.tags)`.
4. In parallel: `fetchSvnVersionData(slug)` (SVN WebDAV) and `fetchSvnReadme(slug)`. Emit `fetch-svn` progress.
5. Build `wpData` (name, description=short_description, category, wpOrgSlug, icon (icons 2x||1x), banner (banners high||low), wpReadme=readme).
6. Upsert product: `Product.findOne({ownerId, wpOrgSlug})`. If exists → `repository.update` + audit UPDATE + push to `updated`. Else → `createProduct({...wpData, githubUrl: wordpress.org/plugins/<slug>})` + push to `created`. Emit `db-sync`.
7. Version sync (if product and tracTags>0): load existing Version docs by label. For each SVN tag: if new → push insert doc (status 'released', releasedAt, author, notes). If existing → reconcile: flip 'unreleased'→'released', backfill missing releasedAt/notes/author. `Version.insertMany({ordered:false})` + `Version.bulkWrite`. Emit `version-sync`.
8. Changelog-entry reconciliation: for existing versions whose label is in the released set, find Activities still tagged 'unreleased', `$pull 'unreleased'` then `$addToSet 'released'` (preserves other tags).
9. Readme changelog parse (if product and readme): `parseReadmeChangelog(readme)` → blocks of items. Build dedupe key set from existing activities using `importSourceKey` AND legacy `version|normalizedTitle`. For each parsed item not already present, build an Activity doc (type, title, shortDescription=IMPORTED_CHANGELOG_DESC, tags ['released'], versionId if matched, activityDate, importSourceKey=`version|title`, needsReview when confidence !== 'high', importConfidence, reviewReason 'uncertain-type').
10. `Activity.insertMany({ordered:false})`; tolerate E11000 (unique `{productId, importSourceKey}` index) — count dupes as skipped rather than fail. Emit `changelog`. Any changelog error is caught and downgraded to a warn (never fails the whole import).
11. Emit `done` per plugin; on per-plugin exception push to `errors` and emit `error`.
12. If `wasCancelled`: roll back — delete every product in `created` (cascade via deleteProduct), leaving `updated` products intact; emit rollback/summary events; return `{created:[], updated, errors, cancelled:true, rolledBack}`.
13. Else emit summary and return `{created, updated, errors, cancelled:false, rolledBack:0}`.

### SVN version metadata fetch — `fetchSvnVersionData`
1. PROPFIND `plugins.svn.wordpress.org/<slug>/tags/` with `Depth:1`, requesting version-name/creator-displayname/creationdate; User-Agent 'SVN/1.9.5 ATRS/1.0'. Bypasses WAF blocks on Trac.
2. Parse XML `<D:response>` blocks by regex → each tag's href, version-name (revision), creator, creationdate. Skip the tags/ root href.
3. For unique revisions, in parallel batches of 10, POST REPORT (svn:log-report start=end=rev) to fetch each revision's `<D:comment>` (release notes) into a Map.
4. Map to `{label, releasedAt (Date from creationdate), author (creator), notes (comment)}`. All errors caught → returns [] or partial with warnings.

## Relationships
- Called by: ProductController (and the WP import SSE route via onProgress/isCancelled, wired through ImportSessionManager).
- Models: Product, Activity, Version, ProductMarketing (Mongoose).
- Services used: AuditLogService, ActivityService (sequential cascade), ProductMarketingService (sequential cascade).
- Utils: slug, ownership, pagination, httpError, sanitize, readmeChangelog, fileUtils.
- External APIs: WordPress.org plugins info API 1.2 (query_plugins + plugin_information); WordPress.org SVN (plugins.svn.wordpress.org) via WebDAV PROPFIND/REPORT + trunk readme.txt.

## Edge cases & known limitations
- Slug generation is read-then-write; concurrent creates rely on the 4-attempt retry + unique index (createProduct) — beyond 4 tries returns 409.
- Cancellation only occurs between plugins; the currently processing plugin always completes.
- Rollback only removes newly-created products; updated (pre-existing) products are not reverted.
- SVN fetch failures degrade to no version data (`[]`) rather than failing import; changelog parse errors are swallowed to a warn.
- Transactional cascade requires a replica set; standalone mongod falls back to a sequential cascade that throws (does not delete the product) if any child delete fails.
- Public directory query treats missing `listedInDirectory` as listed (legacy compatibility).
