# `tools/dist-builder/src/fork.ts`

**Purpose:** Copies a plugin source tree into a fresh variant working directory, skipping ignored entries.

**Language / Size:** TS / 1206 bytes

## Exports
- `forkVariant(srcDir: string, destDir: string, ignore: string[]): Promise<void>`.

Non-exported: `makeIgnore(ignore: string[])`.

## Imports (Internal / External)
- Internal: none.
- External: `node:fs`, `node:path`.

## Functions
### `makeIgnore(ignore)` (private)
- Purpose: build a matcher predicate for fork-ignore entries.
- Return: `(rel: string) => boolean`.
- Algorithm: `exts` = entries starting `*.` mapped to their suffix without the `*` (e.g. `*.zip` → `.zip`); `names` = a Set of the remaining literal entries. Predicate: if `rel` empty → false; split `rel` on `path.sep`; if any segment is in `names` → true; if `rel` ends with any ext suffix → true; else false.
- Matching supported: basenames, path segments, and `*.ext` extension globs. (No general glob matching.)

### `forkVariant(srcDir, destDir, ignore)`
- Purpose: recursively copy `srcDir` to `destDir` minus ignored entries.
- Params: `srcDir`, `destDir`, `ignore` (list of names/`*.ext`). Return: `Promise<void>`.
- Algorithm:
  1. `fs.rmSync(destDir, { recursive: true, force: true })` — clear any prior copy.
  2. `fs.mkdirSync(destDir, { recursive: true })`.
  3. `ignored = makeIgnore(ignore)`.
  4. `await fs.promises.cp(srcDir, destDir, { recursive: true, filter })` where `filter(source)` computes `rel = path.relative(srcDir, source)`; returns true if `rel` empty (root) else `!ignored(rel)`.
- Side effects: deletes then recreates `destDir`; copies files.
- Error handling: none explicit; fs errors propagate.

## Relationships & pipeline order
First per-variant step in `processVariant` (index.ts): called with `[...config.forkIgnore, CONFIG_FILENAME]` so the config file is never copied into a variant.
