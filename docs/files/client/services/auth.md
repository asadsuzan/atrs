# `client/src/services/auth.ts`
**Purpose:** Authentication and self-service account API: login, register, current-user fetch/update, email existence check, password-reset request, and password change (with token rotation). Also defines the `AuthUser` type used across the app.
**Language / Size:** TS / 2003 bytes

## Exports
Types: `UserRole` (`'admin' | 'user'`), `UserStatus` (`'pending' | 'active' | 'suspended'`), `AuthUser` interface.
Functions: `login`, `register`, `getMe`, `updateMe`, `checkEmail`, `requestPasswordReset`, `changePassword`.

### `AuthUser`
`_id, name, email, jobTitle?, role: UserRole, status: UserStatus, isRoot: boolean, mustChangePassword?, passwordResetRequested?, createdAt?`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api, setToken }` from `./api`.

## Functions
- **`login(payload: { email; password }): Promise<{ token; user: AuthUser }>`** — `POST /api/auth/login`; body = payload; returns `{ token, user }`.
- **`register(payload: { name; email; password }): Promise<{ message; user: AuthUser }>`** — `POST /api/auth/register`; returns `{ message, user }`.
- **`getMe(): Promise<AuthUser>`** — `GET /api/auth/me`.
- **`updateMe(payload: { name?; jobTitle? }): Promise<AuthUser>`** — `PATCH /api/auth/me`; self-service profile update (display name + presenter job title).
- **`checkEmail(email: string): Promise<{ exists: boolean; name? }>`** — `POST /api/auth/check-email`; body `{ email }`.
- **`requestPasswordReset(email: string): Promise<{ requested: boolean }>`** — `POST /api/auth/password-reset-request`; body `{ email }`.
- **`changePassword(currentPassword, newPassword): Promise<{ success: boolean; token? }>`** — `POST /api/auth/change-password`; body `{ currentPassword, newPassword }`. If the response includes a `token`, it calls `setToken(data.token)` to adopt the server-rotated token (old tokens are rejected after a password change).

## Error handling
No explicit try/catch. Note: `login` does NOT call `setToken` itself; token persistence for login is done by the caller (AuthContext). Only `changePassword` writes the token here.

## Relationships
- Consumed by `AuthContext`/`AuthProvider`, and the Login, Register, ForgotPassword, SetPassword, and Settings pages.
- Backend target: `/api/auth/*`.
