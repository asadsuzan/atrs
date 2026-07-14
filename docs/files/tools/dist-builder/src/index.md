# `tools/dist-builder/src/index.ts`

**Purpose:** The orchestration engine. Public `runDistribution()` API that forks the source per variant, applies all transforms, verifies the free build, and builds/packages each variant.

**Language / Size:** TS / 7686 bytes

## Exports
- `runDistribution(srcDir: string, opts?: RunOptions): Promise<RunResult>`.
- Re-exports: `loadConfig` from `./config`; types `DistConfig`, `VariantName`.
- `interface VariantReport`, `interface RunOptions`, `interface RunResult`.

Non-exported helpers: `transformFreeMarkers`, `transformJson`, `transformText`, `processVariant`.

## Imports (Internal / External)
- Internal: `loadConfig, CONFIG_FILENAME, DistConfig, VariantName` from `./config`; `forkVariant` from `./fork`; `applyRemovals` from `./transforms/removals`; `stripProMarkers, hasProMarkers` from `./transforms/markers`; `applyJsonPatch` from `./transforms/jsonPatches`; `applyTextEdits` from `./transforms/textEdits`; `buildVariant` from `./build`; `verifyFree, VerifyHit` from `./verify`.
- External: `node:fs`, `node:os`, `node:path`, `fast-glob` (as `fg`).

## Types
- `VariantReport`: `{ variant, workDir, removedPaths: string[], strippedFiles: {file, removedBlocks, removedFile}[], jsonPatched: {file, removed[], set[]}[], textEdited: string[], verifyHits: VerifyHit[], zipPath: string|null, built: boolean }`.
- `RunOptions`: `{ outDir?, only?: VariantName[], dryRun?: boolean, workRoot?: string, log?: (msg) => void }`.
- `RunResult`: `{ slug: string, outDir: string, variants: VariantReport[] }`.

## Functions
### `transformFreeMarkers(workDir, config)` (private, async)
- Purpose: strip `@pro` markers across `config.stripMarkersIn` globs (free variant only).
- Return: `VariantReport['strippedFiles']`.
- Algorithm: if `stripMarkersIn` empty → return `[]`. `fg(config.stripMarkersIn, { cwd: workDir, dot: true })`. For each file: read content; skip if `!hasProMarkers`. Call `stripProMarkers` (wrap error as `` `${rel}: ${message}` `` and rethrow). If `result.removedFile` → `fs.rmSync(abs)`, push `{file, removedBlocks:0, removedFile:true}`; else if `removedBlocks > 0` → write `result.content`, push `{file, removedBlocks, removedFile:false}`.
- Side effects: deletes / rewrites files.
- Error handling: rethrows stripper errors prefixed with the relative filename.

### `transformJson(workDir, config, variant)` (private)
- Purpose: apply per-variant JSON dot-path patches.
- Return: `VariantReport['jsonPatched']`.
- Algorithm: for each `[rel, perVariant]` in `config.jsonPatches`: `ops = perVariant[variant]`; skip if falsy; `abs = workDir/rel`; skip if not exists; parse JSON; `applyJsonPatch(json, ops)`; write back as `JSON.stringify(json, null, 2) + '\n'`; push `{file: rel, removed, set}`.
- Side effects: rewrites JSON files (2-space indent, trailing newline).

### `transformText(workDir, config, variant)` (private)
- Purpose: apply per-variant text find/replace/drop edits.
- Return: `string[]` (relative paths changed).
- Algorithm: for each `[rel, perVariant]` in `config.textEdits`: `ops = perVariant[variant] ?? []`; skip if empty; `abs = workDir/rel`; skip if not exists; read `before`; `after = applyTextEdits(before, ops)`; if `after !== before` write and push `rel`.
- Side effects: rewrites text files only when content changes.

### `processVariant(srcDir, config, variant, workRoot, outDir, opts)` (private, async)
- Purpose: run the full pipeline for one variant.
- Return: `Promise<VariantReport>`.
- Algorithm:
  1. `log` = `opts.log ?? console.log`. `workDir = workRoot/<slug>-<variant>`.
  2. Log fork; `forkVariant(srcDir, workDir, [...config.forkIgnore, CONFIG_FILENAME])`.
  3. Log removals; `removedPaths = await applyRemovals(workDir, config.variants[variant].remove)`.
  4. `strippedFiles` = `variant === 'free'` ? `await transformFreeMarkers(...)` : `[]` (pro keeps all pro code).
  5. `jsonPatched = transformJson(...)`; `textEdited = transformText(...)`.
  6. Verify (free only): if `variant === 'free'` and `config.verifyFreeHasNo.length` → `verifyHits = await verifyFree(workDir, verifyFreeHasNo, verifyIgnore)`. If any hits, throw `[free] verification failed — pro tokens still present (N hit(s)):` + up to 10 lines `  • "<token>" in <file>:<line>` + `…and N more` when over 10.
  7. Build (skipped when `opts.dryRun`): `outcome = await buildVariant(workDir, srcDir, config)`; `built = true`. If `outcome.zipPath` → mkdir `outDir`, copy to `outDir/<slug><zipSuffix>.zip`, set `zipPath`, log; else log built-no-zip.
  8. Return the full `VariantReport`.
- Side effects: file operations, spawns builds, writes zips to `outDir`.
- Error handling: throws on verification failure; downstream errors propagate.

### `runDistribution(srcDir, opts = {})` (public, async)
- Purpose: split a mixed free/pro source tree into distributable variants.
- Return: `Promise<RunResult>`.
- Algorithm:
  1. `resolvedSrc = path.resolve(srcDir)`; `config = loadConfig(resolvedSrc)`.
  2. `variants = opts.only ?? ['free', 'pro']`.
  3. `outDir = path.resolve(opts.outDir ?? resolvedSrc/dist)`.
  4. `workRoot = opts.workRoot ?? fs.mkdtempSync(os.tmpdir()/'dist-builder-')`.
  5. For each `dep` in `config.siblingDeps`: `from = resolve(resolvedSrc, dep)`, `to = workRoot/basename(dep)`. If `from` missing → log + skip. If `to` exists → skip. Try `fs.symlinkSync(from, to, 'junction'|'dir')` (log linked); on throw fall back to `fs.promises.cp(from, to, { recursive: true })` (log copying).
  6. For each variant sequentially: push `await processVariant(...)`.
  7. Return `{ slug: config.slug, outDir, variants: reports }`.
- Side effects: creates temp workRoot, symlinks/copies sibling deps, runs all per-variant work.

## Relationships & pipeline order
This is the top of the engine. Order per variant: fork → removals → (free) marker strip → JSON patch → text edit → (free) verify → build → zip → copy to outDir. `siblingDeps` are linked once before the variant loop. Called by `cli.ts`.
