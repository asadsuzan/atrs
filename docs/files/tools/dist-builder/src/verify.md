# `tools/dist-builder/src/verify.ts`

**Purpose:** Scans a stripped free variant for forbidden tokens that must not survive into the free build (license code, full Freemius paths, leftover `@pro` markers, …); returns every occurrence so the caller can fail loudly.

**Language / Size:** TS / 1339 bytes

## Exports
- `interface VerifyHit` — `{ token: string; file: string; line: number }`.
- `verifyFree(dir: string, forbidden: string[], ignore?: string[]): Promise<VerifyHit[]>`.

Non-exported: `TEXT_GLOBS = ['**/*.{php,js,jsx,ts,tsx,mjs,cjs,json,css,scss,sass,html,htm,txt,md}']`.

## Imports (Internal / External)
- Internal: none.
- External: `node:fs`, `node:path`, `fast-glob` (as `fg`).

## Functions
### `verifyFree(dir, forbidden, ignore = [])`
- Purpose: find forbidden token occurrences in text files under `dir`.
- Return: `Promise<VerifyHit[]>` (one hit per token per line).
- Algorithm:
  1. If `forbidden` empty → return `[]`.
  2. `files = fg(TEXT_GLOBS, { cwd: dir, dot: true, ignore: ['**/node_modules/**', '**/.git/**', '**/*.map', ...ignore] })`.
  3. For each `rel`: read file (skip on read error via try/catch continue). If no forbidden token is `.includes`d in the content → skip. Else split into lines; for each line index and each forbidden token, if `line.includes(token)` push `{ token, file: rel, line: idx + 1 }`.
  4. Return `hits`.
- Side effects: reads files.
- Error handling: unreadable files skipped silently. This function only reports; the caller (`index.ts`) throws when hits exist.

## Config schema
Driven by `config.verifyFreeHasNo` (tokens) and `config.verifyIgnore` (extra ignore globs, appended to the built-in node_modules/.git/*.map excludes). Scans only `TEXT_GLOBS` extensions (skips binaries).

## Relationships & pipeline order
Called by `index.ts` `processVariant` for the free variant only, after all transforms and before build. Non-empty result → `runDistribution` aborts with a verification-failure error (up to 10 hits shown).
