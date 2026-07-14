# `tools/dist-builder/README.md`

**Purpose:** Human-facing documentation for the dist-builder tool: what it does, how it decides "pro", usage, pipeline overview, tests.

**Language / Size:** Markdown / 3734 bytes

## Contents summary (source-traceable)
Splits a single mixed free/pro WordPress plugin source tree into two zips:
- `<slug>.zip` — wp.org-safe free build, pro-marked code physically removed.
- `<slug>-pro.zip` — full build.
It strips pro-marked source then runs the plugin's own build + packaging per variant. States the reusable engine + CLI is exposed via `runDistribution()`.

### "How it decides what is pro" (5 mechanisms)
1. Whole files/folders — manifest `variants.free.remove` / `variants.pro.remove`.
2. Inline pro code — `@pro:start` / `@pro:end` comment markers (free build only); any comment style; unbalanced markers are a hard error.
3. Whole-file flag — `@pro-file` near the top.
4. Pro defaults in JSON — `jsonPatches` dot-path removals.
5. Header/Freemius tweaks — `textEdits` (`drop`, or `replace`/`with`/`flags`).
6. Safety net — `verifyFreeHasNo` verification aborts the build if listed tokens survive.

### Usage documented
```
cd tools/dist-builder
npm install
npm run build
node dist/cli.js --src /path/to/offcanvas-block
npm run dev -- --src /path/to/offcanvas-block
```
Flags table: `--src`, `--out`, `--only free,pro`, `--dry-run`, `--work`. Get started by copying `examples/offcanvas-block/dist.config.json` into the plugin root and adding markers.

### Pipeline (as documented in README)
```
fork source → remove pro paths → strip @pro markers (free)
            → patch JSON → edit header text → verify (free)
            → npm run build → npm run plugin-zip → emit <slug>[-pro].zip
```
Notes `node_modules` is symlinked from source (`reuseNodeModules`); `install: true` falls back to `npm ci`.

### Tests
`npm test` (vitest) covers the pure transforms.

## Relationships
Descriptive companion to the code; matches `cli.ts` flags, `config.ts` schema, and `index.ts` pipeline.
