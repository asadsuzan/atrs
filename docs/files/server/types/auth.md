# `server/src/types/auth.ts`

**Purpose:** Declares the `AuthUser` shape attached to `req.user` and augments the Express `Request` interface globally with an optional `user` property. Proven from the `interface AuthUser` and the `declare global { namespace Express { interface Request { user?: AuthUser } } }` block.
**Language / Size:** TypeScript / 573 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `AuthUser` | interface | `{ id: string; role: UserRole; isRoot: boolean; name?: string; email?: string; iat?: number }` | Authenticated principal attached to `req.user` |

## Imports
- Internal: `../models/User` → type `UserRole`
- External: none

## Functions / Classes
- None (types only).

## Interfaces / Types / Constants / Enums / Global variables
- **`interface AuthUser`**:
  - `id: string`
  - `role: UserRole` (imported from the User model)
  - `isRoot: boolean`
  - `name?: string`
  - `email?: string`
  - `iat?: number` — JWT "issued at" (seconds); used to reject tokens minted before a password change.
- **Global augmentation:** `declare global { namespace Express { interface Request { user?: AuthUser } } }` — adds `req.user?: AuthUser` to every Express `Request`. (ESLint `no-namespace` disabled for the block.)

## Important logic & design patterns
- TypeScript module augmentation / global declaration merging to type `req.user` across the codebase without casts.
- Reuses `UserRole` from the model as the single source of truth for the role union.

## Relationships (who this depends on / who likely consumes it)
- Depends on `../models/User` (`UserRole`).
- Consumed by `middlewares/auth.ts` (imports `AuthUser`, assigns `req.user`) and any handler reading `req.user`.

## Lifecycle (when it runs / is instantiated)
- Compile-time only (type declarations); the global augmentation applies wherever the file is included in the TS program.
