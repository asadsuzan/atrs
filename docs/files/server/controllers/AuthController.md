# `server/src/controllers/AuthController.ts`
**Purpose:** Authentication and self-service account handlers: register, login, me, updateMe, checkEmail, password-reset request, change password.
**Language / Size:** TypeScript / 2064 bytes
## Exports
Named exports: `register`, `login`, `me`, `updateMe`, `checkEmail`, `requestPasswordReset`, `changePassword`.
## Imports (Internal / External)
- Internal: `../services/AuthService` (`AuthService`).
- External: `express` (`Request`, `Response`, `NextFunction`).
- Module-level singleton: `const authService = new AuthService()`.
## Handlers / Functions
- **register(req,res,next)** — Reads `req.body` (validated by `registerSchema`). Calls `authService.register(req.body)`. `201 {message:'Registration successful. Your account is awaiting administrator approval.', user}`.
- **login(req,res,next)** — Reads `req.body` (`loginSchema`). Calls `authService.login(req.body)`. `200` with result (token/user).
- **me(req,res,next)** — Reads `req.user!.id`. Calls `authService.me(id)`. `200` with user.
- **updateMe(req,res,next)** — Reads `req.user!.id`, `req.body` (`updateMeSchema`). Calls `authService.updateMe(id, req.body)`. `200`.
- **checkEmail(req,res,next)** — Reads `req.body.email` (`emailOnlySchema`). Calls `authService.checkEmail(email)`. `200`.
- **requestPasswordReset(req,res,next)** — Reads `req.body.email` (`emailOnlySchema`). Calls `authService.requestPasswordReset(email)`. `200`.
- **changePassword(req,res,next)** — Reads `req.body.currentPassword`, `req.body.newPassword` (`changePasswordSchema`), `req.user!.id`. Calls `authService.changePassword(id, currentPassword, newPassword)`. `200`.
## Important logic & design patterns
- Thin controllers; all logic in `AuthService`. Uniform try/catch → `next(error)`.
- Register response advertises the admin-approval gate.
## Relationships
- Routed by `authRoutes.ts` (mounted `/api/auth`, public). Register/login/check-email/password-reset-request are behind `authLimiter`; me/updateMe/change-password behind `requireAuth`+`requireActive`.
- Delegates to `AuthService`.
