# Deploying ATRS to Vercel (free tier)

The app deploys as **one Vercel project**: the Vite client is served as static
files and the whole Express API runs as a single serverless function
([api/index.ts](api/index.ts)). Both share the same domain, so no CORS setup is
needed.

```
Browser ──► https://<your-app>.vercel.app
              ├── /            → client/dist (static, SPA fallback to index.html)
              └── /api/*       → api/index.ts → Express app (server/src/app.ts)
                                    ├── MongoDB Atlas (data + runtime config)
                                    └── Cloudflare R2 (media uploads)
```

## 1. Create a free MongoDB Atlas cluster

Vercel has no database — the local `mongodb://localhost:27017/atrs` won't work.

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a
   free **M0** cluster.
2. Create a database user (Database Access → Add New Database User).
3. Under **Network Access**, allow `0.0.0.0/0` (Vercel functions have no fixed
   IPs).
4. Copy the connection string, e.g.
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/atrs?retryWrites=true&w=majority`

To migrate existing local data:

```sh
mongodump --uri="mongodb://localhost:27017/atrs"
mongorestore --uri="<your-atlas-uri>" dump/atrs --nsInclude="atrs.*"
```

## 2. Create the Vercel project

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new)
   (or run `npx vercel` from the repo root).
2. Leave the **Root Directory** as the repo root — `vercel.json` already sets
   the build command (`npm run build:client`) and output directory
   (`client/dist`).

## 3. Set environment variables

In the Vercel project → Settings → Environment Variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | The Atlas connection string from step 1. |
| `JWT_SECRET` | ✅ | Long random string (e.g. `openssl rand -base64 48`). The server refuses to boot in production without a strong one. |
| `ROOT_ADMIN_EMAIL` | ✅ (first boot) | Root admin account is created on the first request. |
| `ROOT_ADMIN_PASSWORD` | ✅ (first boot) | |
| `ROOT_ADMIN_NAME` | – | Defaults to "Root Admin". |
| `R2_ACCOUNT_ID` | ✅ | Cloudflare R2 media storage. Media **must** use R2 on Vercel — the serverless filesystem is read-only, so local disk uploads are disabled. Copy the values from your local `.env`. |
| `R2_BUCKET` | ✅ | |
| `R2_PUBLIC_BASE_URL` | ✅ | e.g. `https://pub-….r2.dev` or a custom domain. |
| `R2_ACCESS_KEY_ID` | ✅ | |
| `R2_SECRET_ACCESS_KEY` | ✅ | |
| `OLLAMA_CLOUD_URL` | – | Ollama Cloud endpoint for the changelog generator / AI assist (e.g. `https://ollama.com/api/generate`). |
| `OLLAMA_CLOUD_KEY` | – | Ollama Cloud API key. Like the R2 secret, it's write-only in the Settings UI and never sent to the browser. |
| `GITHUB_TOKEN_SECRET` | – | Key for encrypting stored GitHub tokens; falls back to `JWT_SECRET`. |
| `CLIENT_ORIGIN` | – | Only needed if the client is ever served from a *different* domain than the API. |

All of these mirror the local `.env` (see `.env.example`). Credentials live
only in environment variables — `app.config.json` is untracked and holds no
secrets; when the `R2_*` variables are all set, a fresh deploy uses R2
automatically without touching Settings.

Deploy (or redeploy) after saving the variables.

## 4. First boot

The first request after a deploy runs the usual startup work automatically:
connect to Atlas, create the root admin from `ROOT_ADMIN_*`, and run
migrations. Log in with the root admin credentials, then check
**Settings → Storage → Test connection**.

## How it differs from running locally

- **Runtime config lives in MongoDB, not on disk.** Vercel's filesystem is
  read-only, so Settings are persisted to an `appconfigs` collection instead of
  `app.config.json` / `.env`. Credentials always resolve from environment
  variables when Settings leaves them blank. The *Server* section of Settings
  (port / MongoDB URI) has no effect on Vercel — those come from environment
  variables.
- **Media storage must be Cloudflare R2.** Local-disk uploads return a clear
  error on Vercel.
- **The changelog generator's local-git features** (scanning a repo folder on
  your machine, the folder picker) only work when the server runs on your
  machine — the serverless function can't see your disk. Ollama **cloud** mode
  works fine. On a self-hosted instance the folder picker and git access are
  confined to `REPO_BROWSE_ROOT` (defaults to the OS home directory); set it to
  the parent folder that holds your repos if they live elsewhere.

## Free-tier caveats

- **4.5 MB request body limit** on serverless functions — uploads bigger than
  that will fail even though the app allows 25 MB locally. Keep media small or
  upload large files to R2 directly.
- **Function timeout** is capped (60 s configured in `vercel.json`, the Hobby
  ceiling). SSE streams are torn down at that limit:
  - The notifications stream reconnects automatically, and the client now backs
    off after repeated failures and falls back to polling `GET /api/notifications`
    every 60 s — so notifications still arrive even across reconnects.
  - **Long-running WP.org imports / bulk jobs that exceed 60 s will be cut off
    mid-run.** Keep batches small on Vercel, or run large imports from a
    self-hosted instance. (This is inherent to the free tier; a durable fix
    means moving imports to a background worker/queue.)
- **Cross-instance job cancellation is handled:** the cancel flag is mirrored in
  MongoDB (`jobsessions` collection, auto-expiring) and the running instance
  polls it, so "Cancel" works even when it lands on a different function
  instance than the one running the job.
- **Realtime notification fan-out is best-effort across instances.** A live SSE
  event is only pushed to clients connected to the same instance that emitted
  it; the 60 s polling fallback covers the rest. For guaranteed instant
  fan-out you'd add a shared pub/sub (Redis, Pusher/Ably) — not required for a
  small team.
- **Cold starts**: the first request after idle reconnects to Atlas (~1–2 s).

## ⚠️ Rotate the old keys

`app.config.json` is no longer tracked by git and all credentials now live in
`.env` / platform environment variables. However, earlier commits in git
history still contain an Ollama Cloud API key and R2 access key ID. If this
repo is (or ever becomes) public or shared, **rotate both keys** — removing
the file from the current tree does not remove it from history.
