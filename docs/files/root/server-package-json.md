# `server/package.json`

Source: `server/package.json`

## Purpose
Manifest for the `server` workspace: an Express 5 + Mongoose (MongoDB) + TypeScript API. Built with `tsc`, run with `tsx`/`nodemon` in dev and compiled `node dist` in prod. Tests via Vitest.

## Fields
| Field | Value |
|-------|-------|
| `name` | `server` |
| `version` | `1.0.0` |
| `main` | `index.js` |
| `license` | `ISC` |

## Scripts (exact commands)
| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `nodemon --watch src --watch ../.env --watch ../app.config.json --ext ts,json --exec tsx src/index.ts` | Dev server; restarts on changes to `src`, root `.env`, and root `app.config.json`; runs TS directly via `tsx`. |
| `build` | `tsc` | Compile TS → `dist` (per `tsconfig.json`). |
| `start` | `node dist/index.js` | Run compiled server. |
| `test` | `vitest run` | Run tests once. |
| `test:watch` | `vitest` | Tests in watch mode. |

## Dependencies (runtime) — role
| Package | Version | Role |
|---------|---------|------|
| `@aws-sdk/client-s3` | `^3.1080.0` | S3-compatible client for Cloudflare R2 media storage. |
| `bcryptjs` | `^3.0.3` | Password hashing. |
| `chokidar` | `^3.6.0` | File watching (config/repo watching). |
| `cors` | `^2.8.6` | CORS middleware. |
| `dotenv` | `^17.4.2` | Loads `.env`. |
| `express` | `^5.2.1` | HTTP framework. |
| `express-rate-limit` | `^8.5.2` | Rate limiting. |
| `helmet` | `^8.2.0` | Security headers. |
| `jsonwebtoken` | `^9.0.3` | JWT auth. |
| `mongoose` | `^9.6.3` | MongoDB ODM. |
| `multer` | `^2.1.1` | Multipart/file upload handling. |
| `slugify` | `^1.6.9` | Slug generation. |
| `zod` | `^4.4.3` | Schema validation. |

## devDependencies — role
| Package | Version | Role |
|---------|---------|------|
| `@types/bcryptjs`, `@types/cors`, `@types/express`, `@types/jsonwebtoken`, `@types/multer`, `@types/node` | various | Type definitions. |
| `nodemon` | `^3.1.14` | Dev auto-restart. |
| `tsx` | `^4.22.4` | Run TS without precompile (dev). |
| `typescript` | `^6.0.3` | Compiler. |
| `vitest` | `^4.1.9` | Test runner. |
