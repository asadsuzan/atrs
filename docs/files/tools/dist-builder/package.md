# `tools/dist-builder/package.json`

**Purpose:** NPM package manifest for the dist-builder engine + CLI.

**Language / Size:** JSON / 809 bytes

## Fields
- `name`: `@atrs/dist-builder`; `version`: `0.1.0`; `license`: `UNLICENSED`; `private`: true.
- `description`: splits a mixed free/pro WordPress plugin source tree into separate free/pro zips by stripping pro-marked code, then building/packaging each variant.
- `type`: `commonjs`.
- `main`: `dist/index.js`; `types`: `dist/index.d.ts`.
- `bin`: `{ "dist-builder": "dist/cli.js" }` — the CLI executable.

## Scripts
- `build`: `tsc -p tsconfig.json`.
- `dev`: `tsx src/cli.ts` (run CLI without compiling).
- `test`: `vitest run`.
- `test:watch`: `vitest`.

## Dependencies
- Runtime: `fast-glob ^3.3.3`, `zod ^3.23.8`.
- Dev: `@types/node ^20.14.0`, `tsx ^4.16.0`, `typescript ^5.5.0`, `vitest ^2.0.0`.

## Engines
- `node >=18.17`.

## Relationships & pipeline order
Declares the CLI entry (`dist/cli.js`) and the engine's public entry (`dist/index.js`). `fast-glob` powers removals/verify/marker file discovery; `zod` powers `config.ts` validation.
