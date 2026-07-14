# Directory Guide — `tools/dist-builder`

> A **standalone** CommonJS/TypeScript CLI package (`@atrs/dist-builder`,
> v0.1.0), independent of the client/server workspaces. It splits a mixed
> free/pro WordPress plugin source tree into separate **free** and **pro**
> distributable zips by stripping pro-marked code, then builds and packages each
> variant. Docs: [`../files/tools/dist-builder/`](../files/tools/dist-builder/).

## Purpose

Given one plugin source tree that contains both free and pro code, produce two
clean distributables:

- **free** — pro code removed (marked blocks/files stripped, files removed,
  JSON/text patched), then *verified* to contain no residual pro tokens.
- **pro** — keeps all code; only its own removals/patches applied.

Package `bin` is `dist-builder` → `dist/cli.js`. It is not part of the npm
workspaces (`type: "commonjs"`, its own `zod@^3`, `fast-glob`, `tsx`, `vitest`).

## Layout

| Path | Role | Doc |
|---|---|---|
| `src/cli.ts` | CLI entry (`bin: dist-builder`); parse flags → run → print summary | [`cli`](../files/tools/dist-builder/src/cli.md) |
| `src/index.ts` | Orchestration engine: `runDistribution()` (fork → transform → verify → build → zip) | [`index`](../files/tools/dist-builder/src/index.md) |
| `src/config.ts` | Loads/validates `dist.config.json` (Zod), `CONFIG_FILENAME` | [`config`](../files/tools/dist-builder/src/config.md) |
| `src/fork.ts` | Copies the source into a per-variant working dir (`forkVariant`) | [`fork`](../files/tools/dist-builder/src/fork.md) |
| `src/build.ts` | Runs the plugin's own build command and zips output (`buildVariant`) | [`build`](../files/tools/dist-builder/src/build.md) |
| `src/transforms/markers.ts` | Strips `@pro:start/@pro:end` blocks and `@pro-file` files (free only) | [`markers`](../files/tools/dist-builder/src/transforms/markers.md) |
| `src/transforms/jsonPatches.ts` | Applies per-variant dot-path JSON `remove`/`set` ops | [`jsonPatches`](../files/tools/dist-builder/src/transforms/jsonPatches.md) |
| `examples/offcanvas-block/dist.config.json` | Example config | [`dist.config`](../files/tools/dist-builder/examples/offcanvas-block/dist.config.md) |
| `README.md` | Usage docs | [`README`](../files/tools/dist-builder/README.md) |

(`src/transforms/removals.ts`, `textEdits.ts`, and `verify.ts` are consumed by
`index.ts` — see the `index` doc for their roles in the pipeline.)

## Pipeline (per variant, from `index.ts`)

`runDistribution(srcDir, opts)`:
1. `loadConfig(srcDir)` — parse & validate `dist.config.json`.
2. Link/copy `siblingDeps` into the work root once.
3. For each variant (`free`, `pro`) sequentially, `processVariant`:
   **fork → removals → (free only) marker strip → JSON patch → text edit →
   (free only) verify → build → zip → copy to `outDir`.**
4. Return a `RunResult { slug, outDir, variants: VariantReport[] }`.

The **free** variant is the only one that gets marker stripping and verification;
verification throws if any pro token survives (up to 10 offenders listed).

## Marker convention (`markers.ts`)

- `@pro-file` in the first 5 lines → whole file removed.
- lines between `@pro:start` and `@pro:end` (inclusive) removed; pairs may nest.
- Works in any line-comment style (`//`, `/* */`, `#`, `<!-- -->`) → JS/TS/JSX,
  SCSS, PHP.
- Unbalanced/stray markers are a hard error.

## CLI (`cli.ts`)

`dist-builder --src <plugin-dir> [options]`:

| Flag | Default | Meaning |
|---|---|---|
| `--src <dir>` | cwd | Plugin source with `dist.config.json` |
| `--out <dir>` | `<src>/dist` | Output dir for zips |
| `--only <list>` | `free,pro` | Comma list; only `free`/`pro` accepted |
| `--dry-run` | false | Strip + verify only; skip build/zip |
| `--work <dir>` | OS temp | Working-dir root for variant copies |
| `-h`, `--help` | — | Print help |

## Conventions

- **Pure transforms:** `markers`/`jsonPatches`/etc. are side-effect-free and
  return descriptors; `index.ts` performs the actual file writes/deletes.
- **Config-driven:** all globs, removals, patches, and sibling deps come from
  `dist.config.json` — the engine has no plugin-specific knowledge.
- **Fail loud on leaks:** the free build is verified against a `verifyFreeHasNo`
  token list; residual pro tokens abort the run.
