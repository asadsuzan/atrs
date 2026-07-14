# `tools/dist-builder/tsconfig.json`

**Purpose:** TypeScript compiler configuration for building `src/` → `dist/`.

**Language / Size:** JSON / 465 bytes

## compilerOptions
- `target`: `ES2021`; `module`: `CommonJS`; `moduleResolution`: `node`; `lib`: `["ES2021"]`.
- `outDir`: `dist`; `rootDir`: `src`.
- `declaration`: true (emits `.d.ts`).
- `strict`: true; `esModuleInterop`: true; `skipLibCheck`: true; `forceConsistentCasingInFileNames`: true; `resolveJsonModule`: true.
- `types`: `["node"]`.

## include / exclude
- `include`: `["src"]`.
- `exclude`: `["dist", "node_modules", "__tests__", "fixtures"]` (tests are not part of the compiled build).

## Relationships & pipeline order
Used by `npm run build` (`tsc -p tsconfig.json`) to produce `dist/`, which `package.json` points at via `main`/`bin`.
