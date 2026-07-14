# `server/src/middlewares/logger.ts`

**Purpose:** Colorized HTTP request logger middleware. On response `finish`, prints a multi-line, ANSI-truecolor formatted box with timestamp, method, redacted URL, status badge, duration, client IP + OS user display name, authenticated actor, and user-agent. Proven from `res.on('finish', ...)` and the `console.log` box template.
**Language / Size:** TypeScript / 4676 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `customLogger` | function | `(req: Request, res: Response, next: NextFunction) => void` | Express middleware logging each completed request |

## Imports
- Internal: none
- External: `express` (types), `child_process` → `execSync`, `os`

## Functions / Classes
**`formatStatus(status: number): string`** — colored badge: `>=500` ROSE `<status> ERR`; `>=400` ROSE `<status> BAD`; `>=300` SKY `<status> RED`; else MINT `<status> OK`.

**`formatMethod(method: string): string`** — colors GET=MINT, POST=SKY, PUT=CREAM, PATCH=PEACH, DELETE=ROSE (default RESET), then `padEnd(6)`.

**`customLogger(req, res, next)`** — 
- Records `start = Date.now()`; computes `deviceUser` from `os.userInfo().username || process.env.USERNAME || 'unknown'`, combined with cached `osFullName` if present.
- Registers `res.on('finish', ...)` (logs on completion so `req.user` populated by auth middleware is available):
  - `duration = Date.now() - start`.
  - **URL redaction:** takes `req.originalUrl || req.url`; if it contains `?`, replaces everything after with `?[redacted]`. WHY: query string can carry the SSE `?token=` JWT, which must never be logged.
  - `ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress`.
  - `userAgent = req.headers['user-agent'] || 'Unknown Agent'`.
  - `appUser = (req as any).user` → prints name/id/email or "Anonymous / Unauthenticated".
  - Prints a boxed multi-line log with `new Date().toLocaleTimeString()`.
- Calls `next()` immediately (logging is deferred to `finish`).
- Side effects: console output; (at module load) may spawn subprocesses.

**Module-level OS full-name lookup (runs once at import, cached in `osFullName`):**
- Gets username; then by platform:
  - `win32`: `execSync('wmic useraccount where name="<user>" get fullname', timeout 1500)`, parse second non-empty line ≠ 'FullName'. On failure, fallback `execSync('net user "<user>"')` and regex `/Full Name\s+(.+)/i`.
  - `darwin`: `execSync('id -F')`.
  - other (Linux): `execSync('getent passwd "<user>"')`, split on `:`, take field[4] before first comma (GECOS).
- All wrapped in nested try/catch → graceful fallback to empty string. Timeouts of 1500ms guard against hangs.

## Interfaces / Types / Constants / Enums / Global variables
- `COLOR` — record of ANSI truecolor escape strings: PEACH, MINT, SKY, CREAM, ROSE, MUTED, RESET.
- `osFullName: string` — cached OS user display name (populated at import).

## Important logic & design patterns
- Log-on-`finish` so authenticated user and final status/duration are known.
- Query-string redaction to prevent JWT leakage in logs.
- One-time, best-effort, cross-platform OS display-name resolution via shell commands with short timeouts and swallowed errors.

## Relationships (who this depends on / who likely consumes it)
- Mounted in `app.ts` (`app.use(customLogger)`) after the rate limiter and before body parsing.
- Reads `req.user` populated by `auth.ts` middlewares.

## Lifecycle (when it runs / is instantiated)
- OS name lookup runs once at module import. `customLogger` runs per request; the `finish` callback fires when each response completes.

## Environment variables
- `USERNAME` (fallback for OS username).
