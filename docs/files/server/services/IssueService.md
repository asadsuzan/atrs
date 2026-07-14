# `server/src/services/IssueService.ts`
**Purpose:** Ownership-scoped CRUD for product issues (bug reports), plus a public "report an issue" flow that sanitizes untrusted input and queues submissions for owner review.
**Language / Size:** TypeScript / 5905 bytes

## Exports
- `class IssueService` — the service (default consumer: IssueController).

## Imports (Internal / External)
Internal:
- `../models/Issue` (Issue, IIssue)
- `../models/Product` (Product)
- `./AuditLogService` (AuditLogService)
- `./NotificationManager` (notificationManager singleton)
- `../utils/ownership` (scopeFilter, assertOwner)
- `../utils/html` (escapeHtml, plainTextToSafeHtml)
- `../utils/httpError` (createHttpError, default import)
- `../types/auth` (AuthUser type)

External: Mongoose model statics (findById, find, create, findByIdAndUpdate, findByIdAndDelete), Mongoose Query chaining (sort, populate, lean).

Module-level: `const auditLogService = new AuditLogService();` (shared instance). `const RESOLVED_STATUSES = ['resolved', 'closed'];`

## Functions / Methods
- **createIssue(data, user): Promise<IIssue>** — loads `Product.findById(data.productId)`, `assertOwner(product, user)`. If `data.status` is in RESOLVED_STATUSES and no `resolvedAt`, stamps `resolvedAt = new Date()`. Constructs `new Issue({ ...data, ownerId: product!.ownerId })` (owner inherited from product, not client), `.save()`, then audit CREATE/ISSUE. Side effects: DB write, audit log.
- **getIssues(productId | undefined, user): Promise<IIssue[]>** — if productId given, `scopeFilter(user, { productId })`; else `scopeFilter(user)` (all owned issues). Sorts `createdAt: -1`. When no productId, `populate('productId', 'name slug icon')` so the dashboard can group/link. DB read only.
- **getPendingReview(user): Promise<IIssue[]>** — issues with `source: 'public', needsReview: true` (owner-scoped; admins see all). Sorted newest-first, populates product name/slug/icon. Powers the review queue + nav badge.
- **getIssueById(id, user): Promise<IIssue | null>** — findById + assertOwner. Returns the doc (or null when missing → assertOwner handles guard).
- **updateIssue(id, data, user): Promise<IIssue | null>** — findById existing + assertOwner; deletes `data.ownerId` (ownership not editable). Status/resolvedAt reconciliation: if transitioning into resolved (and wasn't) and no explicit resolvedAt → set now; if transitioning out of resolved → clear resolvedAt to null. `findByIdAndUpdate(id, data, { new: true, runValidators: true })`; audit UPDATE if updated. Side effects: DB write, audit log.
- **deleteIssue(id, user): Promise<IIssue | null>** — findById existing + assertOwner; `findByIdAndDelete`; audit DELETE if deleted.
- **getPublicIssues(productId): Promise<IIssue[]>** — public, no auth. `Issue.find({ productId, needsReview: { $ne: true } })` (excludes unmoderated submissions), newest-first, `.lean()`. Cast through `unknown` to IIssue[].
- **reportPublicIssue(productId, data): Promise<{ ok: true }>** — public, no auth. Loads product; 404 "Issues not found" if missing OR `!product.publicIssuesEnabled` (deliberately does not reveal whether the id exists). Creates an Issue with sanitized fields: `title` = escapeHtml + trim + slice(0,200); `description` = plainTextToSafeHtml (or ''); `versionLabel` escapeHtml + slice(0,60); `reporter` escapeHtml + slice(0,120); `reporterEmail` trim + slice(0,200); `status:'open'`, `severity:'medium'`, `source:'public'`, `needsReview:true`, `foundAt: now`. Audit CREATE with system actor (no AuthUser passed → anonymous). Emits `notificationManager.sendToUser(ownerId, 'issue-reported', {...})` live nudge. Side effects: DB write, audit log, live notification.

## Data structures / Types / Constants
- `RESOLVED_STATUSES = ['resolved', 'closed']` — statuses that imply a resolution timestamp.
- Public report field caps: title 200, description via plainTextToSafeHtml, versionLabel 60, reporter 120, reporterEmail 200.

## Important algorithms
### resolvedAt lifecycle
`resolvedAt` is kept consistent with `status`:
- On create: filed already-resolved → stamp now.
- On update: newly resolved (was not) and no explicit value → stamp now; moved out of resolved → set null. If both old and new are resolved, resolvedAt is left untouched.

### Public submission moderation
Public reports are always `needsReview: true`, so `getPublicIssues` (which excludes `needsReview: true`) never shows unmoderated reports. Owners approve them from the review queue fed by `getPendingReview`.

## Relationships
- Called by: IssueController (authenticated CRUD + review queue) and public issue routes (getPublicIssues, reportPublicIssue).
- Models: Issue, Product (Mongoose).
- Services: AuditLogService (all mutations logged), NotificationManager (live owner nudge on public reports).
- Utils: ownership (scopeFilter/assertOwner), html (escapeHtml/plainTextToSafeHtml sanitizers), httpError.

## Edge cases & known limitations
- reportPublicIssue returns the same 404 for a nonexistent product and one that hasn't enabled public issues — intentional to avoid probing existence.
- Anonymous public reports produce audit entries with no acting user (system actor).
- getIssueById/updateIssue/deleteIssue rely on `assertOwner` to enforce access; non-owners are rejected there (non-admins cannot see others' issues).
- No pagination on getIssues/getPublicIssues — returns all matching rows.
