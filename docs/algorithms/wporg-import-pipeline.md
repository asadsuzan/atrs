# WordPress.org Import Pipeline

**Source:** `server/src/services/ProductService.ts` — `ProductService.importFromWpOrg` (plus helpers `fetchWpOrgPlugins`, `fetchWpOrgPluginBySlug`, `fetchSvnVersionData`, `fetchSvnReadme`, `createProduct`, `uniqueSlugForOwner`).

## Purpose
Import (or re-sync) one or more WordPress.org plugins into ATRS as owned Products, hydrating each with SVN-derived versions and readme-derived changelog activities, while streaming progress over SSE and supporting cancellation with rollback of newly-created products.

## Inputs / Outputs
- **Inputs:** `username` (optional WP.org author), `slugs: string[]`, `user: AuthUser`, `onProgress?(ImportProgress)` callback (SSE), `isCancelled?()` predicate.
- **Output:** `{ created, updated, errors, cancelled, rolledBack }`.
- **Side effects:** DB writes to Product / Version / Activity, audit logs, outbound HTTP to WordPress.org REST + SVN.

## Algorithm
1. **Resolve the plugin list.**
   - If `username` is present: `fetchWpOrgPlugins(username)` (the `query_plugins` API, `per_page=100`), then keep only plugins whose slug is in `slugs`.
   - Else (slug-only): call `fetchWpOrgPluginBySlug` for each slug in parallel, drop unknowns, emit a `warn` for each missing one.
   - Emits `fetch-api` info events.
2. **Loop each plugin** (index/total carried in a `pctx` progress context). Cancellation is checked at the top of the loop; if cancelled, set `wasCancelled` and break. The in-flight plugin (if any) always finishes — no half-written product.
3. **Classify block vs plugin** from `Object.keys(plugin.tags)` against the block tag set (`block`, `blocks`, `gutenberg`, `gutenberg-blocks`, `gutenberg-block`, lowercased) → category `block` else `plugin`.
4. **Fetch SVN data in parallel:** `fetchSvnVersionData(slug)` (version tags + notes) and `fetchSvnReadme(slug)` (trunk readme.txt). Emit `fetch-svn` progress.
5. **Build `wpData`:** name, description (`short_description`), category, `wpOrgSlug`, icon (`icons['2x'] || icons['1x']`), banner (`banners.high || banners.low`), `wpReadme`.
6. **Upsert the product:** `Product.findOne({ ownerId, wpOrgSlug })`.
   - Exists → `repository.update` + audit UPDATE + push to `updated`.
   - New → `createProduct({ ...wpData, githubUrl: wordpress.org/plugins/<slug> })` + push to `created`.
   - Emit `db-sync`.
7. **Version sync** (if product and there are SVN tags): load existing Version docs by label. For each SVN tag:
   - New tag → queue an insert (status `released`, `releasedAt`, `author`, `notes`).
   - Existing tag → reconcile: flip `unreleased`→`released`, backfill missing `releasedAt`/`notes`/`author`.
   - Apply via `Version.insertMany({ ordered: false })` + `Version.bulkWrite`. Emit `version-sync`.
8. **Changelog-tag reconciliation:** for existing versions now in the released set, find Activities still tagged `unreleased`, `$pull 'unreleased'` then `$addToSet 'released'` (preserves other tags).
9. **Readme changelog parse** (if product and readme): `parseReadmeChangelog(readme)` → version blocks of items. Build a dedupe key set from existing activities using both `importSourceKey` and the legacy `version|normalizedTitle` form. For each parsed item not already present, build an Activity doc: `type`, `title`, `shortDescription = IMPORTED_CHANGELOG_DESC`, `tags: ['released']`, `versionId` if matched, `activityDate`, `importSourceKey = "version|title"`, `needsReview` when `confidence !== 'high'`, `importConfidence`, `reviewReason = 'uncertain-type'`.
10. **Insert activities:** `Activity.insertMany({ ordered: false })`; tolerate `E11000` on the unique `{ productId, importSourceKey }` index — count dupes as skipped instead of failing. Emit `changelog`. Any changelog error is caught and downgraded to a `warn` (never fails the whole import).
11. **Per-plugin finish:** emit `done`; on a per-plugin exception, push to `errors` and emit `error`.
12. **Cancellation rollback:** if `wasCancelled`, delete every product in `created` (cascade via `deleteProduct`), leaving `updated` products intact; emit rollback/summary events; return `{ created: [], updated, errors, cancelled: true, rolledBack }`.
13. **Success:** emit summary and return `{ created, updated, errors, cancelled: false, rolledBack: 0 }`.

## Slug uniqueness (used at creation)
`createProduct` calls `uniqueSlugForOwner`: `baseSlug(name)` → regex `^base(-\d+)?$` scoped to `ownerId` → `distinct('slug')` → `disambiguateSlug`. Because this is read-then-write, `createProduct` wraps it in a 4-attempt retry loop that recomputes the slug on Mongo error `11000` (races on the `{ ownerId, slug }` unique index); after 4 failures it throws 409.

## Complexity / performance
- One `query_plugins` call (author mode) or N parallel `plugin_information` calls (slug mode).
- Per plugin: 2 parallel SVN fetches + a bounded number of bulk DB ops (find/insertMany/bulkWrite/updateMany). Version-note fetching inside SVN runs in parallel batches of 10 (see `svn-version-metadata-fetch.md`).
- Unordered `insertMany` lets valid rows land even when some collide on the unique index.

## Edge cases & limitations
- Cancellation is only honored between plugins; the current plugin always completes.
- Rollback removes only newly-created products; pre-existing `updated` products are not reverted.
- SVN fetch failures degrade to no version data (`[]`) rather than failing the import; readme parse errors are swallowed to a `warn`.
- Slug generation is read-then-write; concurrent creates rely on the retry + unique index.
- Deletes during rollback route through the transactional/sequential cascade (replica-set aware).
