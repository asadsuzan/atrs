# `tools/dist-builder/__tests__/transforms.test.ts`

**Purpose:** Vitest unit tests for the three pure transforms (markers, jsonPatches, textEdits). No I/O or build steps are exercised.

**Language / Size:** TS / 3312 bytes

## Exports
None (test file).

## Imports (Internal / External)
- Internal: `stripProMarkers, hasProMarkers` from `../src/transforms/markers`; `deletePath, setPath, applyJsonPatch` from `../src/transforms/jsonPatches`; `applyTextEdits` from `../src/transforms/textEdits`.
- External: `describe, it, expect` from `vitest`.

## Test cases
### `describe('markers')`
- removes an inline `@pro` block including marker lines → `removedFile=false`, `removedBlocks=1`, content `const a = 1;\nconst b = 2;`, no `expensive`.
- flags a whole file via `@pro-file` in head → `removedFile=true`, content `''`.
- supports nested blocks → content `keep\nkeep2`.
- throws on an unbalanced start → `/Unbalanced/`.
- throws on a stray end → `/without matching/`.
- detects markers → `hasProMarkers('/* @pro:start */')` true; plain code false.

### `describe('jsonPatches')`
- deletes a nested object key → `deletePath({a:{b:{c:1,d:2}}}, 'a.b.c')` true, leaves `{d:2}`; missing path false.
- removes an array index → `deletePath({list:[10,20,30]}, 'list.1')` true → `[10,30]`.
- sets a path creating intermediates → `setPath({}, 'x.y.z', 5)` → `obj.x.y.z===5`.
- applies remove + set ops and reports them → result `removed=['attributes.fab']`, `set=['attributes.isPro']`.

### `describe('textEdits')`
- drops lines containing a token → `{drop:'@fs_premium_only'}` removes that line, keeps others.
- applies a regex replace → `'is_premium' => true,` → `'is_premium' => false,`.

## Relationships & pipeline order
Covers only the pure logic units used within `index.ts` transform helpers. Run via `npm test` (`vitest run`). `tsconfig.json` excludes `__tests__` from the TS build.
