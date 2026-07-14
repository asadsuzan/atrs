# `server/src/services/VersionService.ts`
**Purpose:** Ownership-scoped CRUD for product versions (release rows), with owner inherited from the parent product and product re-parenting explicitly blocked on update.
**Language / Size:** TypeScript / 2706 bytes

## Exports
- `class VersionService` — the service (consumer: VersionController).

## Imports (Internal / External)
Internal:
- `../models/Version` (Version, IVersion)
- `../models/Product` (Product)
- `./AuditLogService` (AuditLogService)
- `../utils/ownership` (scopeFilter, assertOwner)
- `../types/auth` (AuthUser type)

External: Mongoose statics (findById, find, findByIdAndUpdate, findByIdAndDelete), Mongoose doc save, Query chaining (sort, populate).

Module-level: `const auditLogService = new AuditLogService();`

## Functions / Methods
- **createVersion(data, user): Promise<IVersion>** — loads `Product.findById(data.productId)`; `assertOwner(product, user)`; constructs `new Version({ ...data, ownerId: product!.ownerId })` (owner inherited from product, not client); `.save()`; audit CREATE/VERSION (`Created version ${label}`). Side effects: DB write, audit log.
- **getVersions(productId | undefined, user): Promise<IVersion[]>** — with productId → `scopeFilter(user, { productId })`; without → `scopeFilter(user)` (all owned versions). Sorts `{ releasedAt: -1, createdAt: -1 }`. When no productId, `populate('productId', 'name slug icon')` for dashboard grouping/linking. DB read only.
- **getVersionById(id, user): Promise<IVersion | null>** — findById + assertOwner; returns the doc.
- **updateVersion(id, data, user): Promise<IVersion | null>** — findById existing + assertOwner; deletes `data.ownerId` AND `data.productId` (ownership not editable; re-parenting to another product forbidden). `findByIdAndUpdate(id, data, { new: true, runValidators: true })`; audit UPDATE if updated. Side effects: DB write, audit log.
- **deleteVersion(id, user): Promise<IVersion | null>** — findById existing + assertOwner; `findByIdAndDelete`; audit DELETE if deleted.

## Data structures / Types / Constants
- Sort order for lists: `releasedAt` desc then `createdAt` desc (newest releases first, unreleased fall by createdAt).

## Important algorithms
### Re-parenting protection
`updateVersion` strips both `ownerId` and `productId` from the payload. Ownership is asserted only on the *existing* document, and downstream release assembly (ReleaseService) trusts `productId`; allowing productId edits would let a version be moved into a product the caller shouldn't affect, so it is disallowed.

## Relationships
- Called by: VersionController.
- Models: Version, Product (ownership check + owner inheritance at create).
- Services: AuditLogService (all mutations logged).
- Utils: ownership (scopeFilter for lists, assertOwner for single-doc access).
- Consumed downstream by: ReleaseService (reads versions to assemble releases).

## Edge cases & known limitations
- create requires an existing, owned product; assertOwner rejects non-owners (non-admins see 404 semantics).
- productId is immutable after creation — no supported way to move a version between products via this service.
- No cascade on deleteVersion: deleting a version does not delete or re-tag activities that referenced it (activity versionId cleanup is handled elsewhere / left dangling).
- No pagination on getVersions — returns all matching rows.
