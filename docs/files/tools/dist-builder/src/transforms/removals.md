# `tools/dist-builder/src/transforms/removals.ts`

**Purpose:** Removes files/directories matching given plain paths or globs from a variant working dir.

**Language / Size:** TS / 1236 bytes

## Exports
- `applyRemovals(dir: string, patterns: string[]): Promise<string[]>`.

Non-exported: `GLOB_CHARS = /[*?{}[\]()!+@]/`.

## Imports (Internal / External)
- Internal: none.
- External: `node:fs`, `node:path`, `fast-glob` (as `fg`).

## Functions
### `applyRemovals(dir, patterns)`
- Purpose: delete matching entries; return relative paths actually removed.
- Params: `dir` (variant root), `patterns` (paths or globs). Return: `Promise<string[]>`.
- Algorithm: for each `pattern`:
  - If it contains NO glob chars (`GLOB_CHARS` test false): treat as a plain path. `abs = dir/pattern`; if it exists → `fs.rmSync(abs, { recursive: true, force: true })`, push `pattern`. (Removes whole directories cleanly, e.g. `vendor/freemius`.)
  - Else expand via `fg(pattern, { cwd: dir, dot: true, onlyFiles: false, markDirectories: false })`; sort matches by descending length (deepest first, so children removed before parents); for each existing match `fs.rmSync` recursively + push relative path.
- Side effects: deletes files/directories.
- Error handling: none explicit; fs/glob errors propagate.

## Transforms — example
Config `variants.free.remove: ["vendor/freemius", "includes/LicenseActivation.php"]` deletes those paths from the free copy. `variants.pro.remove: ["vendor/freemius-lite"]` deletes the lite SDK from pro.

## Relationships & pipeline order
Called by `index.ts` `processVariant` after fork, before marker/JSON/text transforms, using `config.variants[variant].remove`.
