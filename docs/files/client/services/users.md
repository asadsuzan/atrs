# `client/src/services/users.ts`
**Purpose:** Admin user management — list, approve, suspend, reactivate, set role, delete (with reassignment), reset password.
**Language / Size:** TS / 1271 bytes

## Exports (functions)
`getUsers`, `approveUser`, `suspendUser`, `reactivateUser`, `setUserRole`, `deleteUser`, `resetUserPassword`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.
- `type { AuthUser, UserRole }` from `./auth`.

## Functions
- **`getUsers(params?: { status?; role? }): Promise<AuthUser[]>`** — `GET /api/users`; query = params.
- **`approveUser(id: string): Promise<AuthUser>`** — `PATCH /api/users/{id}/approve` (no body).
- **`suspendUser(id: string): Promise<AuthUser>`** — `PATCH /api/users/{id}/suspend` (no body).
- **`reactivateUser(id: string): Promise<AuthUser>`** — `PATCH /api/users/{id}/reactivate` (no body).
- **`setUserRole(id: string, role: UserRole): Promise<AuthUser>`** — `PATCH /api/users/{id}/role`; body `{ role }`.
- **`deleteUser(id: string, reassignTo?: string): Promise<any>`** — `DELETE /api/users/{id}`; query `{ reassignTo }` only when provided.
- **`resetUserPassword(id: string, password: string): Promise<{ id: string }>`** — `POST /api/users/{id}/reset-password`; body `{ password }`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the admin Users page (route `/users`, gated by `RequireAdmin`).
- Backend target: `/api/users/*`.
