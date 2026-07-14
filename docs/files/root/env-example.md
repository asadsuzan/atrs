# `.env.example` (root)

Source: `.env.example`

## Purpose
Documented template for `.env`. Lists every server env var with inline comments; commented-out (`#`) lines are optional overrides.

## Keys and comments (as in file)
| Key | Example / default in file | Status | Comment summary |
|-----|---------------------------|--------|-----------------|
| `PORT` | `3000` | active | Server port. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/atrs` | active | MongoDB connection string. |
| `CLIENT_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | active | Comma-separated allowed browser origins for CORS. Requests with no Origin header (curl, server-to-server) always allowed. Defaults to vite dev origins if unset. |
| `JWT_SECRET` | `change-me-to-a-long-random-string` | active | Auth token signing secret. |
| `JWT_EXPIRES_IN` | `7d` | active | JWT lifetime. |
| `BCRYPT_ROUNDS` | `12` | commented | bcrypt work factor; default 12, clamped 10..15. |
| `ROOT_ADMIN_EMAIL` | `admin@example.com` | active | Seeded on first boot if no root admin exists. |
| `ROOT_ADMIN_PASSWORD` | `change-me-strong-password` | active | Root admin seed password. |
| `ROOT_ADMIN_NAME` | `Root Admin` | active | Root admin seed name. |
| `GITHUB_TOKEN_SECRET` | `change-me-to-a-long-random-string` | active | Encrypts stored GitHub tokens at rest. Falls back to `JWT_SECRET` if unset; set a dedicated value so rotating one secret doesn't invalidate the other. |
| `GITHUB_API_URL` | `https://api.github.com` | commented | Override only for GitHub Enterprise Server. |
| `R2_ACCOUNT_ID` | `your-cloudflare-account-id` | commented | Cloudflare R2 media storage. Credentials belong here or in host env — never in `app.config.json` or git. Settings-UI values take precedence. |
| `R2_BUCKET` | `your-bucket-name` | commented | R2 bucket. |
| `R2_PUBLIC_BASE_URL` | `https://pub-xxxxxxxx.r2.dev` | commented | R2 public base URL. |
| `R2_ACCESS_KEY_ID` | `your-r2-access-key-id` | commented | R2 access key. |
| `R2_SECRET_ACCESS_KEY` | `your-r2-secret-access-key` | commented | R2 secret key. |
| `OLLAMA_URL` | `http://localhost:11434` | commented | Local Ollama daemon URL override. |
| `OLLAMA_CLOUD_URL` | `https://ollama.com/api/generate` | commented | Cloud-mode endpoint; fallback when Settings leaves it blank. |
| `OLLAMA_CLOUD_KEY` | `your-ollama-cloud-api-key` | commented | Cloud API key; fallback when Settings leaves it blank. |
| `REPO_BROWSE_ROOT` | `C:\Users\you\repos` | commented | Changelog generator: confines folder picker / git-based changelog generation to this dir (defaults to OS home dir). Paths outside it rejected. No effect on Vercel. |

Note: `.env.example` includes `CLIENT_ORIGIN`, `BCRYPT_ROUNDS`, `GITHUB_TOKEN_SECRET`, `GITHUB_API_URL`, `OLLAMA_URL`, `REPO_BROWSE_ROOT` which are NOT present in the live `.env`.
