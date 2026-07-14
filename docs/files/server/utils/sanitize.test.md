# `server/src/utils/sanitize.test.ts`
**Purpose:** Vitest unit tests for `escapeRegex` and `hasControlChars` from `sanitize.ts`.
**Language / Size:** TypeScript / 1314 bytes

## Exports
None (test file).

## Imports (Internal / External)
- Internal: `escapeRegex`, `hasControlChars` from `./sanitize`.
- External: `describe`, `it`, `expect` from `vitest`.

## Functions / Methods
Suite `escapeRegex`:
- **escapes regex metacharacters** — `a.b*c` → `a\.b\*c`; `(test)` → `\(test\)`; `a+b?c^d$` → `a\+b\?c\^d\$`.
- **neutralizes a ReDoS-style input** — escaping `(a+)+` yields a pattern that constructs without throwing, matches the literal string `(a+)+`, and does not match `aaaa`.
- **leaves plain text unchanged** — `hello world` → `hello world`.

Suite `hasControlChars`:
- **detects newlines/carriage returns** — a URI containing `\n` or `\r\n` → true (guards against config/.env injection).
- **detects tabs and DEL** — `a\tb` and `a\x7fb` → true.
- **passes a clean URI** — `mongodb+srv://user:pass@cluster.example.net/db` → false.

## Data structures / Types / Constants
None.

## Important algorithms
Validates literal-matching after escaping (including a ReDoS-neutralization case) and control-character detection including the newline-injection scenario the helper defends against.

## Relationships
Tests `sanitize.ts`.

## Edge cases & known limitations
Covers representative metacharacters and control chars; not an exhaustive sweep of every code point.
