# `server/src/middlewares/errorHandler.ts`

**Purpose:** Express centralized error-handling middleware. Maps Zod validation errors to 400, MongoDB duplicate-key errors to 409, and everything else to `err.statusCode || 500`, redacting internal messages/stack in production. Proven from the 4-arg signature and the status-code branches.
**Language / Size:** TypeScript / 1290 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `errorHandler` | function | `(err: any, req: Request, res: Response, next: NextFunction) => Response` | Express error-handling middleware |

## Imports
- Internal: none
- External: `express` (types), `zod` → `ZodError`

## Functions / Classes
**`errorHandler(err, req, res, next)`** — 4-argument Express error middleware.
- Algorithm:
  1. `console.error(err.stack)`.
  2. If `err instanceof ZodError` → 400 `{ message: 'Validation Error', errors: err.issues || err.errors }`. (Reads `issues` first, falls back to `errors` — covers Zod versions/shapes.)
  3. If `err.code === 11000` (Mongo duplicate key) → derive `field` from `Object.keys(err.keyPattern || err.keyValue || {})` joined, defaulting to `'value'`; return 409 `A record with this <field> already exists.`
  4. Else: `statusCode = err.statusCode || 500`; `isProd = NODE_ENV === 'production'`; `safeToExpose = statusCode < 500 || err.expose === true`. Respond with `message = (isProd && !safeToExpose) ? 'Internal Server Error' : (err.message || 'Internal Server Error')` and `stack = isProd ? null : err.stack`.
- Side effects: logs stack to stderr; writes HTTP response.
- Notable branches: WHY the `safeToExpose` gate — in production, don't leak internal exception text for unexpected 5xx; only surface messages for deliberate `createHttpError` (statusCode < 500) or errors explicitly marked `expose === true`.
- `next` is declared but unused (required for Express to treat it as an error handler by arity).

## Interfaces / Types / Constants / Enums / Global variables
- None.

## Important logic & design patterns
- Error-type dispatch (Zod → 400, Mongo 11000 → 409, default → statusCode/500).
- Production information-hiding via `isProd` + `safeToExpose` + null stack.

## Relationships (who this depends on / who likely consumes it)
- Mounted last in `app.ts` (`app.use(errorHandler)`).
- Pairs with `validate.ts` (which forwards `ZodError` via `next(error)`) and with `createHttpError`-style errors thrown by controllers.

## Lifecycle (when it runs / is instantiated)
- Runs per request only when an error is passed to `next(err)` or thrown in a sync handler.

## Environment variables
- `NODE_ENV` (controls production redaction of message/stack).
