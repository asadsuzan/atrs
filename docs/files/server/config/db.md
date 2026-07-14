# `server/src/config/db.ts`

**Purpose:** MongoDB connection helper. Loads `.env`, registers Mongoose connection event listeners once, and connects with linear-backoff retries; reuses an existing live connection (important for serverless warm invocations). Proven from `mongoose.connect(uri)` in the retry loop and the `connectDB` default export.
**Language / Size:** TypeScript / 2117 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `connectDB` (default) | function | `connectDB(maxRetries?: number): Promise<void>` | Connect to MongoDB with retry/backoff, reusing a live connection |

## Imports
- Internal: none
- External: `mongoose`, `dotenv`, `path`

## Functions / Classes
**`registerConnectionListeners(): void`** — idempotent (guarded by module-level `listenersRegistered` flag). Registers `mongoose.connection` handlers: `'error'` (console.error), `'disconnected'` (console.warn — notes Mongoose will auto-reconnect), `'reconnected'` (console.log). WHY guard: avoid stacking duplicate listeners across repeated `connectDB` calls.

**`sleep(ms: number): Promise<void>`** — `new Promise(resolve => setTimeout(resolve, ms))`; used for backoff delay.

**`connectDB(maxRetries: number = MAX_RETRIES): Promise<void>`**
- Algorithm:
  1. `uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atrs'`.
  2. `registerConnectionListeners()`.
  3. If `mongoose.connection.readyState === 1` (connected), return early — reuse the live connection (serverless warm invocations re-run bootstrap).
  4. Loop `attempt` from 1 to `maxRetries`: try `await mongoose.connect(uri)`, log connected host, return. On error, log the failed attempt; if more attempts remain, wait `RETRY_BASE_DELAY_MS * attempt` ms (linear backoff) and retry; on the last attempt, log "Exhausted all connection attempts." and `throw error`.
- Side effects: opens a Mongoose connection; console logging.
- Error handling: rethrows the final error to the caller (does NOT `process.exit`) so lifecycle/shutdown handlers in `index.ts` can react.
- Notable branches: `readyState === 1` early return (connection reuse); `attempt < maxRetries` (retry) vs else (throw).

## Interfaces / Types / Constants / Enums / Global variables
- `MAX_RETRIES = 5` — default retry count.
- `RETRY_BASE_DELAY_MS = 2000` — backoff base (multiplied by attempt number → linear backoff: 2s, 4s, 6s, 8s).
- `listenersRegistered = false` — module-level guard flag.

## Important logic & design patterns
- Connection reuse via `readyState` check — serverless-friendly.
- Linear (not exponential) backoff: `delay = RETRY_BASE_DELAY_MS * attempt`.
- Fail-by-throw rather than fail-by-exit, delegating process control to callers.
- Note: this file calls `dotenv.config({ path: path.resolve(__dirname, '../../../.env') })` at import time (three levels up), separate from `app.ts`'s own dotenv load (two levels up).

## Relationships (who this depends on / who likely consumes it)
- Consumed by `server/src/app.ts` `bootstrap()` (`connectDB(isServerless() ? 1 : undefined)`).
- Depends on `mongoose`.

## Lifecycle (when it runs / is instantiated)
- `dotenv.config` runs at import time. `connectDB` runs when `bootstrap()` invokes it (startup / serverless cold start). Listeners registered on first `connectDB` call.

## Environment variables
- `MONGODB_URI` (optional; default `mongodb://127.0.0.1:27017/atrs`).
