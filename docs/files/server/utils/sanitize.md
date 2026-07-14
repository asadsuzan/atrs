# `server/src/utils/sanitize.ts`
**Purpose:** Small input-safety helpers — escape regex metacharacters for safe `$regex` queries, and detect ASCII control characters that would be unsafe to write into config files.
**Language / Size:** TypeScript / 667 bytes

## Exports
- `function escapeRegex(input: string): string`
- `function hasControlChars(value: string): boolean`

## Imports (Internal / External)
- None.

## Functions / Methods
### `escapeRegex(input)`
Backslash-escapes regex metacharacters via `input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`, so user input can be used literally in a Mongo `$regex` (also neutralizes ReDoS-style patterns).

### `hasControlChars(value)`
Iterates characters; returns true if any char code is `< 0x20` (control chars NUL..US, including `\n`, `\r`, `\t`) or `=== 0x7f` (DEL). Used to reject values (e.g. a Mongo URI) that could inject extra lines into a config/.env file.

## Data structures / Types / Constants
None.

## Important algorithms
Character-class escaping and a linear control-character scan.

## Relationships
`escapeRegex` used by search/filter route handlers that build `$regex` queries from user input. `hasControlChars` used when validating values that get persisted to config files (e.g. settings). Tested by `sanitize.test.ts`.

## Edge cases & known limitations
- `hasControlChars` flags all C0 control chars plus DEL, but not other Unicode control/formatting characters (e.g. C1 range, bidi overrides).
- `escapeRegex` covers standard JS regex metacharacters; it does not alter case-insensitivity or anchoring behavior of the resulting query.
