# `client/vite.config.ts`

Source: `client/vite.config.ts`

## Purpose
Vite build/dev configuration for the client. Uses a function form `defineConfig(({ mode }) => ...)` to load root-level env and configure a dev proxy to the API server.

## Behavior
- Loads env from repo root: `loadEnv(mode, path.resolve(__dirname, "../"), "")` — reads all vars (empty prefix) from `../` (root `.env`).
- `const port = rootEnv.PORT || 5000` — server port sourced from root `PORT`, defaulting to `5000`.
- `const serverUrl = http://127.0.0.1:${port}` — target for the dev proxy.

## Returned config
| Key | Value | Meaning |
|-----|-------|---------|
| `plugins` | `[react()]` | `@vitejs/plugin-react`. |
| `resolve.alias` | `{ "@": path.resolve(__dirname, "./src") }` | `@` → `src` (matches tsconfig `paths`). |
| `envDir` | `path.resolve(__dirname, "../")` | Env files read from repo root, not `client/`. |
| `server.host` | `true` | Listen on all network interfaces. |
| `server.proxy` | `{ "/api": serverUrl, "/uploads": serverUrl }` | Dev-time proxy of API + uploads to the backend. |

## Note
The default `5000` here differs from `.env`/`app.config.json` `PORT=3000`; the actual proxy target follows whatever `PORT` is set in the root `.env`.
