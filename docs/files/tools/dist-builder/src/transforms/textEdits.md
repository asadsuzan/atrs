# `tools/dist-builder/src/transforms/textEdits.ts`

**Purpose:** Line-drop and regex find/replace edits for text files — used to rewrite plugin headers per variant (e.g. dropping Freemius `@fs_premium_only` annotations from free, or flipping premium flags for pro).

**Language / Size:** TS / 756 bytes

## Exports
- `interface TextEditOp` — `{ drop?: string; replace?: string; with?: string; flags?: string }`.
- `applyTextEdits(content: string, ops: TextEditOp[]): string`.

## Imports (Internal / External)
None.

## Functions
### `applyTextEdits(content, ops)`
- Purpose: apply an ordered list of edit ops to text.
- Return: edited string.
- Algorithm: `out = content`. For each `op`:
  - If `op.drop != null`: split `out` on `/\r?\n/`, keep only lines that do NOT `.includes(op.drop)`, rejoin with `\n`.
  - Else if `op.replace != null`: `out = out.replace(new RegExp(op.replace, op.flags ?? 'g'), op.with ?? '')`.
  - (An op with neither `drop` nor `replace` is a no-op.)
  Return `out`.
- Side effects: none (pure).
- Error handling: none; an invalid regex in `replace` would throw from `RegExp`.

## Transforms — examples
- `drop`: `{ drop: '@fs_premium_only' }` removes every line containing `@fs_premium_only` (test keeps `Plugin Name` and `Version` lines).
- `replace`/`with`/`flags`: `{ replace: "'is_premium'\\s*=>\\s*true", with: "'is_premium' => false" }` → `'is_premium' => true,` becomes `'is_premium' => false,`. Default flags `'g'`.

## Relationships & pipeline order
Called by `index.ts` `transformText` using `config.textEdits[file][variant]`; file rewritten only if content changed.
