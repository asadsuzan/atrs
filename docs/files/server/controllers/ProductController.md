# `server/src/controllers/ProductController.ts`
**Purpose:** Product CRUD, public product directory, stale-product alerts, WordPress.org live stats and catalogue import (SSE-streamed with cancellation), and bulk delete (JSON + SSE).
**Language / Size:** TypeScript / 10485 bytes
## Exports
Named exports: `createProduct`, `getProducts`, `getPublicProducts`, `getProductById`, `getStaleProducts`, `getProductWpStats`, `updateProduct`, `deleteProduct`, `bulkDeleteProducts`, `bulkDeleteProductsStream`, `wpOrgPreview`, `wpOrgPreviewBySlug`, `importFromWpOrg`, `cancelWpOrgImport`.
## Imports (Internal / External)
- Internal: `../services/ProductService` (`ProductService`), `../services/WpStatsService` (`WpStatsService`), `../services/ImportSessionManager` (`importSessionManager`), `../utils/sseStream` (`runStreamJob`), `../utils/appConfig` (`getStaleAlertDays`).
- External: `express`, `crypto` (`randomUUID`).
- Module-level singletons: `productService`, `wpStatsService`.
## Handlers / Functions
- **createProduct(req,res,next)** — Reads `req.body` (`createProductSchema`), `req.user`. `productService.createProduct`. `201`.
- **getProducts(req,res,next)** — Reads `req.query`, `req.user`. `productService.getProducts`. `200`.
- **getPublicProducts(_req,res,next)** — Public. `productService.getPublicProducts()`. `200 {products}`.
- **getProductById(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200`.
- **getStaleProducts(req,res,next)** — Reads `req.user`; `days = getStaleAlertDays()`. `productService.getStaleProducts(req.user!, days)`. `200`.
- **getProductWpStats(req,res,next)** — Reads `req.params.id`, `req.user`. Loads product; `404` if missing; if no `wpOrgSlug` → `200 {slug:null}`; else `wpStatsService.getStats(slug)`. `200`.
- **updateProduct(req,res,next)** — Reads `req.params.id`, `req.body` (`updateProductSchema`), `req.user`. `404` if null; else `200`.
- **deleteProduct(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200 {message:'Product deleted successfully'}`.
- **bulkDeleteProducts(req,res,next)** — Reads `req.body.ids`. Guard non-empty array → `400`. `productService.bulkDeleteProducts(ids, req.user!)`. `200`.
- **bulkDeleteProductsStream(req,res)** — SSE via `runStreamJob`. Guard non-empty array → `400` before stream. Per id: `getCascadeCounts(id)` (emits activities/versions/marketing counts), `deleteProduct(id, req.user!)`, `isCancelled()` checks, per-item events; returns `{deleted, errors, cancelled, total}`.
- **wpOrgPreview(req,res,next)** — Reads `req.query.username`; `400` if missing. `productService.wpOrgPreview(username, req.user!)`. `200`.
- **wpOrgPreviewBySlug(req,res,next)** — Reads `req.query.slugs` (split on whitespace/comma); `400` if empty. `productService.wpOrgPreviewBySlug(slugList, req.user!)`. `200`.
- **importFromWpOrg(req,res)** — Manual SSE (not `runStreamJob`). Reads `req.body.username`, `req.body.slugs`; guard non-empty `slugs` array → `400`. Writes SSE headers, keep-alive, flushes `: ok`. Creates a cancellable session (`importSessionManager.create(randomUUID(), req.user!.id)`), sends `session` event. Polls `refreshFromStore` every 2s (serverless cross-instance cancel). `req.on('close')` → treats client disconnect as cancel (`requestCancel`). Calls `productService.importFromWpOrg(username, slugs, req.user!, onProgress→send('progress'), isCancelled)`; sends `complete` `{created, updated, errors, cancelled, rolledBack}` or `error`. Cleans up interval/session in `finally`.
- **cancelWpOrgImport(req,res,next)** — Reads `req.body.sessionId`; `400` if missing/not string. `importSessionManager.requestCancel(sessionId, req.user!.id)`; `404` if not found; else `200 {message:'Cancellation requested'}`.
## Important logic & design patterns
- Two streaming styles: `runStreamJob` (bulk delete) and a hand-rolled SSE stream (wporg import) with explicit headers, keep-alive, cross-instance cancel polling, and client-disconnect-as-cancel (rolls back created products).
- Cascade-aware bulk delete surfaces child counts (`getCascadeCounts`).
- Public directory endpoint bypasses owner scoping.
- Console logging in the import path for observability.
## Relationships
- Routed by `productRoutes.ts` (mounted `/api/products`, behind `requireAuth`+`requireActive`); `getPublicProducts` also routed by `publicRoutes.ts`.
- Delegates to `ProductService`, `WpStatsService`, `ImportSessionManager`; shares FsController/ReleaseController/ProductMarketingController under the same route file.
