# Appendix — Technology Stack

> Full stack grouped by workspace. **Versions are copied verbatim from the
> `package.json` files** (root, `client`, `server`, `tools/dist-builder`) — see
> [`../files/root/package-json.md`](../files/root/package-json.md),
> [`../files/root/client-package-json.md`](../files/root/client-package-json.md),
> and [`../files/root/server-package-json.md`](../files/root/server-package-json.md).
> Ranges are as declared (`^`/`~`), not resolved lockfile versions.

## Root (`atrs-monorepo` v1.0.0)

npm workspaces `client` + `server`; scripts orchestrate both.

| Package | Version | Purpose |
|---|---|---|
| concurrently | ^8.2.2 | Run client + server dev servers together (`dev`) |
| gif.js | ^0.2.0 | Client-side GIF encoding (image/GIF tools) |
| gifuct-js | ^2.1.2 | GIF decoding/parsing (image/GIF tools) |

## Client (React SPA, `type: module`)

**Runtime & build:** React 19, Vite 8, TypeScript ~6.0, Tailwind 3.4.

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| react / react-dom | ^19.2.6 | UI runtime |
| react-router-dom | ^7.17.0 | SPA routing |
| @tanstack/react-query | ^5.101.0 | Server-state fetching/caching (query keys per feature) |
| axios | ^1.17.0 | HTTP client (shared `services/api.ts`) |
| zod | ^4.4.3 | Client-side schema validation (shared with server) |
| react-hook-form | ^7.77.0 | Form state |
| @hookform/resolvers | ^5.4.0 | Zod ↔ react-hook-form bridge |
| @radix-ui/react-* | 1.x–2.x | Accessible primitives (dialog, select, popover, dropdown, checkbox, label, alert-dialog, slot) — the `ui/` kit |
| class-variance-authority | ^0.7.1 | Variant-based component styling |
| clsx | ^2.1.1 | Conditional class names |
| tailwind-merge | ^3.6.0 | Merge/dedupe Tailwind classes |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| lucide-react | ^1.17.0 | Icon set |
| framer-motion | ^12.40.0 | Animations / page transitions |
| lenis | ^1.3.23 | Smooth scrolling (`SmoothScroll`) |
| cmdk | ^1.1.1 | Command palette (⌘K) |
| sonner | ^2.0.7 | Toast notifications |
| driver.js | ^1.4.0 | Interactive onboarding tour (`lib/tour`) |
| date-fns | ^4.4.0 | Date formatting/math |
| recharts | ^3.8.1 | Charts (Reports/Dashboard) |
| react-markdown | ^10.1.0 | Render markdown (changelogs/readme) |
| dompurify | ^3.4.11 | Sanitize rich-text HTML |
| @dnd-kit/core, /sortable, /utilities | ^6.3.1 / ^10.0.0 / ^3.2.2 | Drag-and-drop ordering |
| jspdf | ^4.2.1 | PDF export (lazy-loaded) |
| html2canvas / html2canvas-pro | ^1.4.1 / ^2.2.0 | DOM→canvas capture for exports |
| pptxgenjs | ^4.0.1 | PowerPoint export (presentation mode) |
| jszip | ^3.10.1 | Zip generation (exports) |
| file-saver | ^2.0.5 | Trigger client-side downloads |

### Dev dependencies (client)

| Package | Version | Purpose |
|---|---|---|
| vite | ^8.0.12 | Dev server / bundler |
| @vitejs/plugin-react | ^6.0.1 | React fast-refresh plugin |
| typescript | ~6.0.2 | Type checking (`tsc -b`) |
| tailwindcss | ^3.4.19 | Utility CSS |
| @tailwindcss/postcss / postcss / autoprefixer | ^4.3.0 / ^8.5.15 / ^10.5.0 | CSS pipeline |
| eslint | ^10.3.0 | Linting |
| @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | ^10.0.1 / ^8.59.2 / ^7.1.1 / ^0.5.2 / ^17.6.0 | ESLint config/plugins |
| @types/* (node, react, react-dom, file-saver) | — | Type defs |

## Server (Express API)

**Runtime & build:** Node + Express 5, Mongoose 9, TypeScript ^6.0, `tsx`
(dev) / `tsc` (build), Vitest tests.

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^5.2.1 | HTTP framework |
| mongoose | ^9.6.3 | MongoDB ODM (models/schemas) |
| zod | ^4.4.3 | Request validation (`validate` HOF, `schemas/`) |
| jsonwebtoken | ^9.0.3 | JWT sign/verify (HS256) |
| bcryptjs | ^3.0.3 | Password hashing |
| helmet | ^8.2.0 | Security headers |
| cors | ^2.8.6 | CORS allow-list |
| express-rate-limit | ^8.5.2 | `apiLimiter` (1000/IP/15min) |
| multer | ^2.1.1 | Multipart upload handling |
| @aws-sdk/client-s3 | ^3.1080.0 | Cloudflare R2 (S3-compatible) media storage |
| slugify | ^1.6.9 | Per-owner product slugs (`utils/slug`) |
| dotenv | ^17.4.2 | Load repo-root `.env` (local mode only) |
| chokidar | ^3.6.0 | Filesystem watching |

### Dev dependencies (server)

| Package | Version | Purpose |
|---|---|---|
| tsx | ^4.22.4 | Run TS directly (dev via nodemon) |
| nodemon | ^3.1.14 | Restart on change (watches `src`, `.env`, `app.config.json`) |
| typescript | ^6.0.3 | Build (`tsc` → `dist/`) |
| vitest | ^4.1.9 | Unit tests (`*.test.ts`) |
| @types/* (node, express, cors, jsonwebtoken, bcryptjs, multer) | — | Type defs |

## Tools — `@atrs/dist-builder` (v0.1.0, standalone)

`type: commonjs`, `bin: dist-builder`, Node `>=18.17`. **Not** a workspace; has
its own dependency tree (notably its own `zod@^3`).

| Package | Version | Purpose |
|---|---|---|
| fast-glob | ^3.3.3 | Glob matching for transform targets |
| zod | ^3.23.8 | Validate `dist.config.json` |
| tsx | ^4.16.0 (dev) | Run CLI in dev |
| typescript | ^5.5.0 (dev) | Build to `dist/` |
| vitest | ^2.0.0 (dev) | Tests (`__tests__/`) |
| @types/node | ^20.14.0 (dev) | Type defs |

## Shared / cross-cutting

- **Zod** is used in all three TS codebases (client `^4`, server `^4`, dist-builder
  `^3`) for schema validation.
- **TypeScript** everywhere (client `~6.0.2`, server `^6.0.3`, dist-builder `^5.5`).
- **Vitest** is the test runner for both the server and dist-builder.
- **MongoDB** (via Mongoose) is the only datastore; **Cloudflare R2** and the
  local `uploads/` dir are the media stores.
- **External services:** WordPress.org (plugin info API 1.2 + SVN), GitHub REST
  (fetch-based, no SDK), Ollama (local/cloud LLM) — see
  [`../architecture/overview.md §7`](../architecture/overview.md).
- **Hosting:** Vercel (serverless function `api/index.ts` + static `client/dist`),
  configured by [`vercel.json`](../files/root/vercel-json.md).
