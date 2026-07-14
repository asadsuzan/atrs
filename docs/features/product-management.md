# Product Management

**Summary:** Owner-scoped CRUD for products (WP plugin/block/theme or standalone), including per-owner slug generation, filtered list/grid views with bulk delete, an "Add product" chooser flow, stale-product alerting, live WordPress.org ecosystem stats, and a jailed server-side folder picker for a product's local Git repo path.

## User-facing entry points
- **Route `/products`** (`Products.tsx`) — the catalog page: search/category/status/owner filters, grid & table views, per-page bulk selection + bulk delete, per-row edit/delete, and an "Add Product" button.
- **Route `/products/:id`** (`ProductDetails.tsx`) — the product workspace header (banner/icon/meta, WP.org-enriched) plus tabs (Activity Timeline, Versions, Marketing, Release, Issues, Readme). This doc covers the product header/CRUD entry; tab features are documented separately (see [releases.md](releases.md) and the versions/activities/marketing docs).
- **Add-product flow** — invoked from the Products page header, the empty state, the sidebar, and the Activities page via `AddProductContext` (`openAddProduct` / `openAddProductFirst`). Opens `AddProductDialog` (kind chooser → manual form or WP.org import) and, when no products exist yet, `NeedProductFirstDialog`.
- **Global stale alert** — `StaleProductAlert` (headless, app-root mounted) pops a toast when products are overdue for a changelog update.

## Client pieces
**Pages**
- `client/src/pages/Products.tsx` — list/grid, filters persisted via `useLocalStorage` (search/category/status/limit/view), `ownerId`+`page` ephemeral, debounced search (300ms), `Set<string>` per-page bulk selection.
- `client/src/pages/ProductDetails.tsx` — product header + tab workspace; enriches header from WordPress.org when `wpOrgSlug` is set.

**Components**
- `components/products/ProductForm.tsx` — variant-driven (`wp` / `standalone` / `full`) create/edit form; `buildSchema(variant)` (Zod via `zodResolver`), AI-assisted name/description, media uploads, autosaved drafts (`useFormDraft`, media excluded), and the repo-path Browse button.
- `components/products/AddProductDialog.tsx` — multi-step chooser (`type` → `wp-method` → `form`); delegates the import branch to a parent `onImport`.
- `components/products/ProductsEmptyState.tsx` — onboarding empty state with Add / Import actions.
- `components/products/NeedProductFirstDialog.tsx` — "you need a product first" gate that routes into the add flow.
- `components/products/RepoPathBrowser.tsx` — server-side folder picker (`browseDirs`) feeding `repoPath`; up/home nav, editable path box, root not selectable.
- `components/products/StaleProductAlert.tsx` — headless alerter; `classifyStale(p, days)` marks critical vs warning; session-dedupes via `sessionStorage['atrs_stale_alert']`.
- `components/products/ProductWpStats.tsx` — compact WP.org stats strip on product cards (installs/rating/updated + WP Rankings/WP Hive/Patchstack/Plugin Tests chips).

**Services** (`client/src/services/products.ts`)
- `getProducts` (default `limit:1000`), `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`, `bulkDeleteProducts` (ids in body), `getStaleProducts`, `getProductWpStats`, `browseDirs`. (WP.org preview/import fns are covered in [wporg-import.md](wporg-import.md).)

**React Query keys**
- `['products', queryParams]` — list (shared cache; invalidated after create/update/delete/bulk-delete and after imports).
- `['users']` — owner-filter source (admin only, `enabled: isAdmin`).
- `['product', id]` — single product (ProductDetails).
- `['staleProducts']` — stale alert (`staleTime` 5m).
- `['wpStats', productId]` — WP stats card (`staleTime` 30m, `gcTime` 60m, `retry:1`).
- `['browse-dirs', current]` — folder picker (`enabled: open`, `retry:false`).
- `['wp-plugin', wpOrgSlug]` — direct WordPress.org plugin-info fetch to enrich the detail header.

**Contexts**
- `AddProductContext` (`useAddProduct`) — owns `AddProductDialog` + `NeedProductFirstDialog`; `createMutation` → `createProduct`, invalidates `['products']`; bridges to `WpImportContext` for the import branch. Consumed by `SidebarNav`, `Activities`, `Products`.
- Also consumes `AuthContext`, `WpImportContext`, `JobStreamContext` (bulk delete), `ConfirmContext`.

## Server pieces
Router `server/src/routes/productRoutes.ts` mounted at `/api/products` behind **requireAuth + requireActive** (per `app.ts`). Literal routes precede `/:id`.

- `POST /` → `ProductController.createProduct` (validate `createProductSchema`) → `ProductService.createProduct`.
- `GET /` → `getProducts` → `ProductService.getProducts` (owner-scoped via `scopeFilter`; search/category/status filters; admin `ownerId`).
- `GET /:id` → `getProductById` (validate `idParamSchema`) → `ProductService.getProductById` (`assertOwner`, 404 on others').
- `PATCH /:id` → `updateProduct` (validate `updateProductSchema`) → `ProductService.updateProduct` (strips `ownerId`; recomputes slug if name changed; audit UPDATE).
- `DELETE /:id` → `deleteProduct` → `ProductService.deleteProduct` (cascade: activities/versions/marketing + media).
- `DELETE /bulk` → `bulkDeleteProducts` (400 if `ids` not a non-empty array).
- `POST /bulk-delete-stream` → `bulkDeleteProductsStream` — **SSE** via `runStreamJob`; emits per-id cascade counts (`getCascadeCounts`), cancellable via `POST /api/jobs/cancel`.
- `GET /stale` → `getStaleProducts` (threshold `getStaleAlertDays()`).
- `GET /browse-dirs` → `FsController.browseDirs` (jailed folder picker).
- `GET /:id/wp-stats` → `getProductWpStats` → `WpStatsService.getStats` (`{slug:null}` when no `wpOrgSlug`).

**Services / repositories / utils**
- `ProductService` — CRUD, ownership scoping, `uniqueSlugForOwner`, cascade delete (transactional with `deleteProductSequential` fallback for standalone mongod), and the WP.org import pipeline ([wporg-import.md](wporg-import.md)).
- `ProductRepository` — `create` / `findAll` (page 1, limit 10 default, sort `createdAt:-1`, returns `{data, totalPages}`) / `findById` / `update` (`runValidators`) / `delete`.
- `utils/slug.ts` — `baseSlug` (slugify, strict) + `disambiguateSlug` (append `-2`, `-3`, …). `uniqueSlugForOwner` reads owner-scoped `distinct('slug')`; `createProduct` retries 4× on the `{ownerId,slug}` unique-index race (11000) then 409.
- `utils/ownership.ts` — `scopeFilter` (owner/admin) + `assertOwner` (uniform 404-on-denial to prevent id enumeration).
- `utils/repoAccess.ts` — `getRepoRoot()`/`isWithinRepoRoot()` back the folder-picker jail (`REPO_BROWSE_ROOT`, default OS home); `assertRepoPathAllowed` guards git access to a stored `repoPath`.
- `FsController.browseDirs` — resolves within the repo root (out-of-jail input snaps back to root), returns directory names only, capped at `MAX_ENTRIES = 2000`; maps stat/readdir failures to 400/403.

**Auth guards:** all authed product routes require valid JWT + active account; ownership enforced in the service layer (others' records read as 404). Public product directory (`getPublicProducts`) is served elsewhere via `publicRoutes`.

## Data model
- **`products` collection** (`models/Product.ts`): `ownerId` (→User, required), `name`, `slug` (unique per owner via compound index `{ownerId:1, slug:1}`), `description`, `githubUrl`, `banner`, `icon`, `wpOrgSlug`, `wpReadme`, `repoPath` (absolute local path), `publicChangelogEnabled` (default false), `publicIssuesEnabled` (default false), `listedInDirectory` (default true), `category` (enum plugin/block/theme/standalone, required, indexed), `status` (enum active/inactive, default active, indexed), timestamps.
- Validation: `createProductSchema` (name + category required; `githubUrl` a URL or `''`), `updateProductSchema` (all optional + the three public booleans). `params.id` is a plain string (not ObjectId-validated) on product schemas.
- **Child collections touched on cascade delete:** `activities`, `versions`, `productmarketings` (+ referenced media files).

## Notable behaviors & edge cases
- **Slug uniqueness is per-owner, read-then-write** — concurrency handled by the 4-attempt retry + unique index; >4 collisions throws 409. Empty name → `product`/`product-2`/…
- **Variant form rules:** standalone products may omit the URL and hide the category/WP.org-slug fields; `wp`/`full` require a valid `githubUrl`.
- **Repo path is server-local** — only meaningful on self-hosted deployments; browsing is jailed to `REPO_BROWSE_ROOT`; root cannot be selected. Symlinks escaping the root are not detected.
- **Bulk delete uses a streaming job** (not a plain mutation) with a confirm gate and cascade-count reporting; already-processed deletes are not rolled back on cancel.
- **Cascade delete** prefers a Mongoose transaction; a standalone (non-replica-set) mongod falls back to a sequential cascade that throws (leaving the product intact) if any child delete fails, so the product is never half-deleted.
- **Stale alert** fires at most once per `(days,total,urgent)` signature per browser session; `days` is server-provided (fallback 7); "No changelog yet" is treated as critical.
- **WP stats** silently render nothing for products without a resolvable WP slug (e.g. standalone); server-side stats are best-effort scrapes with a 6h in-memory cache.
- **Editing cannot change ownership** — `updateProduct` deletes any `ownerId` in the payload.

## Related docs
- [`docs/files/client/pages/Products.md`](../files/client/pages/Products.md), [`ProductDetails.md`](../files/client/pages/ProductDetails.md)
- [`docs/files/client/components/products/ProductForm.md`](../files/client/components/products/ProductForm.md), [`AddProductDialog.md`](../files/client/components/products/AddProductDialog.md), [`ProductsEmptyState.md`](../files/client/components/products/ProductsEmptyState.md), [`NeedProductFirstDialog.md`](../files/client/components/products/NeedProductFirstDialog.md), [`RepoPathBrowser.md`](../files/client/components/products/RepoPathBrowser.md), [`StaleProductAlert.md`](../files/client/components/products/StaleProductAlert.md), [`ProductWpStats.md`](../files/client/components/products/ProductWpStats.md)
- [`docs/files/client/contexts/AddProductContext.md`](../files/client/contexts/AddProductContext.md), [`docs/files/client/services/products.md`](../files/client/services/products.md)
- [`docs/files/server/routes/productRoutes.md`](../files/server/routes/productRoutes.md), [`controllers/ProductController.md`](../files/server/controllers/ProductController.md), [`controllers/FsController.md`](../files/server/controllers/FsController.md), [`services/ProductService.md`](../files/server/services/ProductService.md), [`repositories/ProductRepository.md`](../files/server/repositories/ProductRepository.md), [`models/Product.md`](../files/server/models/Product.md), [`schemas/product.schema.md`](../files/server/schemas/product.schema.md)
- [`docs/files/server/utils/slug.md`](../files/server/utils/slug.md), [`utils/repoAccess.md`](../files/server/utils/repoAccess.md), [`utils/ownership.md`](../files/server/utils/ownership.md)
- [`docs/algorithms/slug-disambiguation.md`](../algorithms/slug-disambiguation.md)
- [`docs/api/server-api-endpoints.md`](../api/server-api-endpoints.md) (§3 Products), [`docs/api/client-endpoint-map.md`](../api/client-endpoint-map.md)
- Cross-feature: [`wporg-import.md`](wporg-import.md), [`releases.md`](releases.md)
