# `tools/dist-builder/src/cli.ts`

**Purpose:** Command-line entry point (`bin: dist-builder`). Parses flags, invokes `runDistribution`, prints a per-variant summary.

**Language / Size:** TS / 2437 bytes

## Exports
None. Shebang `#!/usr/bin/env node`; runs `main()` on load.

## Imports (Internal / External)
- Internal: `runDistribution, type VariantName from './index'`.
- External: `parseArgs` from `node:util`, `node:path`.

## Functions
### `main()`
- Purpose: parse CLI args and drive one distribution run.
- Algorithm:
  1. `parseArgs` with option schema (see CLI below).
  2. If `values.help` → write `HELP` text to stdout, return.
  3. `src = path.resolve(values.src ?? process.cwd())`.
  4. `only` = `values.only` split on `,` trimmed cast to `VariantName[]`, else `undefined`.
  5. If `only` contains any value other than `'free'`/`'pro'` → throw `` --only accepts "free" and/or "pro" (got "…") ``.
  6. `await runDistribution(src, { outDir: values.out, only, dryRun: values['dry-run'], workRoot: values.work })`.
  7. Write `\nDistribution Builder — ${result.slug}\n`.
  8. For each variant report, compute: `removed = removedPaths.length`; `blocks = sum of strippedFiles[].removedBlocks`; `droppedFiles = count of strippedFiles where removedFile`. Print `  <VARIANT padEnd(4)>  removed N path(s), N pro block(s), N pro file(s); json: <jsonPatched.length>, text: <textEdited.length>`. If `v.zipPath` print `        zip: <path>`; else if `!v.built` print `        (dry run — not built)`.
  9. Write `\nDone.\n`.
- Side effects: writes to stdout.
- Error handling: `main().catch((err) => { write "\n✖ <message>\n" to stderr; process.exit(1) })`.

## CLI (commands, flags, args)
Single command (no subcommands). Usage: `dist-builder --src <plugin-dir> [options]`.

| Flag | parseArgs type | Default | Meaning |
| --- | --- | --- | --- |
| `--src <dir>` | string | `process.cwd()` | Plugin source dir containing `dist.config.json`. |
| `--out <dir>` | string | `<src>/dist` (resolved in index) | Output directory for zips. |
| `--only <list>` | string | both (`free,pro`) | Comma-separated variants; only `free`/`pro` accepted, else throws. |
| `--dry-run` | boolean | `false` | Strip + verify only; skip build/zip. |
| `--work <dir>` | string | OS temp (mkdtemp) | Working-directory root for variant copies. |
| `-h`, `--help` | boolean | `false` | Print help and exit. |

## Relationships & pipeline order
Thin wrapper: parse → `runDistribution` (index.ts) → format `RunResult` for stdout.
