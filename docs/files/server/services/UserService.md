# `server/src/services/UserService.ts`
**Purpose:** Admin user management — listing, status/role changes, admin password reset, deletion (simple + streaming cascade of all owned data), and ownership reassignment. Emits live access-change notifications and protects the root account.
**Language / Size:** TypeScript / 8964 bytes

## Exports
- `class UserService` — the service (consumer: UserController / admin routes).

## Imports (Internal / External)
Internal:
- `../models/User` (User, UserRole, UserStatus, hashPassword)
- `../models/Product` (Product)
- `../models/Activity` (Activity)
- `../models/Version` (Version)
- `../models/ProductMarketing` (ProductMarketing)
- `../utils/httpError` (createHttpError, default import)
- `./NotificationManager` (notificationManager singleton)
- `./ProductService` (ProductService)
- `./ActivityService` (ActivityService)
- `../utils/fileUtils` (deleteMediaFiles)
- `../utils/sseStream` (StreamEvent type)
- `../types/auth` (AuthUser type)

External: Mongoose statics (find, findById, updateMany, deleteMany), Mongoose doc methods (save, deleteOne), Promise.all.

## Functions / Methods
- **listUsers(query): Promise<...>** — builds a filter, coercing `query.status`/`query.role` to string and validating against enums (`['pending','active','suspended']`, `['admin','user']`) so an object like `?status[$ne]=active` cannot inject a Mongo operator. `User.find(filter).sort({ createdAt: -1 })`; returns `u.toJSON()` per user (strips sensitive fields via model transform). DB read.
- **getEditableUser(id): Promise<User>** (private) — findById; 404 "User not found" if missing; 403 "The root administrator account cannot be modified" if `user.isRoot`. Gate for every mutating admin op.
- **setStatus(id, status): Promise<user JSON>** — getEditableUser; sets status, save; if status changed, `notificationManager.sendToUser(id, 'access-change', {...})` with an approved/suspended message. Returns toJSON. Side effects: DB write, live notification.
- **approve(id)** / **suspend(id)** / **reactivate(id)** — thin wrappers over setStatus('active' / 'suspended' / 'active').
- **resetPassword(id, newPassword): Promise<{ id }>** — admin-driven one-time password. getEditableUser (blocks root); sets `passwordHash = hashPassword(newPassword)`, `mustChangePassword = true`, clears `passwordResetRequested`/`passwordResetRequestedAt`, sets `passwordChangedAt = now` (invalidates the user's existing JWTs), save. Sends an access-change notification. Returns `{ id }`. Side effects: DB write, JWT invalidation, live notification.
- **setRole(id, role): Promise<user JSON>** — getEditableUser; sets role, save; if role changed, access-change notification. Returns toJSON.
- **deleteUser(id): Promise<{ id }>** — getEditableUser; `user.deleteOne()`. Simple delete (does NOT cascade owned data — see deleteUserCascade).
- **deleteUserCascade(id, actingUser, ctx): Promise<{ productsDeleted, errors, cancelled }>** — streaming cascade delete (see Important algorithms). `ctx = { emit: (StreamEvent) => void; isCancelled: () => boolean }`.
- **reassignOwnership(fromUserId, toUserId): Promise<{ products, activities, versions, marketing }>** — 404 "Target user not found" if `toUserId` missing; `updateMany({ ownerId: fromUserId }, { $set: { ownerId: toUserId } })` in parallel across Product/Activity/Version/ProductMarketing; returns each `modifiedCount`. Reassigns owned records (e.g. before deletion).

## Data structures / Types / Constants
- Status enum: `['pending','active','suspended']`; Role enum: `['admin','user']` (validated in listUsers).
- Notification event type: `'access-change'` (status/role/password changes); cascade uses `StreamEvent` (`type: info|success|warn|error`, `step`, `message`, optional `label`, `itemIndex`, `totalItems`).

## Important algorithms
### Streaming cascade user delete — `deleteUserCascade`
1. `getEditableUser(id)` (throws on root / not-found). Emit `start`.
2. `Product.find({ ownerId: id }, 'name')`; emit `scan` with count.
3. For each product (index tracked): check `isCancelled()` (break, set cancelled); `productService.getCascadeCounts(id)` → emit a `product` info with counts; `productService.deleteProduct(id, actingUser)` (full per-product cascade incl. media); on success `productsDeleted++` and emit success; on error push `"${name}: ${message}"` and emit an error event (loop continues).
4. If not cancelled, clean up orphans still tagged to the user:
   - Orphaned Activities: `Activity.find({ownerId:id},'_id')` → `activityService.bulkDeleteActivities(ids, actingUser)` (removes their media too).
   - Orphaned ProductMarketing: load media-bearing fields, collect URLs (trailerVideo, tutorialVideo, thumbnailImage, keyFeatures[].mediaUrl, screenshots[].url, demos[].icon), `deleteMediaFiles`, then `ProductMarketing.deleteMany({ownerId:id})`.
   - Orphaned Versions: `Version.deleteMany({ownerId:id})`.
   - Finally `target.deleteOne()` (the account). Emit step events throughout.
5. Emit a `summary` (`warn` if any errors else `success`). Returns `{ productsDeleted, errors, cancelled }`.

## Relationships
- Called by: UserController / admin routes (list, approve/suspend/reactivate, setRole, resetPassword, deleteUser, cascade delete SSE endpoint, reassign).
- Services: ProductService (per-product cascade delete + getCascadeCounts), ActivityService (orphan activity cleanup), NotificationManager (live access-change / uses sendToUser).
- Models: User, Product, Activity, Version, ProductMarketing.
- Utils: httpError, fileUtils (deleteMediaFiles), sseStream (StreamEvent type).

## Edge cases & known limitations
- Root account (`isRoot`) cannot be modified or deleted — 403 from getEditableUser.
- `deleteUser` does NOT cascade; use `deleteUserCascade` to also remove owned products/activities/versions/marketing/media.
- Cascade cancellation is checked only between products; the in-flight product's delete completes. When cancelled, orphan cleanup and account deletion are skipped (account survives).
- Per-product delete failures are collected (not fatal) and reported in `errors`/summary; the account is still deleted if not cancelled and product loop completed (failures don't stop the final `deleteOne`).
- resetPassword bumps `passwordChangedAt`, invalidating outstanding JWTs; the user must change the temporary password on next sign-in (`mustChangePassword`).
- listUsers guards against Mongo-operator injection by enum-validating string query params; non-string/invalid values are ignored.
