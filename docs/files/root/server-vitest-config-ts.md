# `server/vitest.config.ts`

Source: `server/vitest.config.ts`

## Purpose
Vitest test-runner configuration for the server workspace.

## Config
- `defineConfig` from `vitest/config`.
- `test.environment`: `'node'` — Node environment (no jsdom).
- `test.include`: `['src/**/*.test.ts']` — only `*.test.ts` files under `src`.

## Note
No Jest is used; the server test tooling is Vitest. The `tsconfig.json` excludes both test files and this config from the `dist` build.
