# `vercel.json`

Source: `vercel.json`

## Purpose
Vercel deployment configuration: builds the client SPA, serves it as static output, and routes API traffic to a serverless function.

## Fields
| Field | Value | Meaning |
|-------|-------|---------|
| `$schema` | `https://openapi.vercel.sh/vercel.json` | Schema for editor validation. |
| `buildCommand` | `npm run build:client` | Only the client is built on Vercel (→ `npm run build -w client`). |
| `outputDirectory` | `client/dist` | Static assets served from client Vite build output. |
| `functions."api/index.ts".maxDuration` | `60` | The `api/index.ts` serverless function may run up to 60s. |

## Rewrites (order matters)
1. `{ "source": "/api/:path*", "destination": "/api/index" }` — all `/api/*` requests routed to the single serverless entry `api/index`.
2. `{ "source": "/((?!api/|uploads/).*)", "destination": "/index.html" }` — SPA fallback: every path except `/api/*` and `/uploads/*` serves `index.html` (client-side routing).

## Related
- The serverless entry is `api/index.ts` (root `api/` directory).
- Client build produces `client/dist` (see `client/vite.config.ts`).
