# Directory Guide — Project Root (monorepo)

> The `atrs-monorepo` root (v1.0.0, private). npm workspaces `client` + `server`,
> a standalone `tools/dist-builder`, and a Vercel serverless entry `api/`.
> Grounded in [`../architecture/overview.md`](../architecture/overview.md), the
> root [`package.json`](../files/root/package-json.md), and
> [`vercel.json`](../files/root/vercel-json.md).

## Role

The root ties the two deployable workspaces together, holds the shared build/dev
scripts, the Vercel deploy configuration, and the runtime `app.config.json`.

## Layout

| Path | Role | Doc |
|---|---|---|
| `package.json` | Workspace root: `workspaces: [client, server]`, dev/build/test scripts | [`package-json`](../files/root/package-json.md) |
| `client/` | React + Vite SPA workspace | [client-src.md](client-src.md) |
| `server/` | Express + Mongoose API workspace | [server-src.md](server-src.md) |
| `api/index.ts` | Vercel serverless function: `await bootstrap(); return app(req,res)` | (see overview §2) |
| `tools/dist-builder/` | Standalone free/pro plugin distribution builder | [tools-dist-builder.md](tools-dist-builder.md) |
| `uploads/` | Local media storage root (local provider only), served at `/uploads` | — |
| `app.config.json` | Runtime app config (local FS source of truth) | [`app-config-json`](../files/root/app-config-json.md), [`app-config-example-json`](../files/root/app-config-example-json.md) |
| `vercel.json` | Deploy: build command, output dir, API/SPA rewrites | [`vercel-json`](../files/root/vercel-json.md) |
| `.env` / `.env.example` | Local env (loaded by dotenv when not serverless) | [`env`](../files/root/env.md), [`env-example`](../files/root/env-example.md) |
| `docs/` | Reverse-engineering documentation tree | — |

## Workspaces & scripts (root `package.json`)

- `dev` — `concurrently` runs `npm run dev -w server` + `-w client`.
- `build` — builds client then server (`build:client`, `build:server` also
  exposed individually).
- `start` — `npm run start -w server`.
- `lint` — client ESLint. `test` / `test:watch` — server Vitest.
- Root **dependencies** `gif.js` + `gifuct-js` are hoisted here for the client's
  GIF tooling (`components/tools`); the only root **devDependency** is
  `concurrently`.

## Two deployment modes

The same server `app` runs locally and on Vercel; the switch is
`isServerless()` = `!!process.env.VERCEL`
([`utils/appConfig`](../files/server/utils/appConfig.md)):

- **Local** — `server/src/index.ts` `app.listen(PORT||5000)`; dotenv loads
  repo-root `.env`; config from `app.config.json`; media on local `uploads/`.
- **Serverless** — `api/index.ts` per-cold-start `bootstrap()`; `trust proxy`
  on; config from the `AppConfig` Mongo singleton; media on Cloudflare R2.

`vercel.json` rewrites `/api/:path*` → `/api/index` and everything else (except
`/api/` and `/uploads/`) → `/index.html` (SPA fallback). Build command
`npm run build:client`, output `client/dist`.

## Config files (per workspace)

- **Client:** [`vite.config.ts`](../files/root/client-vite-config-ts.md),
  [`tailwind.config.js`](../files/root/client-tailwind-config-js.md),
  [`postcss.config.js`](../files/root/client-postcss-config-js.md),
  [`eslint.config.js`](../files/root/client-eslint-config-js.md),
  [`components.json`](../files/root/client-components-json.md),
  tsconfig set ([`tsconfig`](../files/root/client-tsconfig-json.md),
  [`app`](../files/root/client-tsconfig-app-json.md),
  [`node`](../files/root/client-tsconfig-node-json.md)),
  [`index.html`](../files/root/client-index-html.md).
- **Server:** [`tsconfig`](../files/root/server-tsconfig-json.md),
  [`vitest.config.ts`](../files/root/server-vitest-config-ts.md),
  [`package.json`](../files/root/server-package-json.md).

## Conventions

- **Env vars are read on the server**, not the client — the client uses the
  relative `/api` baseURL and same-origin proxy/rewrites, so it needs no
  `VITE_API_URL`.
- **Secrets** (JWT, R2, Ollama cloud key) come from `.env`/platform env or the
  app config with a write-only pattern (see
  [conventions](../appendix/conventions.md)).
- `app.config.json` is the **local** source of truth; on serverless the DB
  `AppConfig` singleton takes over with a 30s stale-while-revalidate cache.
