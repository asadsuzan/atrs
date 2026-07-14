# `server/src/services/ProductMarketingService.ts`
**Purpose:** Ownership-scoped read/upsert/delete of a product's marketing hub document (trailers, tutorials, screenshots, key features, demos), including cleanup of associated uploaded media files on delete.
**Language / Size:** TypeScript / 2774 bytes

## Exports
- `class ProductMarketingService` — the service (consumers: ProductMarketingController; also used by ProductService's sequential cascade delete).

## Imports (Internal / External)
Internal:
- `../repositories/ProductMarketingRepository` (data access)
- `../models/ProductMarketing` (IProductMarketing type)
- `../models/Product` (Product)
- `../utils/fileUtils` (deleteMediaFiles)
- `./AuditLogService` (AuditLogService)
- `../utils/ownership` (assertOwner)
- `../utils/httpError` (createHttpError, default import)
- `../types/auth` (AuthUser type)

External: Mongoose model statics (Product.findById), filesystem via deleteMediaFiles.

Module-level: `const auditLogService = new AuditLogService();`

## Functions / Methods
- **constructor()** — instantiates `ProductMarketingRepository`.
- **assertProductOwned(productId, user): Promise<Product>** (private) — 400 "Product ID is required" if no productId; loads `Product.findById`; `assertOwner(product, user)`; returns product. Central ownership guard for every public method.
- **getMarketingData(productId, user): Promise<IProductMarketing | null>** — assertProductOwned then `repository.findByProductId`. DB read only.
- **upsertMarketingData(productId, data, user): Promise<IProductMarketing>** — assertProductOwned; shallow-copies data and deletes `ownerId` and `productId` from the payload (not client-editable); `repository.upsertByProductId(productId, { ...clean, ownerId: product.ownerId })` (owner stamped from product); audit UPDATE/MARKETING. Side effects: DB write, audit log.
- **deleteMarketingData(productId, user): Promise<boolean>** — assertProductOwned; loads existing doc; if present, collects media URLs (trailerVideo, tutorialVideo, thumbnailImage, each keyFeatures[].mediaUrl, screenshots[].url, demos[].icon), filters truthy, and `deleteMediaFiles(...)`; then `repository.deleteByProductId`. Audit DELETE only when a doc was actually deleted. Returns the boolean deleted flag. Side effects: filesystem deletion, DB write, audit log.

## Data structures / Types / Constants
- Media URL collection shape (delete): `[trailerVideo, tutorialVideo, thumbnailImage, ...keyFeatures.mediaUrl, ...screenshots.url, ...demos.icon]` filtered to truthy strings.

## Relationships
- Called by: ProductMarketingController; ProductService.deleteProductSequential invokes `deleteMarketingData` during a non-transactional cascade.
- Repository: ProductMarketingRepository (findByProductId, upsertByProductId, deleteByProductId).
- Models: Product (ownership check + name for audit), ProductMarketing (type only).
- Services: AuditLogService.
- Utils: ownership (assertOwner), fileUtils (deleteMediaFiles), httpError.

## Edge cases & known limitations
- Media file deletion happens before the DB delete; if the doc delete then fails, files are already gone (no rollback of filesystem).
- deleteMediaFiles is fire-and-forget (no awaited result surfaced); orphaned/missing files are its concern, not this service's.
- ownerId/productId are stripped from upsert payloads, so a client cannot re-parent or reassign a marketing doc.
- Every mutating method is gated by assertProductOwned; non-owners get a 404 via assertOwner (400 only when productId is entirely missing).
