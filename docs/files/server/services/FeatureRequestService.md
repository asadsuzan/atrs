# `server/src/services/FeatureRequestService.ts`
**Purpose:** CRUD for user-submitted feature requests with admin triage (status/adminNote), audit logging, and persistent+live notifications to admins and back to requesters.
**Language / Size:** TypeScript / 6192 bytes

## Exports
- `class FeatureRequestService`

## Imports (Internal / External)
Internal: `FeatureRequest` + `IFeatureRequest` (../models/FeatureRequest), `User` (../models/User), `Notification` (../models/Notification), `notificationManager` (./NotificationManager), `AuditLogService` (./AuditLogService), `createHttpError` (../utils/httpError), `AuthUser` type.

## Functions / Methods

### `notify(userId, title, message, link): Promise<void>` (private)
Creates + saves a `Notification` (type 'system'), then `notificationManager.sendToUser(userId, 'notification', notif)`. Wrapped in try/catch — logs `'Failed to send feature-request notification:'` and never breaks the caller.

### `createRequest(data: { title; description? }, user): Promise<IFeatureRequest>`
Algorithm: `FeatureRequest.create({ requesterId: user.id, title, description: data.description || '', status: 'pending' })`; audit-log `CREATE`/`FEATURE_REQUEST` ('Feature request submitted'); fetch admins `User.find({ $or:[{role:'admin'},{isRoot:true}] })`; for each admin (skipping the submitter themself), `notify(...)` with title 'New Feature Request'. Returns request.

### `getRequests(user): Promise<IFeatureRequest[]>`
filter = `{}` if admin else `{ requesterId: user.id }`; `.sort({createdAt:-1}).populate('requesterId','name email')`.
WHY: requesters see own, admins see all.

### `updateRequest(id, data: { title?; description?; status?; adminNote? }, user): Promise<IFeatureRequest | null>`
Algorithm:
1. `FeatureRequest.findById(id)`; return null if missing.
2. `isAdmin`, `isRequester` computed; if neither → return null (same 404 as missing, ids can't be probed).
3. Track `changes[]`. Title/description edits: non-admin allowed only while `status==='pending'` else 400; only apply when different, pushing 'title'/'description'.
4. Status is admin-only (403 if non-admin changes it) — pushes `status: prev → new`. adminNote admin-only (403 otherwise) — pushes 'response note'.
5. If no changes → return request unchanged (no save/log).
6. `request.save()`; audit-log `UPDATE` with joined changes.
7. Notify requester: if `isAdmin && !isRequester && (statusChanged || changes includes 'response note')` → `notify(requesterId, 'Feature Request Update', ...)` using `STATUS_LABELS[status]`.

### `deleteRequest(id, user): Promise<IFeatureRequest | null>`
`findById` → null if missing; permission check (admin or requester else null); non-admin can only delete while `status==='pending'` else 400 'Only pending requests can be withdrawn.'; `request.deleteOne()`; audit-log `DELETE` (message 'withdrawn' if requester else 'deleted'). Returns request.

## Types / Constants
- `STATUS_LABELS: Record<string,string>` mapping pending/planned/in-progress/done/declined to display labels.
- Private field `auditLogService = new AuditLogService()`.

## Important logic (notifications fan-out)
- New request → all admins notified (persistent Notification + live SSE), except the submitter.
- Triage (status change or note added by admin) → requester notified.
- Notifications are best-effort (errors swallowed).

## Relationships
Called by feature-request controller. Uses FeatureRequest, User, Notification models; AuditLogService; NotificationManager.

## Edge cases
- No-op update (nothing changed) short-circuits before save/audit/notify.
- Non-owner access returns null (404-equivalent) rather than 403 to avoid id probing.
