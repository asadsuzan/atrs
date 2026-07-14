# `client/tsconfig.node.json`

Source: `client/tsconfig.node.json`

## Purpose
TypeScript config for Node-context build tooling files (the Vite config). Same bundler/no-emit strictness as the app config but with Node typings instead of DOM.

## compilerOptions
| Option | Value |
|--------|-------|
| `tsBuildInfoFile` | `./node_modules/.tmp/tsconfig.node.tsbuildinfo` |
| `target` | `es2023` |
| `lib` | `["ES2023"]` (no DOM) |
| `module` | `esnext` |
| `types` | `["node"]` |
| `skipLibCheck` | `true` |
| `moduleResolution` | `bundler` |
| `allowImportingTsExtensions` | `true` |
| `verbatimModuleSyntax` | `true` |
| `moduleDetection` | `force` |
| `noEmit` | `true` |
| `noUnusedLocals` | `true` |
| `noUnusedParameters` | `true` |
| `erasableSyntaxOnly` | `true` |
| `noFallthroughCasesInSwitch` | `true` |

- `include`: `["vite.config.ts"]`
