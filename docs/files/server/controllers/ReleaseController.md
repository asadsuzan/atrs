# `server/src/controllers/ReleaseController.ts`
**Purpose:** Build a product's release/changelog payload — authenticated (full, incl. exports) and public (opt-in, trimmed).
**Language / Size:** TypeScript / 1807 bytes
## Exports
Named exports: `getProductRelease`, `getPublicChangelog`.
## Imports (Internal / External)
- Internal: `../services/ProductService` (`ProductService`), `../services/ReleaseService` (`ReleaseService`), `../models/Product` (`Product`).
- External: `express`, `mongoose`.
- Module-level singletons: `productService`, `releaseService`.
## Handlers / Functions
- **getProductRelease(req,res,next)** — Authenticated. Reads `req.params.id` (`idParamSchema` at route), `req.user`. `productService.getProductById(id, req.user!)`; `404` if missing. `releaseService.buildRelease(product)`. `200` with full data (incl. exports).
- **getPublicChangelog(req,res,next)** — Public. Reads `req.params.id`. Invalid ObjectId → `404 'Changelog not found'`. `Product.findById(id)`; if missing or `!publicChangelogEnabled` → `404`. `releaseService.buildRelease(product)`. `200 {product, releases, unreleased}` (omits app-only export formats).
## Important logic & design patterns
- Two views of one release payload: full (owner) vs trimmed public (no export formats).
- Probe-resistant 404s for malformed ids and unpublished products; gated by `publicChangelogEnabled`.
## Relationships
- `getProductRelease` routed by `productRoutes.ts` as `GET /:id/release` (behind `requireAuth`+`requireActive`); `getPublicChangelog` routed by `publicRoutes.ts` as `GET /changelog/:id` (no auth).
- Delegates to `ProductService` and `ReleaseService`.
