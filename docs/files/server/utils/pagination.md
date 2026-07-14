# `server/src/utils/pagination.ts`
**Purpose:** Parse and clamp `limit`/`page` query params into safe integers, with `-1` preserved as a sanctioned "return all" sentinel.
**Language / Size:** TypeScript / 789 bytes

## Exports
- `function parseLimit(raw: unknown, def = 10, max = 1000): number`
- `function parsePage(raw: unknown, def = 1, max = 100_000): number`

## Imports (Internal / External)
- None.

## Functions / Methods
### `parseLimit(raw, def = 10, max = 1000)`
`parseInt(String(raw), 10)`. If the result is exactly `-1`, returns `-1` (the "return all" sentinel used by owner-scoped list views). If not finite or `< 1`, returns `def`. Otherwise returns `Math.min(n, max)` — clamped so a caller can't request an absurd page size.

### `parsePage(raw, def = 1, max = 100_000)`
`parseInt(String(raw), 10)`. If not finite or `< 1`, returns `def`. Otherwise `Math.min(n, max)`.

## Data structures / Types / Constants
- Default/max bounds are parameters: limit default 10 / max 1000; page default 1 / max 100000.

## Important algorithms
Integer coercion with clamping; `-1` special-cased only in `parseLimit`.

## Relationships
Used by list/index route handlers to normalize pagination query params before querying Mongo.

## Edge cases & known limitations
- `-1` is honored only by `parseLimit`; `parsePage` treats `-1` (or any `<1`) as `def`.
- Non-numeric input (`parseInt` → `NaN`) falls back to `def`.
- Decimal input is truncated by `parseInt`.
