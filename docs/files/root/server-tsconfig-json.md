# `server/tsconfig.json`

Source: `server/tsconfig.json`

## Purpose
TypeScript compiler config for the server. Emits CommonJS to `dist` (consumed by `node dist/index.js`).

## compilerOptions
| Option | Value |
|--------|-------|
| `target` | `es2020` |
| `module` | `commonjs` |
| `rootDir` | `./src` |
| `outDir` | `./dist` |
| `esModuleInterop` | `true` |
| `forceConsistentCasingInFileNames` | `true` |
| `strict` | `true` |
| `skipLibCheck` | `true` |

## Files
- `include`: `["src/**/*"]`
- `exclude`: `["src/**/*.test.ts", "vitest.config.ts"]` — tests and the vitest config are not compiled into `dist`.
