# `server/src/middlewares/auth.test.ts`

**Purpose:** Vitest unit tests for `validateJwtSecret` from `./auth`. Proven from the `describe`/`it`/`expect` calls importing from `vitest`.
**Language / Size:** TypeScript / 796 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| None | — | — | Test file; no exports |

## Imports
- Internal: `./auth` → `validateJwtSecret`
- External: `vitest` → `describe, it, expect`

## Functions / Classes
No production functions. Test cases in `describe('validateJwtSecret')`:
1. **flags a missing secret** — `validateJwtSecret(undefined)` contains `'JWT_SECRET is not set.'`; `validateJwtSecret('')` has length 1.
2. **flags a short secret** — `validateJwtSecret('tooshort')` includes a problem containing `'too short'`.
3. **flags placeholder-looking secrets even when long enough** — `validateJwtSecret('changeme-changeme-changeme-changeme')` includes a `'placeholder'` problem.
4. **accepts a strong secret** — `validateJwtSecret('k9$Lp2!qWz7@xR4#nB8^vT1&mC6*dF3jH')` equals `[]`.

## Interfaces / Types / Constants / Enums / Global variables
- None.

## Important logic & design patterns
- Confirms the intended behaviour of the secret validator: missing, too-short (<32), placeholder-prefixed, and strong-secret cases. The strong-secret string is 32 chars, matching `MIN_SECRET_LENGTH`.

## Relationships (who this depends on / who likely consumes it)
- Tests `validateJwtSecret` in `server/src/middlewares/auth.ts`. Run by the Vitest test runner.

## Lifecycle (when it runs / is instantiated)
- Executes only under `vitest` (test time), not at runtime.
