# `.env` (root)

Source: `.env` (git-ignored; secrets — VALUES NOT REPRODUCED)

## Purpose
Actual environment variables for the running server. Git-ignored (`.gitignore`) and in `.vercelignore`. Loaded by the server via `dotenv` and consumed via `process.env.*`. On Vercel these are set in the platform's env-var settings instead.

## Keys present (values intentionally omitted)
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ROOT_ADMIN_EMAIL`
- `ROOT_ADMIN_PASSWORD`
- `ROOT_ADMIN_NAME`
- `OLLAMA_CLOUD_URL`
- `OLLAMA_CLOUD_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

See `docs/configuration/environment-variables.md` for full purpose/usage of each key and additional variables referenced in code but not present in this file.
