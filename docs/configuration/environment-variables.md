# Environment Variables

Source-traceable inventory of every environment variable referenced in the ATRS codebase. Compiled from `.env` (keys only — values never reproduced), `.env.example`, and code grep of `process.env.*` (server) and `import.meta.env.*` (client).

Env loading: server loads via `dotenv`; `client/vite.config.ts` reads root `PORT` at build/dev time via `loadEnv(..., "../", "")` with `envDir` pointing at the repo root. No `import.meta.env.*` custom (`VITE_*`) variables are referenced anywhere in client source (grep returned zero matches) — the client only relies on Vite's built-in env and the dev proxy.

Legend for "In files": E = present in `.env`; X = present in `.env.example` (active); X(#) = commented/optional in `.env.example`.

| Var | Where used (source) | Purpose | Required? | Default |
|-----|---------------------|---------|-----------|---------|
| `PORT` | `server/src/index.ts:5`; `client/vite.config.ts:8` | Server listen port; also read by Vite to set dev proxy target. E, X | Optional | `5000` (server `index.ts`); `5000` (vite). Note: `.env`/config set `3000`. |
| `MONGODB_URI` | `server/src/config/db.ts:30` | MongoDB connection string. E, X | Optional (has fallback) | `mongodb://127.0.0.1:27017/atrs` |
| `CLIENT_ORIGIN` | `server/src/app.ts:66-67` | Comma-separated allowed CORS origins; split on `,`. Requests with no Origin always allowed. X | Optional | Falls back to vite dev origins (`http://localhost:5173,http://127.0.0.1:5173`) |
| `JWT_SECRET` | `server/src/middlewares/auth.ts:19,50,53`; fallback in `server/src/utils/crypto.ts:24` | Signs/verifies JWTs; also fallback key for GitHub token encryption. E, X | Required (fatal if missing in production — `auth.ts:54`) | none |
| `JWT_EXPIRES_IN` | `server/src/middlewares/auth.ts:74` | JWT lifetime. E, X | Optional | `7d` |
| `BCRYPT_ROUNDS` | `server/src/models/User.ts:89` | bcrypt work factor; parsed then clamped to 10..15. X(#) | Optional | `12` (clamped 10..15) |
| `ROOT_ADMIN_EMAIL` | `server/src/scripts/seedAndMigrate.ts:128` | Root admin email seeded on first boot. E, X | Required for seeding root admin | none |
| `ROOT_ADMIN_PASSWORD` | `server/src/scripts/seedAndMigrate.ts:129` | Root admin seed password. E, X | Required for seeding root admin | none |
| `ROOT_ADMIN_NAME` | `server/src/scripts/seedAndMigrate.ts:130` | Root admin seed display name. E, X | Optional | `Root Admin` |
| `GITHUB_TOKEN_SECRET` | `server/src/utils/crypto.ts:24` | Encrypts stored GitHub tokens at rest. X | Optional | Falls back to `JWT_SECRET` |
| `GITHUB_API_URL` | `server/src/utils/github.ts:16` | GitHub API base (Enterprise override); trailing slashes stripped. X(#) | Optional | `https://api.github.com` |
| `R2_ACCOUNT_ID` | `server/src/controllers/ConfigController.ts` (+ storage/appConfig) | Cloudflare R2 account id. E, X(#) | Optional (required when R2 storage active) | none |
| `R2_BUCKET` | `ConfigController.ts` | R2 bucket name. E, X(#) | Optional (required when R2 active) | none |
| `R2_PUBLIC_BASE_URL` | `ConfigController.ts` | R2 public base URL for media. E, X(#) | Optional (required when R2 active) | none |
| `R2_ACCESS_KEY_ID` | `ConfigController.ts` | R2 access key id. E, X(#) | Optional (required when R2 active) | none |
| `R2_SECRET_ACCESS_KEY` | `ConfigController.ts` | R2 secret access key. E, X(#) | Optional (required when R2 active) | none |
| `OLLAMA_URL` | `server/src/utils/ollama.ts:25` | Local Ollama daemon URL. X(#) | Optional | `http://localhost:11434` |
| `OLLAMA_CLOUD_URL` | `ConfigController.ts` | Ollama cloud endpoint (fallback when Settings blank). E, X(#) | Optional | none (Settings UI value preferred) |
| `OLLAMA_CLOUD_KEY` | `ConfigController.ts` | Ollama cloud API key (fallback when Settings blank). E, X(#) | Optional | none (Settings UI value preferred) |
| `REPO_BROWSE_ROOT` | `server/src/utils/repoAccess.ts:14` | Confines changelog folder picker / git access to this dir; paths outside rejected. No effect on Vercel. X(#) | Optional | OS home dir (per `.env.example` comment) |
| `NODE_ENV` | `server/src/middlewares/auth.ts:54`, `errorHandler.ts:28`, `ConfigController.ts` | Environment mode; gates production behavior (fatal JWT check, error verbosity). Not in `.env`/example | Optional (set by platform) | undefined (treated as non-prod) |
| `VERCEL` | `server/src/utils/appConfig.ts:12` | Detects Vercel runtime (`!!process.env.VERCEL`) to adjust config behavior. Set by Vercel platform | Optional (platform-set) | undefined |
| `USERNAME` | `server/src/middlewares/logger.ts:19,80` | OS username fallback for request/audit logging (`os.userInfo().username || process.env.USERNAME`). Set by OS | Optional (OS-set) | `''` / `'unknown'` |

## Notes
- Values in `.env` are real secrets and are intentionally NOT reproduced in this documentation.
- `NODE_ENV`, `VERCEL`, and `USERNAME` are consumed by code but are not declared in `.env` or `.env.example` (they come from the OS/hosting platform).
- Credentials precedence for R2/Ollama: values entered in the Settings UI (`app.config.json`) take precedence; env vars are the fallback (per `.env.example` comments and `ConfigController.ts`).
