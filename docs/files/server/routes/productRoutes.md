# `server/src/routes/productRoutes.ts`
**Purpose:** Express router for Products (CRUD, bulk delete incl. SSE, stale alerts, directory browsing, WordPress.org preview/import, WP stats, releases, and product marketing data); mounted at `/api/products` (app.ts: `app.use('/api/products', requireAuth, requireActive, productRoutes)`).
**Language / Size:** TypeScript / 2138 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
- Instantiates `marketingController = new ProductMarketingController()` at module load.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/` | validate | `createProductSchema` | `ProductController.createProduct` |
| GET | `/` | — | — | `ProductController.getProducts` |
| DELETE | `/bulk` | — | — | `ProductController.bulkDeleteProducts` |
| POST | `/bulk-delete-stream` | — | — | `ProductController.bulkDeleteProductsStream` |
| GET | `/stale` | — | — | `ProductController.getStaleProducts` |
| GET | `/browse-dirs` | — | — | `FsController.browseDirs` |
| GET | `/wporg-preview` | — | — | `ProductController.wpOrgPreview` |
| GET | `/wporg-preview-by-slug` | — | — | `ProductController.wpOrgPreviewBySlug` |
| POST | `/import-from-wporg` | — | — | `ProductController.importFromWpOrg` |
| POST | `/import-from-wporg/cancel` | — | — | `ProductController.cancelWpOrgImport` |
| GET | `/:id` | validate | `idParamSchema` | `ProductController.getProductById` |
| GET | `/:id/release` | validate | `idParamSchema` | `ReleaseController.getProductRelease` |
| GET | `/:id/wp-stats` | validate | `idParamSchema` | `ProductController.getProductWpStats` |
| PATCH | `/:id` | validate | `updateProductSchema` | `ProductController.updateProduct` |
| DELETE | `/:id` | validate | `idParamSchema` | `ProductController.deleteProduct` |
| GET | `/:id/marketing` | validate | `idParamSchema` | `marketingController.getMarketingData` |
| PUT | `/:id/marketing` | validate | `upsertMarketingSchema` | `marketingController.upsertMarketingData` |
| DELETE | `/:id/marketing` | validate | `idParamSchema` | `marketingController.deleteMarketingData` |
## Relationships
- Controllers: `../controllers/ProductController`, `../controllers/ProductMarketingController` (`ProductMarketingController` class), `../controllers/ReleaseController` (`getProductRelease`), `../controllers/FsController` (`browseDirs`).
- Schemas: `product.schema` (`createProductSchema`, `updateProductSchema`), `marketing.schema` (`upsertMarketingSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- All literal routes (`/bulk`, `/bulk-delete-stream`, `/stale`, `/browse-dirs`, `/wporg-preview`, `/wporg-preview-by-slug`, `/import-from-wporg`, `/import-from-wporg/cancel`) are declared before `/:id` so they aren't captured as ids.
- SSE (streaming) endpoints: `POST /bulk-delete-stream` and `POST /import-from-wporg`; the latter is cancellable via `POST /import-from-wporg/cancel`. These stream endpoints carry no `validate` middleware (they guard input internally).
- Public counterpart: `getPublicProducts` is routed by `publicRoutes.ts`, not here.
