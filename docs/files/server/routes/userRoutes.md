# `server/src/routes/userRoutes.ts`
**Purpose:** Express router for admin user management (approve/suspend/reactivate, role changes, password reset, ownership reassignment, deletion incl. SSE cascade); mounted at `/api/users` (app.ts: `app.use('/api/users', requireAuth, requireActive, requireAdmin, userRoutes)`).
**Language / Size:** TypeScript / 754 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` + `requireAdmin` are applied at the mount in `app.ts` (admin-only surface, per file comment).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | (mount: requireAdmin) | — | `UserController.listUsers` |
| PATCH | `/:id/approve` | (mount: requireAdmin) | — | `UserController.approveUser` |
| PATCH | `/:id/suspend` | (mount: requireAdmin) | — | `UserController.suspendUser` |
| PATCH | `/:id/reactivate` | (mount: requireAdmin) | — | `UserController.reactivateUser` |
| PATCH | `/:id/role` | (mount: requireAdmin) | — | `UserController.setUserRole` |
| POST | `/:id/reset-password` | (mount: requireAdmin) | — | `UserController.resetUserPassword` |
| POST | `/:id/reassign` | (mount: requireAdmin) | — | `UserController.reassignOwnership` |
| POST | `/:id/delete-stream` | (mount: requireAdmin) | — | `UserController.deleteUserStream` |
| DELETE | `/:id` | (mount: requireAdmin) | — | `UserController.deleteUser` |
## Relationships
- Controller: `../controllers/UserController`.
## Notes
- Entire router is admin-gated at the mount. No per-route validation middleware (id/body validation handled in the controller).
- `POST /:id/delete-stream` is an SSE (streaming) endpoint that cascades a user deletion; `DELETE /:id` is the non-streaming counterpart.
