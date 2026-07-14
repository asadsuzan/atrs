# `server/src/services/ActivityService.ts`
**Purpose:** CRUD + bulk operations for changelog Activity records, with ownership scoping, media cleanup, audit logging, and auto-resolution of linked issues on bug-fix entries.
**Language / Size:** TypeScript / 7771 bytes

## Exports
- `class ActivityService`

## Imports (Internal / External)
Internal: `ActivityRepository` (../repositories/ActivityRepository), `IActivity` (../models/Activity), `Product` (../models/Product), `Issue` (../models/Issue), `AuditLogService` (./AuditLogService), `deleteMediaFiles` (../utils/fileUtils), `scopeFilter` + `assertOwner` (../utils/ownership), `escapeRegex` (../utils/sanitize), `parseLimit` + `parsePage` (../utils/pagination), `buildActivityBulkUpdate` (../utils/activityBulkUpdate), `AuthUser` type (../types/auth).
External: none directly.

Module-level: `const auditLogService = new AuditLogService();`

## Functions / Methods

### `constructor()`
Instantiates `this.repository = new ActivityRepository()`.

### `createActivity(data: any, user: AuthUser): Promise<IActivity>`
Purpose: create a changelog activity under a product the user owns.
Algorithm: (1) `Product.findById(data.productId)`; (2) `assertOwner(product, user)`; (3) `repository.create({ ...data, ownerId: product.ownerId })` — ownership inherited from the product, not the client; (4) audit-log `CREATE`/`ACTIVITY`; (5) `resolveLinkedIssues(activity, product.ownerId)`; returns activity.
Side effects: audit log, possible Issue updates.

### `resolveLinkedIssues(activity: IActivity | null, ownerId: any): Promise<void>` (private)
Purpose: when a `bug-fix` changelog entry references issues, mark those issues resolved.
Algorithm: returns early if no activity or `activity.type !== 'bug-fix'`; maps `activity.relatedIssueIds` handling both populated (`id._id`) and raw ids; returns if none; `Issue.updateMany({ _id: {$in: issueIds}, ownerId, status: {$in: ['open','in-progress']} }, { $set: { status: 'resolved', resolvedAt: activity.activityDate || new Date() } })`.
Branch WHY: only touches still-open issues so re-saves and manual re-openings are respected; scoped to owner so cross-tenant issues aren't touched.

### `getActivities(query: any, user: AuthUser): Promise<any>`
Purpose: filtered/paginated list.
Algorithm: starts from `scopeFilter(user)`; conditionally adds filters: productId, type, tier, tags, priority, versionId; `versioned==='none'` → `versionId: {$in:[null]}`, `'has'` → `{$ne:null}`; `needsReview` true; `ownerId` only when `user.role==='admin'`; `search` → `title: {$regex: escapeRegex(search), $options:'i'}`; date range on `activityDate` with `endDate` pushed to 23:59:59.999. Options: `parsePage`, `parseLimit`, sortBy default `activityDate`, sortOrder default `desc`. Delegates to `repository.findAll(filter, options)`.

### `getActivityById(id, user): Promise<IActivity | null>`
`repository.findById(id)` then `assertOwner`.

### `updateActivity(id, data, user): Promise<IActivity | null>`
Algorithm: load old via repository; `assertOwner(oldActivity, user)`; `delete data.ownerId`; `delete data.productId` (never re-parent to another product); `repository.update(id, data)`. If updated: audit-log `UPDATE`; re-run `resolveLinkedIssues`; then media orphan cleanup — collects media URLs (mediaUrl, mediaUrls[], items[].mediaUrl/mediaUrls[]) from old and new, computes `oldUrls` not in `newUrls`, and `deleteMediaFiles(orphanedUrls)` if any.
Branch WHY: prevents re-parenting because downstream release assembly trusts productId.

### `deleteActivity(id, user): Promise<IActivity | null>`
`findById` → `assertOwner` → `repository.delete(id)`; if deleted: audit-log `DELETE`; collect all media URLs (mediaUrl, mediaUrls, items media) and `deleteMediaFiles`.

### `bulkUpdateActivities(ids, update, user): Promise<number>`
Builds server-side whitelisted update via `buildActivityBulkUpdate(update || {})` (never forwards raw client keys/operators), then `repository.bulkUpdate(ids, updateDoc, scopeFilter(user))`.

### `bulkDeleteActivities(ids, update, user): Promise<number>`
`repository.findManyByIds(ids, scope)` to get owned only; `ownedIds`; `repository.bulkDelete(ownedIds, scope)`; then per activity collect + `deleteMediaFiles`. Returns deletedCount.

### `reorderActivity(id, displayOrder, user): Promise<IActivity | null>`
`findById` → `assertOwner` → `repository.reorder(id, displayOrder)`.

## Types / Constants
Module-level `auditLogService` singleton instance.

## Important logic
- Ownership inheritance: activities take `ownerId` from their parent product, not the request body.
- Media lifecycle: orphaned files deleted on update; all files deleted on delete/bulk-delete.
- Auto-issue-resolution: logging a bug-fix that references issues closes those issues.
- Injection safety: search terms escaped via `escapeRegex`; bulk updates whitelisted.

## Relationships
Called by the activities controller (not in this file). Uses models Product, Issue, Activity (via repository). Other services: AuditLogService. Repository: ActivityRepository.

## Edge cases
- Orphaned activity whose product was deleted: `getActivities`/report code handles missing productId elsewhere; here `assertOwner`/scope govern access.
- `assertOwner` on `null` (missing/non-owned) yields 404-style behavior (defined in ownership util).
