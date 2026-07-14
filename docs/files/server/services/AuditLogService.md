# `server/src/services/AuditLogService.ts`
**Purpose:** Writes audit-log entries for entity actions, notifies root admins of non-root activity via SSE, and serves scoped/paginated log queries.
**Language / Size:** TypeScript / 3372 bytes

## Exports
- `class AuditLogService`

## Imports (Internal / External)
Internal: `AuditLog` default + `IAuditLog` type (../models/AuditLog), `User` (../models/User), `notificationManager` (./NotificationManager), `escapeRegex` (../utils/sanitize), `AuthUser` type (../types/auth).

## Functions / Methods

### `logEvent(action, entityType, entityId, entityName, details?, actor?): Promise<void>`
Params typed: action/entityType from `IAuditLog`; `actor?: { id: string; name?: string }`.
Purpose: persist an audit entry and notify root admins.
Algorithm (wrapped in try/catch):
1. `AuditLog.create({ action, entityType, entityId, entityName, details, userId: actor?.id, userName: actor?.name })`.
2. Determine if actor is root: default `false`; if `actor?.id`, `User.findById(actor.id).select('isRoot')`, `isRootActor = !!userDoc?.isRoot`.
3. If NOT root actor: `notificationManager.sendToRootAdmins('user-activity', {...})` with log id, action, entityType, entityName, details, `userName: actor?.name || 'System / Guest'`, userId, createdAt.
Error handling: any failure caught and logged via `console.error('Failed to write audit log:', error)` — never throws (audit failures don't break the underlying operation).
Branch WHY: root admins are notified only about others' actions, not their own.

### `scope(user?: AuthUser): Record<string, any>` (private)
Returns `{ userId: null }` if no user; `{}` if `user.role === 'admin'` (sees all); else `{ userId: user.id }` (only own actions).

### `getRecentLogs(limit = 20, user?): Promise<IAuditLog[]>`
`AuditLog.find(this.scope(user)).sort({createdAt:-1}).limit(limit).populate('userId','name email')`.

### `getLogs(query: any, user?): Promise<any>`
Algorithm: filter = `{ ...scope(user) }`; add `entityType`, `action`; admin-only `userId` filter; date range on `createdAt` (endDate → 23:59:59.999); `search` → `$or` regex (escaped) on `entityName` and `details`. Pagination: page default 1, limit default 30, skip computed. `Promise.all([find(...).sort desc .skip.limit.populate, countDocuments])`. Returns `{ data, total, page, totalPages: Math.ceil(total/limit) }`.

## Types / Constants
None beyond imported `IAuditLog`.

## Important logic (audit logging)
- Central logging used by Activity/Issue/Version/FeatureRequest/Marketing services and others.
- Fire-and-forget: swallows its own errors so callers are never disrupted.
- Fan-out: only root admins get the live SSE event, and only for non-root actors. Anonymous/system events (no actor) count as non-root → notified.
- Access control on reads: non-admins only see their own logs.

## Relationships
Consumed by many services (ActivityService, IssueService, VersionService, FeatureRequestService, ProductMarketingService, and controllers reading logs). Uses AuditLog + User models and NotificationManager.

## Edge cases
- No actor (system/anonymous events): `isRootActor` stays false so root admins ARE notified; userName shown as 'System / Guest'.
- DB write failure is silently logged, not propagated.
