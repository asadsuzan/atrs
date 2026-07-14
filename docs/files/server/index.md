# `server/src/index.ts`

**Purpose:** Local (non-serverless) HTTP server entrypoint. Triggers `bootstrap()`, starts the Express app listening on a port, and installs graceful-shutdown handlers for `SIGTERM`/`SIGINT`. Proven from `app.listen(...)` (line 14) and the `process.on('SIGTERM'/'SIGINT', ...)` handlers.
**Language / Size:** TypeScript / 1489 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| None | — | — | Side-effecting entrypoint module; exports nothing |

## Imports
- Internal: `./app` → `app` (default) and `{ bootstrap }`
- External: `http`, `mongoose`

## Functions / Classes
**`shutdown(signal: string): void`** — graceful shutdown handler.
- Algorithm:
  1. Log received signal.
  2. `server.close((err) => { ... })` — stop accepting new connections; on callback, log any close error, then `mongoose.connection.close(false)`.
  3. On successful Mongo close: log and `process.exit(0)`. On error: log and `process.exit(1)`.
  4. Independently, `setTimeout(() => { log; process.exit(1); }, 10000).unref()` — force-exit if graceful close hangs past 10s. `.unref()` so the timer itself doesn't keep the process alive.
- Side effects: closes HTTP server and Mongo connection; exits the process.

**Module top-level:**
- `port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000`.
- `bootstrap().catch((err) => console.error(...))` — kicks off boot but does NOT await it; the server starts listening regardless so a slow DB doesn't block boot (requests fail until the connection is up, per comment).
- `server = app.listen(port, '0.0.0.0', () => log running URL)`.
- `process.on('SIGTERM', () => shutdown('SIGTERM'))` and `process.on('SIGINT', () => shutdown('SIGINT'))`.

## Interfaces / Types / Constants / Enums / Global variables
- `port: number` — listen port.
- `server: http.Server` — the listening server.
- `shutdown` — the const arrow shutdown handler.

## Important logic & design patterns
- **Non-blocking boot:** listening begins immediately; `bootstrap()` runs in parallel and only logs on failure.
- **Graceful shutdown with hard timeout fallback** (10s force exit, unref'd).
- Binds to `0.0.0.0` (all interfaces).

## Relationships (who this depends on / who likely consumes it)
- Depends on `./app` (`app`, `bootstrap`) and `mongoose` (for connection close).
- This is a top-level entrypoint, not imported by other modules; it is the process the local dev/prod server runs. The Vercel deployment uses a different entrypoint (not in this file set).

## Lifecycle (when it runs / is instantiated)
- Runs once when the Node process starts. Lives until a `SIGTERM`/`SIGINT` (or the 10s force-exit timer) terminates it.

## Environment variables
- `PORT` (optional; default 5000).
