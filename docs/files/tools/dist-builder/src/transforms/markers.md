# `tools/dist-builder/src/transforms/markers.ts`

**Purpose:** Strips pro-only code marked with comment tokens, for the FREE variant. Works in any line-comment style (`//`, `/* */`, `#`, `<!-- -->`), covering JS/TS/JSX, SCSS, PHP.

**Language / Size:** TS / 1985 bytes

## Exports
- `interface MarkerResult` — `{ content: string; removedBlocks: number; removedFile: boolean }`.
- `hasProMarkers(content: string): boolean`.
- `stripProMarkers(content: string): MarkerResult`.

Non-exported constants: `FILE_TOKEN = /@pro-file/`, `START_TOKEN = /@pro:start/`, `END_TOKEN = /@pro:end/`.

## Imports (Internal / External)
None.

## Conventions
- Markers must each sit on their own line.
- Whole file: a `@pro-file` token within the first 5 lines → file removed.
- Inline block: lines between `@pro:start` and `@pro:end` (inclusive of the marker lines) are removed. Pairs may nest. Unbalanced/stray markers are a hard error.

## Functions
### `hasProMarkers(content)`
- Return `true` if `/@pro(:start|:end|-file)/` matches anywhere in `content`.

### `stripProMarkers(content)`
- Purpose: remove pro blocks or flag whole file.
- Return: `MarkerResult`.
- Algorithm:
  1. `head` = first 5 lines joined. If `FILE_TOKEN` matches head → return `{ content: '', removedBlocks: 0, removedFile: true }`.
  2. Split into `lines` (`/\r?\n/`); `out = []`, `depth = 0`, `removedBlocks = 0`.
  3. For each line: if `START_TOKEN` → if `depth === 0` increment `removedBlocks`; `depth++`; continue (line dropped). If `END_TOKEN` → if `depth === 0` throw `@pro:end without matching @pro:start (line <n>)`; `depth--`; continue. Else if `depth === 0` push line to `out` (kept); otherwise dropped.
  4. After loop, if `depth !== 0` throw `Unbalanced @pro markers: <depth> @pro:start block(s) never closed`.
  5. Return `{ content: out.join('\n'), removedBlocks, removedFile: false }`.
- `removedBlocks` counts top-level blocks only (nested starts don't increment).
- Side effects: none (pure); caller writes/deletes files.
- Error handling: throws on stray `@pro:end` or unclosed `@pro:start`.

## Transforms — examples
- Inline: lines `/* @pro:start */ … /* @pro:end */` removed; `const a=1;\n/* @pro:start */\nconst pro=…\n/* @pro:end */\nconst b=2;` → `const a = 1;\nconst b = 2;` (removedBlocks=1).
- Whole file: `// @pro-file\nexport const licenseGate=true;` → content `''`, removedFile=true.
- Nested: outer+inner start/end pairs collapse; content between/around blocks kept (test: `keep\nkeep2`).

## Relationships & pipeline order
Called by `index.ts` `transformFreeMarkers` for files matched by `config.stripMarkersIn`, only for the free variant. `hasProMarkers` gates whether the (potentially throwing) stripper runs.
