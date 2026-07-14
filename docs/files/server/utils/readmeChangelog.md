# `server/src/utils/readmeChangelog.ts`
**Purpose:** Parses the `== Changelog ==` section of a WordPress `readme.txt` into structured versions, each with a release date and change items classified by type with a confidence level. The inverse of the exporter in `releaseFormat.ts`.
**Language / Size:** TypeScript / 5210 bytes

## Exports
- `type ChangelogType = 'feature' | 'improvement' | 'bug-fix'`
- `type ClassificationConfidence = 'high' | 'medium' | 'low'`
- `interface ParsedChangelogItem`, `interface ParsedChangelogVersion`
- `function parseReadmeChangelog(readme: string): ParsedChangelogVersion[]`

## Imports (Internal / External)
- None.

## Functions / Methods
### `keywordType(kw)` (private)
Lowercases the keyword and maps it to a `ChangelogType` via three regexes: feature (new/add/adds/added/feature/introduce/implement…), bug-fix (fix/fixed/bug/hotfix/patch/resolve/correct…), improvement (update/improve/enhance/change/tweak/optimize/refactor/perf/security/compat/dev/deprecate…). Returns null if unknown.

### `classify(line)` (private)
Strips leading list markers (`*`, `-`, `•`, `·`) and whitespace. If the line is `Prefix: rest` / `Prefix - rest` (single alpha word + `:`/`-`/`–`/`—` separator) and the prefix is a known keyword → `{ type, title: rest, confidence: 'high' }`. Otherwise infers from the first word: if it's a keyword → `medium` confidence with the type and full line as title; if not → defaults to `improvement` with `low` confidence. Confidence semantics: high = explicit recognized prefix, medium = first-word inference, low = defaulted guess (flagged for human review).

### `parseDate(s)` (private)
Removes ordinal suffixes (`1st`/`2nd`/…), parentheses, trims, then `new Date(...)`. Returns null for empty input or invalid dates. Handles styles like "4 June 2026", "June 4, 2026", "2026-06-04".

### `parseVersionHeader(line)` (private)
Recognizes WordPress `= 2.1.0 - 4 June 2026 =` headers (one/more `=` on each side) and bare `2.1.0 - 4 June 2026` version lines. Extracts the inner text, then matches `^v?\s*([0-9][\w.]*?)\s*(?:[-–—(:]\s*(.+?)\)?\s*)?$` to split version token from an optional date. Returns `{ version, date }` or null.

### `parseReadmeChangelog(readme)`
1. Returns `[]` for empty input; splits into lines.
2. Locates the Changelog section start (line matching `== change log ==`, case/space-insensitive); returns `[]` if absent.
3. Finds the section end at the next top-level `== ... ==` heading.
4. Iterates section lines: blank lines skipped; heading lines (start with `=` or match a version pattern) start a new version block (pushed only if it parses); non-heading lines under a current block are `classify`-ied and pushed if they have a title.
5. Returns blocks, dropping any with zero items.

## Data structures / Types / Constants
- `ParsedChangelogItem`: `{ title, type: ChangelogType, confidence }`.
- `ParsedChangelogVersion`: `{ version, releasedAt: Date | null, items }`.

## Important algorithms
Section-bounded line scanning; keyword-based type classification with a three-level confidence model that feeds the import review queue (low/medium confidence flags items for human review).

## Relationships
Round-trips with `releaseFormat.ts` (`toReadmeChangelog` emits `New:`/`Improvement:`/`Fix:` prefixes that this parser recognizes as high-confidence). Exercised by `releaseFormat.test.ts`. Confidence levels tie into the import review-queue feature (see project memory: "Import review queue").

## Edge cases & known limitations
- Only parses the `== Changelog ==` section; other readme sections are ignored.
- Date parsing depends on `new Date` and may misparse ambiguous/locale-specific formats.
- Lines with no leading keyword default to `improvement` with `low` confidence (a guess).
- Version blocks with no valid items are dropped from the result.
