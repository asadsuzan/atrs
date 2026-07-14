# `server/src/controllers/UserController.ts`
**Purpose:** Admin user management: list, approve/suspend/reactivate, set role, reset password, reassign ownership, delete (JSON + SSE cascade).
**Language / Size:** TypeScript / 3367 bytes
## Exports
Named exports: `listUsers`, `approveUser`, `suspendUser`, `reactivateUser`, `setUserRole`, `deleteUser`, `resetUserPassword`, `deleteUserStream`, `reassignOwnership`.
## Imports (Internal / External)
- Internal: `../services/UserService` (`UserService`), `../models/User` (`User`), `../utils/sseStream` (`runStreamJob`).
- External: `express`.
- Module-level singleton: `userService`.
## Handlers / Functions
- **listUsers(req,res,next)** — Reads `req.query`. `userService.listUsers(req.query)`. `200`.
- **approveUser(req,res,next)** — Reads `req.params.id`. `userService.approve(id)`. `200`.
- **suspendUser(req,res,next)** — Reads `req.params.id`. `userService.suspend(id)`. `200`.
- **reactivateUser(req,res,next)** — Reads `req.params.id`. `userService.reactivate(id)`. `200`.
- **setUserRole(req,res,next)** — Reads `req.params.id`, `req.body.role` (coerced: `'admin'` else `'user'`). `userService.setRole(id, role)`. `200`.
- **deleteUser(req,res,next)** — Reads `req.params.id`, `req.query.reassignTo` (optional). If `reassignTo`, calls `userService.reassignOwnership(id, reassignTo)` first; then `userService.deleteUser(id)`. `200`.
- **resetUserPassword(req,res,next)** — Reads `req.params.id`, `req.body.password`. Manual validation: string ≥8 chars (`400`), ≤200 chars (`400`). `userService.resetPassword(id, password)`. `200`.
- **deleteUserStream(req,res)** — SSE cascade delete. Reads `req.params.id`. Pre-flight (clean JSON before stream): `User.findById(id)` → `404` if missing; `target.isRoot` → `403 'The root administrator account cannot be deleted'`. Then `runStreamJob(req,res, ctx => userService.deleteUserCascade(id, req.user!, ctx))`.
- **reassignOwnership(req,res,next)** — Reads `req.params.id`, `req.body.toUserId`. `userService.reassignOwnership(id, toUserId)`. `200`.
## Important logic & design patterns
- No Zod on these routes (routes file registers no `validate`); manual validation for password length and role coercion.
- Root-admin protection in the streaming delete pre-flight.
- Optional ownership reassignment before user delete.
- SSE cascade delete via `runStreamJob`.
## Relationships
- Routed by `userRoutes.ts` (mounted `/api/users`, behind `requireAuth`+`requireActive`+`requireAdmin`).
- Delegates to `UserService`; reads `User` model directly for pre-flight checks.
