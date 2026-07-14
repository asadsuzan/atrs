# `server/src/routes/authRoutes.ts`
**Purpose:** Express router for authentication and self-service account management; mounted at `/api/auth` (app.ts: `app.use('/api/auth', authRoutes)` — mounted as a **public** router, so guards are applied per-route inside the file).
**Language / Size:** TypeScript / 1983 bytes
## Middleware applied (router-level)
- None global to the router. A dedicated `authLimiter` (`express-rate-limit`) is defined in-file: 15-minute window, max 10 attempts/IP, `skipSuccessfulRequests: true` (only failed attempts count), tighter than the global `/api` limiter. Applied per-route to login/register/email-lookup/reset-request.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/register` | authLimiter, validate | `registerSchema` | `AuthController.register` |
| POST | `/login` | authLimiter, validate | `loginSchema` | `AuthController.login` |
| GET | `/me` | requireAuth, requireActive | — | `AuthController.me` |
| PATCH | `/me` | requireAuth, requireActive, validate | `updateMeSchema` | `AuthController.updateMe` |
| POST | `/check-email` | authLimiter, validate | `emailOnlySchema` | `AuthController.checkEmail` |
| POST | `/password-reset-request` | authLimiter, validate | `emailOnlySchema` | `AuthController.requestPasswordReset` |
| POST | `/change-password` | requireAuth, requireActive, validate | `changePasswordSchema` | `AuthController.changePassword` |
## Relationships
- Controller: `../controllers/AuthController`.
- Schemas: `auth.schema` (`registerSchema`, `loginSchema`, `emailOnlySchema`, `changePasswordSchema`, `updateMeSchema`).
- Middleware: `../middlewares/validate`, `../middlewares/auth` (`requireAuth`, `requireActive`).
## Notes
- Router is mounted publicly; `requireAuth`/`requireActive` are applied per-route (not at mount). `register`, `login`, `check-email`, `password-reset-request` are public (rate-limited); `me`, `update me`, `change-password` require an authenticated + active user.
- Forgot-password is a two-step flow: `/check-email` (account lookup) then `/password-reset-request` (records a request that notifies admins).
- `/change-password` also serves the forced one-time-password change after an admin reset.
