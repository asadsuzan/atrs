# `client/tsconfig.app.json`

Source: `client/tsconfig.app.json`

## Purpose
TypeScript config for the client application source (`src`). Bundler-mode, no emit (Vite handles the transform).

## compilerOptions
| Option | Value | Notes |
|--------|-------|-------|
| `tsBuildInfoFile` | `./node_modules/.tmp/tsconfig.app.tsbuildinfo` | Incremental build cache. |
| `target` | `es2023` | |
| `lib` | `["ES2023", "DOM"]` | Browser + modern JS. |
| `module` | `esnext` | |
| `types` | `["vite/client"]` | Vite env typings (`import.meta.env`). |
| `skipLibCheck` | `true` | |
| `moduleResolution` | `bundler` | |
| `allowImportingTsExtensions` | `true` | |
| `verbatimModuleSyntax` | `true` | |
| `moduleDetection` | `force` | |
| `noEmit` | `true` | Vite emits, not tsc. |
| `jsx` | `react-jsx` | |
| `noUnusedLocals` | `true` | Lint-level strictness. |
| `noUnusedParameters` | `true` | |
| `erasableSyntaxOnly` | `true` | |
| `noFallthroughCasesInSwitch` | `true` | |
| `paths` | `{ "@/*": ["./src/*"] }` | `@` alias → `src` (mirrors vite alias & components.json). |

- `include`: `["src"]`
