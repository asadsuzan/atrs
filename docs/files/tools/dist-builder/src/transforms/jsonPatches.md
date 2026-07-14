# `tools/dist-builder/src/transforms/jsonPatches.ts`

**Purpose:** Dot-path edits (remove/set) for JSON files (e.g. removing pro attribute defaults from `block.json`, which can't carry comment markers).

**Language / Size:** TS / 2120 bytes

## Exports
- `deletePath(obj: unknown, dotPath: string): boolean`.
- `setPath(obj: unknown, dotPath: string, value: unknown): void`.
- `interface JsonPatchOps` — `{ remove?: string[]; set?: Record<string, unknown> }`.
- `applyJsonPatch(json, ops): { removed: string[]; set: string[] }`.

Non-exported: `isIndex(seg): boolean`.

## Imports (Internal / External)
None.

## Path semantics
Segments split on `.`. Numeric segments (`/^\d+$/`) index into arrays. No support for keys containing dots (documented as unneeded for WordPress `block.json` attribute names).

## Functions
### `isIndex(seg)` (private)
- Returns `true` if `seg` matches `/^\d+$/` (all digits).

### `deletePath(obj, dotPath)`
- Purpose: delete value at `dotPath`. Return `true` if something removed.
- Algorithm: split path; walk to the parent of the last segment, bailing (`return false`) if any intermediate is null/non-object. If parent is an Array and last segment is an index: bounds-check, then `splice(idx, 1)` → true. Else if parent has own property `last` → `delete` → true. Else false.
- Side effects: mutates `obj` in place.

### `setPath(obj, dotPath, value)`
- Purpose: set value at `dotPath`, creating intermediate objects.
- Algorithm: walk parts; for each non-final key, if `cur[key]` is null/non-object set it to `{}`; descend. Assign `cur[last] = value`.
- Side effects: mutates `obj` in place; overwrites non-object intermediates with `{}`.

### `applyJsonPatch(json, ops)`
- Purpose: apply remove then set ops in place; report which applied.
- Algorithm: for each path in `ops.remove ?? []`, if `deletePath` returns true push to `removed`. For each `[path, value]` in `ops.set ?? {}`, `setPath(json, path, value)` and push path to `set` (always reported). Return `{ removed, set }`.
- Side effects: mutates `json`.

## Transforms — example
Config `jsonPatches`: `{ "block.json": { "free": { "remove": ["attributes.offCanvasStyles.default.fab"], "set": { "attributes.isPro": false } } } }`.
- `remove` deletes the nested key `attributes.offCanvasStyles.default.fab`.
- `set` writes `attributes.isPro = false`, creating intermediates as needed.
Test evidence: `applyJsonPatch({attributes:{fab:{},keep:1}}, {remove:['attributes.fab'], set:{'attributes.isPro':false}})` → `{attributes:{keep:1,isPro:false}}`, `removed=['attributes.fab']`, `set=['attributes.isPro']`.

## Relationships & pipeline order
Used by `index.ts` `transformJson` after marker stripping; the mutated object is re-serialized with 2-space indent + trailing newline.
