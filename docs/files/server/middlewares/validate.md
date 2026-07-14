# `server/src/middlewares/validate.ts`

**Purpose:** Higher-order Express middleware factory that validates `{ body, query, params }` against a Zod schema and writes the parsed (coerced/stripped) values back onto the request. Proven from `schema.parse({ body, query, params })` and the write-back logic.
**Language / Size:** TypeScript / 786 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `validate` | function (factory) | `(schema: ZodSchema<any>) => (req, res, next) => void` | Returns a middleware that validates & replaces request parts |

## Imports
- Internal: none
- External: `express` (types), `zod` → `ZodSchema`

## Functions / Classes
**`validate(schema)`** → returns `(req, res, next)`:
- Algorithm:
  1. `parsed = schema.parse({ body: req.body, query: req.query, params: req.params })`.
  2. If `parsed.body !== undefined` → `req.body = parsed.body`.
  3. If `parsed.query !== undefined` → delete every existing key on `req.query`, then `Object.assign(req.query, parsed.query)`. WHY delete-then-assign: `req.query` is a getter-backed object that can't be reassigned directly in newer Express, so it's mutated in place.
  4. Same delete-then-assign pattern for `req.params`.
  5. `next()`.
- Error handling: any thrown error (notably `ZodError` from `.parse`) is caught and forwarded via `next(error)` — handled downstream by `errorHandler` (400 Validation Error).
- Notable branches: each of body/query/params is only written back when the schema produced a defined value for it (schemas may omit sections).

## Interfaces / Types / Constants / Enums / Global variables
- None.

## Important logic & design patterns
- Middleware-factory (closure over `schema`).
- In-place mutation of `req.query`/`req.params` (delete keys + `Object.assign`) rather than reassignment.
- Delegates error formatting to the central `errorHandler`.

## Relationships (who this depends on / who likely consumes it)
- Consumed by route modules that pass a Zod schema (e.g. `validate(someSchema)`); not imported in `app.ts` directly.
- Pairs with `errorHandler.ts` which turns the forwarded `ZodError` into a 400 response.

## Lifecycle (when it runs / is instantiated)
- The factory runs at route-setup time; the returned middleware runs per matching request.
