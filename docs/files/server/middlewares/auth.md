# `server/src/middlewares/auth.ts`

**Purpose:** JWT authentication and authorization. Signs/verifies HS256 tokens, validates the configured JWT secret (with fail-fast at boot), and provides Express middlewares to require authentication (header or SSE query), an active account, and admin role. Proven from `jwt.sign`/`jwt.verify` and the exported middleware functions.
**Language / Size:** TypeScript / 6350 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `JwtPayload` | interface | `{ sub: string; role: 'admin'\|'user'; isRoot: boolean; name?: string; email?: string; iat?: number }` | Shape of the JWT payload |
| `validateJwtSecret` | function | `(secret: string \| undefined) => string[]` | Returns list of problems with a secret (empty = OK) |
| `assertJwtSecretAtBoot` | function | `(): void` | Fail-fast secret check at startup |
| `signToken` | function | `(user: { id; role; isRoot; name?; email? }) => string` | Sign an HS256 JWT |
| `requireAuth` | function | `(req, res, next) => void` | Require valid Bearer token; attaches `req.user` |
| `requireAuthSSE` | function | `(req, res, next) => void` | Auth for SSE: accepts header OR `?token=` |
| `requireActive` | function (async) | `(req, res, next) => Promise<void>` | Require account exists and is active; sync role/name; reject pre-password-change tokens |
| `requireAdmin` | function | `(req, res, next) => void` | Require `role === 'admin'` |

## Imports
- Internal: `../models/User` → `User`; `../types/auth` → type `AuthUser`
- External: `express` (types `Request, Response, NextFunction`), `jsonwebtoken` (as `jwt`)

## Functions / Classes
**`getSecret(): string`** (private) — returns `process.env.JWT_SECRET`; throws `Error('JWT_SECRET is not configured')` if unset.

**`validateJwtSecret(secret): string[]`** — pure-ish validator (takes secret as arg for testability).
- If no secret → `['JWT_SECRET is not set.']` (returns early).
- If `secret.length < 32` (MIN_SECRET_LENGTH) → pushes "too short" message.
- If `/^(changeme|secret|default|password)/i` matches → pushes "placeholder value" message.
- Returns accumulated problems.

**`assertJwtSecretAtBoot(): void`**
- Gets problems from `validateJwtSecret(process.env.JWT_SECRET)`; if none, return.
- `missing = !process.env.JWT_SECRET`; `fatal = missing || NODE_ENV === 'production'`. WHY: a missing secret is always fatal; a weak secret is fatal only in production, warning elsewhere.
- Logs each problem with `[server][FATAL]` or `[server][WARN]` prefix.
- If fatal: logs refusal and `process.exit(1)`.
- Side effect: may terminate the process.

**`signToken(user): string`** — builds a `JwtPayload` (`sub=user.id`, plus role/isRoot/name/email) and `jwt.sign(payload, getSecret(), { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' })`.

**`verifyToken(token): JwtPayload | null`** (private) — `jwt.verify(token, getSecret(), { algorithms: ['HS256'] })`; returns null on any throw. Algorithm pinned to HS256 to prevent alg-confusion attacks.

**`requireAuth(req, res, next)`** — reads `Authorization` header, extracts token only if it `startsWith('Bearer ')` (slice(7)). If no token → 401 `Authentication required`. If `verifyToken` returns null → 401 `Invalid or expired token`. Else attaches `req.user = { id: decoded.sub, role, isRoot, name, email, iat }` and calls `next()`. WHY not query string: query strings leak into logs/Referer/history — a JWT there is a leaked credential; SSE is the sole exception via `requireAuthSSE`.

**`requireAuthSSE(req, res, next)`** — same as `requireAuth` but if no Bearer token and `req.query.token` is a string, uses that. WHY: browser `EventSource` cannot set custom headers. Intended ONLY for streaming routes.

**`requireActive(req, res, next)`** (async) — 
- If no `req.user` → 401.
- `User.findById(req.user.id).select('name email status role isRoot passwordChangedAt')`.
- If not found → 401 `Account no longer exists`.
- If `status !== 'active'` → 403 `Account is not active`.
- If `account.passwordChangedAt` and `req.user.iat` and `iat*1000 < passwordChangedAt.getTime() - 1000` → 401 `Session expired` (1s slack absorbs clock rounding). WHY: password reset/change invalidates previously issued tokens.
- Syncs `req.user.role/isRoot/name/email` from DB, then `next()`.
- Errors forwarded to `next(error)`.

**`requireAdmin(req, res, next)`** — if no `req.user` → 401; if `req.user.role !== 'admin'` → 403 `Administrator access required`; else `next()`.

## Interfaces / Types / Constants / Enums / Global variables
- `interface JwtPayload` (see Exports).
- `MIN_SECRET_LENGTH = 32`.

## Important logic & design patterns
- Algorithm pinning (HS256) on both sign and verify — defends against JWT alg-confusion.
- Token-in-header-only policy, with a narrowly-scoped SSE exception.
- Password-change token invalidation via `passwordChangedAt` vs `iat`.
- Fail-fast secret validation at boot with prod-vs-dev severity split.
- DB-backed freshness: `requireActive` re-reads the user each request and re-syncs the principal.

## Relationships (who this depends on / who likely consumes it)
- Depends on `User` model and `AuthUser` type.
- Consumed by `app.ts` (`requireAuth, requireActive, requireAdmin, assertJwtSecretAtBoot`) as route guards and boot check; `signToken` likely used by auth controllers; `requireAuthSSE` by SSE/streaming routes (e.g. notifications/jobs); `validateJwtSecret` covered by `auth.test.ts`.

## Lifecycle (when it runs / is instantiated)
- `assertJwtSecretAtBoot` runs once inside `bootstrap()`. The middlewares run per matching request. `signToken`/`verifyToken` run per auth operation.

## Environment variables
- `JWT_SECRET` (required — enforced), `JWT_EXPIRES_IN` (optional; default `7d`), `NODE_ENV` (affects fatal-vs-warn severity for weak secrets).
