# WordPress.org Import

**Summary:** Import (or re-sync) one or more WordPress.org plugins into ATRS as owned Products, hydrating each with SVN-derived versions and readme-derived changelog activities, streamed over SSE with a live console, a minimizable "picture-in-picture" player, and cooperative cancellation that rolls back newly-created products.

## User-facing entry points
- **Import dialog** (`WpOrgImportDialog`) — reached from `AddProductDialog`'s "Import from WordPress.org" path and from `ProductsEmptyState`. Choose method (by author username or by plugin slug), fetch + multi-select plugins, then stream the import with a color-coded console and progress bar.
- **Mini-player** (`WpImportMiniPlayer`) — floating bottom-right dock view of an in-flight import; appears when the dialog is minimized so the import keeps streaming across page navigation.
- **Onboarding shortcut** — `WpImportContext.quickImport({ username?, slugs })` starts an import directly, skipping the manual select step.

## Client pieces
**Components**
- `components/products/WpOrgImportDialog.tsx` — a view over `WpImportContext`: method switch, plugin list with select-all + `alreadyImported` "Will update" badges, `toCreate`/`toUpdate` breakdown, and (during import) a live console + progress bar + Cancel-&-roll-back. Closing while importing **minimizes** instead of cancelling.
- `components/products/WpImportMiniPlayer.tsx` — minimized status line, progress bar, last log line, and a Cancel-&-roll-back button; wrapped in `DockBoard id="wp-import"`.

**Context** — `WpImportContext` (`useWpImport`), mounted **above the router** so an import survives navigation:
- Window state: `isOpen`/`isMinimized` with `open`/`close`/`minimize`/`restore`.
- Lookup: `mode` `'username' | 'slug'`; `previewMutation` → `wpOrgPreview`, `slugPreviewMutation` → `wpOrgPreviewBySlug`. Editing the input invalidates the preview (`fetched=false`, clears `plugins`). On preview success it pre-selects **all** returned slugs.
- Import stream `runImport(uname, slugList)`: a synchronous `importInFlightRef` overlap latch (prevents a double-run inserting duplicates), an `AbortController` (`abortRef`), and `importFromWpOrgStream(...)` with callbacks `onSession`/`onProgress`/`onComplete`/`onError`. Invalidates `['products']` on complete (even after rollback).
- Cancellation `requestCancel`: if a `sessionId` is known → `isCancelling` + `cancelImportSession(sessionId)` (keeps the stream open so rollback progress streams in); otherwise hard-`abort()` (relies on server rollback-on-disconnect). Fully closing mid-stream aborts + resets; the resulting `AbortError` is intentionally swallowed.

**Services** (`client/src/services/products.ts`)
- `wpOrgPreview(username)` → `GET /api/products/wporg-preview?username=`.
- `wpOrgPreviewBySlug(slugs[])` → `GET /api/products/wporg-preview-by-slug?slugs=csv`.
- `importFromWpOrgStream(username, slugs, handlers, signal?)` — **raw `fetch` POST** `/api/products/import-from-wporg` (Bearer header added manually), parses SSE blocks and dispatches `session`/`progress`/`complete`/`error`.
- `importFromWpOrg(...)` — non-streaming axios variant (per-call `timeout:120000`).
- `cancelImportSession(sessionId)` → `POST /api/products/import-from-wporg/cancel`.

No React Query cache key for the stream itself (it's imperative); `['products']` is invalidated on completion.

## Server pieces
Routes on `productRoutes.ts` (mounted `/api/products`, **requireAuth + requireActive**):
- `GET /wporg-preview` → `ProductController.wpOrgPreview` → `ProductService.wpOrgPreview` (400 if `username` missing).
- `GET /wporg-preview-by-slug` → `wpOrgPreviewBySlug` (slugs split on whitespace/comma; 400 if empty).
- `POST /import-from-wporg` → `ProductController.importFromWpOrg` — **hand-rolled SSE** (not `runStreamJob`): writes SSE headers + keep-alive, flushes `: ok`, creates a cancellable session (`importSessionManager.create(randomUUID(), user.id)`), emits the `session` event, polls `refreshFromStore` every 2s (serverless cross-instance cancel), treats `req.on('close')` as cancel, then calls `ProductService.importFromWpOrg(username, slugs, user, onProgress→'progress', isCancelled)` and emits `complete {created,updated,errors,cancelled,rolledBack}` or `error`. 400 if `slugs` empty before the stream opens.
- `POST /import-from-wporg/cancel` → `cancelWpOrgImport` → `importSessionManager.requestCancel(sessionId, user.id)` (400 missing sessionId, 404 unknown session).

**Services / models**
- `ProductService.importFromWpOrg` — the import pipeline (below), plus `fetchWpOrgPlugins` (query_plugins API), `fetchWpOrgPluginBySlug` (plugin_information API), `fetchSvnVersionData`, `fetchSvnReadme`, and `parseReadmeChangelog` for changelog entries. Reuses `createProduct` (slug uniqueness + retry) and `deleteProduct` (cascade) for rollback.
- `ImportSessionManager` (`importSessionManager` singleton) — process-local `Map<sessionId,{cancelled,userId}>` with cooperative cancel; on serverless, mirrors the flag to the `JobSession` collection and `refreshFromStore()` polls it so `isCancelled()` stays synchronous for the tight loop.
- `WpStatsService` — not part of import; supplies the live WP stats shown on product cards (see [product-management.md](product-management.md)).
- Models written: `Product`, `Version`, `Activity` (+ audit logs). `JobSession` (serverless cancel mirror; TTL 1h).

## Data model
- **`products`** — upsert keyed on `{ ownerId, wpOrgSlug }`. New products get `githubUrl = https://wordpress.org/plugins/<slug>`, `wpReadme`, icon (`icons['2x']||['1x']`), banner (`banners.high||low`), category (block vs plugin from tags).
- **`versions`** — one row per SVN tag: `{ label, status:'released', releasedAt, author, notes }`; existing rows reconciled (unreleased→released, backfill missing fields).
- **`activities`** — readme-parsed changelog entries: `type`, `title`, `shortDescription = IMPORTED_CHANGELOG_DESC`, `tags:['released']`, matched `versionId`, `activityDate`, `importSourceKey = "version|title"`, plus `needsReview`/`importConfidence`/`reviewReason='uncertain-type'` when confidence isn't `high` (feeds the import review queue — see [Issues & feature requests](./issues-and-feature-requests.md) and [readme changelog parsing](../algorithms/readme-changelog-parsing.md)). Deduped by the unique `{productId, importSourceKey}` index (E11000 tolerated as "skipped").
- **`jobsessions`** — `{ sessionId (unique), userId, cancelled, createdAt (TTL 3600s) }`, serverless only.

## Notable behaviors & edge cases
- **Cancellation is between plugins only** — the in-flight plugin always finishes, so no half-written product. Rollback deletes every product in `created` (cascade) but leaves pre-existing `updated` products untouched.
- **Two cancel channels** — `POST /import-from-wporg/cancel` (graceful, keeps stream open to stream rollback progress) and client disconnect / `AbortController` (server rolls back on `req.on('close')`). Generic `POST /api/jobs/cancel` also flips the session flag.
- **Serverless cross-instance cancel** — the cancel request may hit a different Vercel instance than the running job; the flag is written to `JobSession` and pulled in by the 2s `refreshFromStore` poller.
- **Dedupe is layered** — server unique index (`{productId, importSourceKey}`) + unordered `insertMany` (valid rows land even when some collide) + a client-side `importInFlightRef` latch guarding double-runs.
- **Graceful degradation** — SVN version fetch failures yield `[]` (import proceeds without versions); readme changelog parse errors are downgraded to a `warn` and never fail the whole import; a per-plugin exception is pushed to `errors` and streamed as `error` without aborting the batch.
- **SVN over WebDAV** — `fetchSvnVersionData` uses PROPFIND (list tags) + batched REPORT (release notes, 10 concurrent) against `plugins.svn.wordpress.org` with an `SVN/1.9.5` User-Agent to bypass Trac's WAF; trunk-only plugins with no tags produce no versions.
- **Version-tag reconciliation** also flips activities still tagged `unreleased` on now-released versions (`$pull 'unreleased'` → `$addToSet 'released'`).

## Related docs
- [`docs/files/client/components/products/WpOrgImportDialog.md`](../files/client/components/products/WpOrgImportDialog.md), [`WpImportMiniPlayer.md`](../files/client/components/products/WpImportMiniPlayer.md)
- [`docs/files/client/contexts/WpImportContext.md`](../files/client/contexts/WpImportContext.md), [`docs/files/client/services/products.md`](../files/client/services/products.md)
- [`docs/files/server/controllers/ProductController.md`](../files/server/controllers/ProductController.md), [`services/ProductService.md`](../files/server/services/ProductService.md), [`services/ImportSessionManager.md`](../files/server/services/ImportSessionManager.md), [`services/WpStatsService.md`](../files/server/services/WpStatsService.md), [`models/JobSession.md`](../files/server/models/JobSession.md)
- [`docs/algorithms/wporg-import-pipeline.md`](../algorithms/wporg-import-pipeline.md), [`svn-version-metadata-fetch.md`](../algorithms/svn-version-metadata-fetch.md), [`slug-disambiguation.md`](../algorithms/slug-disambiguation.md)
- [`docs/api/server-api-endpoints.md`](../api/server-api-endpoints.md) (§3 Products, §1.6 SSE, §19 Jobs), [`docs/api/client-endpoint-map.md`](../api/client-endpoint-map.md)
- Cross-feature: [`product-management.md`](product-management.md) (CRUD, slug generation, cascade delete), [`releases.md`](releases.md)
