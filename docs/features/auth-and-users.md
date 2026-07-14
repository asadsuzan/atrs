# Authentication & User Management

**Summary:** JWT (HS256) authentication with a localStorage token, an admin-approval registration gate, an admin-mediated forgot-password flow, forced one-time-password changes, full admin user lifecycle management (approve/suspend/role/reset/reassign/cascade-delete with root-admin protection), and an audit trail of domain actions.

## User-facing entry points
- **`/login`** — sign in (`PublicOnly`; authenticated users redirect to `/`).
- **`/register`** — sign up; creates a `pending` account awaiting admin approval (`PublicOnly`).
- **`/forgot-password`** — two-step: verify email exists, then submit a reset *request* that notifies admins (`PublicOnly`). No reset link/email is ever sent.
- **`/set-password`** — forced password change for users flagged `mustChangePassword` after an admin reset; self-gated (no wrapper). `ProtectedLayout` also routes such users here.
- **`/users`** — admin-only user management (`RequireAdmin`).
- **`/audit-logs`** — audit log viewer (any authenticated user; user-filter is admin-only).

## Client pieces
**Pages**
- `client/src/pages/Login.tsx` — `useAuth().login`; return-to-origin redirect via `location.state.from.pathname` (default `/`, `replace: true`). Does not itself handle `mustChangePassword` (enforced downstream by `ProtectedLayout`).
- `client/src/pages/Register.tsx` — `useAuth().register`; on success flips to an "awaiting approval" panel (does NOT log in). Client password floor `minLength={8}`.
- `client/src/pages/ForgotPassword.tsx` — 4-state machine (`enter-email` → `found`/`not-found` → `requested`). Calls `checkEmail` then `requestPasswordReset` (raw service calls, no react-query). A `checkEmail` error degrades to `not-found`.
- `client/src/pages/SetPassword.tsx` — three-way self-gate (`loading` → `!user` → `!mustChangePassword`); validates length ≥8 and match, calls `changePassword`, then `refreshMe()` before navigating home so the cleared flag propagates.
- `client/src/pages/admin/Users.tsx` — query `['users']` → `getUsers()`. Mutations `approve`/`suspend`/`reactivate`/`role` (+ direct `resetUserPassword`). Deletion runs through `useJobStream().runJob({ url: '/users/${id}/delete-stream' })` (SSE cascade). Root users show a Crown + "Protected" with no actions. Client-side pagination; `crypto.getRandomValues`-based strong-password generator; "Reset requested" badge from `passwordResetRequested`.
- `client/src/pages/AuditLogs.tsx` — query `['auditLogs', queryParams]` → `getAuditLogs`; `['products']` (name resolution) and `['users']` (`enabled: isAdmin`, user filter). Debounced search; every filter change resets to page 1; color-coded action badges; ACTIVITY rows enrich entity name with a product name parsed from `details`.

**Contexts**
- `client/src/contexts/AuthContext.tsx` — holds `user`, `loading`, derived `isAdmin` (`user?.role === 'admin'`), and `login`/`register`/`logout`/`refreshMe`. Bootstraps the session on mount via `refreshMe` (short-circuits when no token). `login` calls `setToken` + `setUser`; `register` intentionally does not log in; `logout` clears token + user.

**Services**
- `client/src/services/auth.ts` — `login`, `register`, `getMe`, `updateMe`, `checkEmail`, `requestPasswordReset`, `changePassword`; exports `AuthUser`, `UserRole`, `UserStatus`. `changePassword` adopts a server-rotated `token` via `setToken` if returned. (Login token persistence is done by `AuthContext`, not this service.)
- `client/src/services/users.ts` — `getUsers`, `approveUser`, `suspendUser`, `reactivateUser`, `setUserRole`, `deleteUser(id, reassignTo?)`, `resetUserPassword`.
- `client/src/services/auditLogs.ts` — `getAuditLogs(params)`.
- `client/src/services/api.ts` (shared axios): request interceptor injects `Authorization: Bearer <atrs_token>` from localStorage; response interceptor clears token and full-page-redirects to `/login` on `401`.

## Server pieces
**Auth — `/api/auth`** (mounted public; per-route guards). Route → `AuthController` → `AuthService`.
- `POST /register` (authLimiter, `registerSchema`) → `register`: normalize email, 409 if exists, hash, create `status:'pending'`, notify all admins → `201` with approval message.
- `POST /login` (authLimiter, `loginSchema`) → `login`: bcrypt compare (timing-equalized against `DUMMY_HASH` for unknown emails), 403 if pending/suspended, `signToken` → `{ token, user }`.
- `GET /me`, `PATCH /me` (requireAuth+requireActive; `updateMeSchema`) → `me` / `updateMe`.
- `POST /check-email` (authLimiter, `emailOnlySchema`) → `checkEmail` → `{ exists, name? }`.
- `POST /password-reset-request` (authLimiter, `emailOnlySchema`) → `requestPasswordReset`: if user and not root, set `passwordResetRequested(At)`, notify admins; always returns `{ requested: true }`.
- `POST /change-password` (requireAuth+requireActive, `changePasswordSchema`) → `changePassword`: verify current, hash new, clear `mustChangePassword`, set `passwordChangedAt`, issue a fresh token. Also serves the forced post-reset change.

**Users (admin) — `/api/users`** (mount: requireAuth + requireActive + **requireAdmin**). `UserController` → `UserService`. No Zod; manual validation in the controller.
- `GET /` `listUsers` (enum-validates `status`/`role` query to block Mongo-operator injection).
- `PATCH /:id/approve|suspend|reactivate` → `setStatus` (emits `access-change` notification).
- `PATCH /:id/role` (role coerced to `'admin'` else `'user'`) → `setRole`.
- `POST /:id/reset-password` (password 8–200 validated in controller) → `resetPassword`: sets `mustChangePassword`, clears reset-request flags, bumps `passwordChangedAt` (invalidates the user's JWTs).
- `POST /:id/reassign` → `reassignOwnership` (updateMany `ownerId` across Product/Activity/Version/ProductMarketing).
- `POST /:id/delete-stream` — SSE cascade delete via `runStreamJob`; JSON pre-flight returns `404` if missing, `403` if `isRoot`.
- `DELETE /:id` (optional `?reassignTo`) — simple (non-cascading) delete; reassigns first if requested.
- All mutating ops go through `getEditableUser` which 403s on `isRoot` (root protection).

**Audit logs — `/api/audit-logs`** (mount: requireAuth + requireActive). `AuditLogController.getAuditLogs` → `AuditLogService`. Dual-mode: any filter param (`page`/`entityType`/`action`/`startDate`/`search`/`userId`/`limit`) → filtered/paginated `getLogs`; otherwise `getRecentLogs(limit, default 20)`. Read scoping: non-admins see only their own logs (`scope`); admins see all. `logEvent` is fire-and-forget (swallows its own errors) and notifies root admins of non-root actors' activity via SSE.

**Middleware & crypto**
- `server/src/middlewares/auth.ts` — HS256, alg-pinned on sign & verify (defends alg-confusion). Guards: `requireAuth` (Bearer header only), `requireAuthSSE` (also `?token=` for `EventSource`), `requireActive` (re-reads user each request; 401 if gone, 403 if not active, 401 `Session expired` if `iat*1000 < passwordChangedAt - 1s`; re-syncs role/name/email), `requireAdmin`. `assertJwtSecretAtBoot` fails fast on a missing secret (always) or weak/placeholder secret (fatal in production, warning otherwise); `MIN_SECRET_LENGTH = 32`. `signToken` uses `expiresIn = JWT_EXPIRES_IN || '7d'`.
- `server/src/utils/crypto.ts` — AES-256-GCM `sealSecret`/`unsealSecret` with the `enc:v1:` prefix; used to encrypt secrets at rest (e.g. the user's GitHub PAT), not for passwords. Key is scrypt-derived from `GITHUB_TOKEN_SECRET || JWT_SECRET`.

## Data model
- **User** (`users`): `name`, `email` (unique+index, lowercased), `jobTitle` (presenter subtitle), `passwordHash` (deleted in `toJSON`), `role` (`admin`/`user`), `status` (`pending`/`active`/`suspended`), `isRoot`, `mustChangePassword`, `passwordResetRequested(At)`, `passwordChangedAt` (JWT-invalidation cutoff), `githubToken` (`select:false`, encrypted, stripped in `toJSON`), `githubLogin`, `githubConnectedAt`, timestamps. Method `comparePassword` (bcrypt); exported `hashPassword`; `BCRYPT_ROUNDS` clamped 10–15 (default 12).
- **AuditLog** (`auditlogs`): `action` (CREATE/UPDATE/DELETE), `entityType` (PRODUCT/ACTIVITY/VERSION/MARKETING/ISSUE/TASK/MILESTONE/FEATURE_REQUEST), `userId` (→User, indexed), `userName`, `entityId` (polymorphic, no ref), `entityName`, `details`, `createdAt` only.
- Cascade delete also touches **Product**, **Activity**, **Version**, **ProductMarketing** (owned records) and media files.

## Notable behaviors & edge cases
- **Approval gate:** registration creates `pending`; login is blocked (403) for `pending`/`suspended`. Admins are notified on registration.
- **Token invalidation:** both self `changePassword` and admin `resetPassword` set `passwordChangedAt`; `requireActive` rejects any token issued before it (1s slack for clock rounding). `changePassword` issues a fresh token to keep the current session alive.
- **Forced change loop:** admin reset sets `mustChangePassword` → `ProtectedLayout` and `SetPassword`'s self-gate route the user to `/set-password`; completing it clears the flag (and `refreshMe` propagates the clear before navigation).
- **Forgot-password is admin-mediated:** no email/token is sent; `check-email` reveals account existence (intentional UX, but an enumeration leak); `password-reset-request` returns a constant `{ requested: true }` and silently ignores root accounts (not probeable).
- **Login timing equalization:** unknown emails still run a bcrypt compare against `DUMMY_HASH`, and both unknown-email and wrong-password return the same 401 message.
- **Root protection:** `isRoot` users cannot be modified or deleted (`getEditableUser` 403; delete-stream pre-flight 403); the admin UI shows "Protected".
- **Cascade delete semantics:** `deleteUserCascade` deletes each owned product (with its media), then orphaned activities/marketing/versions, then the account; cancellation is checked only between products (the in-flight product completes; on cancel, orphan cleanup and account deletion are skipped). `deleteUser` (non-stream) does NOT cascade.
- **Injection hardening:** `listUsers` enum-validates string query params; `AuditLogService.getLogs` escapes the `search` regex; JWT verify is alg-pinned.
- **Audit fan-out:** only root admins get the live SSE event, and only for non-root (or anonymous/system, shown as "System / Guest") actors; audit-write failures never disrupt the underlying operation.
- **Admin-reset password display:** shown once in plaintext in the reset dialog; `resetUserPassword` is called directly (not via a declared mutation) and manually invalidates `['users']`.

## Related docs
- Per-file (client): [Login](../files/client/pages/Login.md), [Register](../files/client/pages/Register.md), [ForgotPassword](../files/client/pages/ForgotPassword.md), [SetPassword](../files/client/pages/SetPassword.md), [admin/Users](../files/client/pages/admin/Users.md), [AuditLogs](../files/client/pages/AuditLogs.md), [AuthContext](../files/client/contexts/AuthContext.md), [auth service](../files/client/services/auth.md), [users service](../files/client/services/users.md), [auditLogs service](../files/client/services/auditLogs.md)
- Per-file (server): [authRoutes](../files/server/routes/authRoutes.md), [userRoutes](../files/server/routes/userRoutes.md), [auditLogRoutes](../files/server/routes/auditLogRoutes.md), [AuthController](../files/server/controllers/AuthController.md), [UserController](../files/server/controllers/UserController.md), [AuditLogController](../files/server/controllers/AuditLogController.md), [AuthService](../files/server/services/AuthService.md), [UserService](../files/server/services/UserService.md), [AuditLogService](../files/server/services/AuditLogService.md), [User model](../files/server/models/User.md), [AuditLog model](../files/server/models/AuditLog.md), [auth.schema](../files/server/schemas/auth.schema.md), [middlewares/auth](../files/server/middlewares/auth.md), [utils/crypto](../files/server/utils/crypto.md)
- API: [Server API reference §2 Auth, §15 Users, §20 Audit logs](../api/server-api-endpoints.md), [Client → Endpoint map](../api/client-endpoint-map.md)
