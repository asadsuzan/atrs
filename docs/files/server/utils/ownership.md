# `server/src/utils/ownership.ts`
**Purpose:** Authorization helpers that scope Mongo queries to the requesting user's records and assert ownership (or assignee membership) on individual documents, with admins unrestricted.
**Language / Size:** TypeScript / 2526 bytes

## Exports
- `function scopeFilter(user, base = {}): Record<string, any>`
- `function assertOwner<T extends { ownerId?: any }>(doc, user): asserts doc is T`
- `function ownerOrAssigneeFilter(user, base = {}): Record<string, any>`
- `function assertOwnerOrAssignee(doc, user): void`

## Imports (Internal / External)
- Internal: `createHttpError` (default) from `./httpError`; type `AuthUser` from `../types/auth`.
- External: none.

## Functions / Methods
### `scopeFilter(user, base = {})`
Returns a Mongo filter scoped to the user:
- No user → `{ ...base, ownerId: null }` (matches nothing; defensive).
- Admin → `{ ...base }` (unrestricted).
- Otherwise → `{ ...base, ownerId: user.id }`.

### `assertOwner(doc, user)`
TypeScript assertion function. Throws `createHttpError(404, 'Not found')` if `doc` is null/undefined. Returns (passes) for admins. Otherwise compares `doc.ownerId?.toString?.() ?? String(doc.ownerId)` against `user.id`; throws 404 if no user or mismatch. Uses 404 (not 403) so users cannot probe which ids exist.

### `ownerOrAssigneeFilter(user, base = {})`
Like `scopeFilter` but matches owned OR assigned documents:
- No user → `{ ...base, ownerId: null }`.
- Admin → `{ ...base }`.
- Otherwise → `{ ...base, $or: [{ ownerId: user.id }, { assigneeIds: user.id }] }`. Used for tasks where an assignee must see work owned by a manager.

### `assertOwnerOrAssignee(doc, user)`
Throws 404 if `doc` is null. Passes for admins. Throws 404 if no user. Passes if `ownerId === user.id`. Otherwise checks whether `user.id` is among `doc.assigneeIds` (normalizing each entry via `a?._id?.toString?.() ?? a?.toString?.() ?? String(a)` to support both populated docs and raw ids); throws 404 if not an assignee.

## Data structures / Types / Constants
- Relies on `AuthUser` (fields used: `id`, `role`).

## Important algorithms
Uniform 404-on-denial policy prevents id enumeration. Id normalization tolerates ObjectId, string, and populated-document shapes.

## Relationships
Consumes `httpError.ts` and the `AuthUser` type. Used across route handlers/services for products, versions, activities, issues (`scopeFilter`/`assertOwner`) and tasks (`ownerOrAssigneeFilter`/`assertOwnerOrAssignee`).

## Edge cases & known limitations
- `scopeFilter`/`ownerOrAssigneeFilter` with no user return a filter (`ownerId: null`) that matches nothing rather than throwing — routes are still expected to enforce auth.
- Assignee matching in `assertOwnerOrAssignee` handles multiple id shapes; `ownerOrAssigneeFilter` assumes `assigneeIds` stores plain ids matching `user.id`.
