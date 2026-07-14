# Readme Changelog Parsing & Type Classification

**Source:** `server/src/utils/readmeChangelog.ts` — `parseReadmeChangelog` (with `classify`, `keywordType`, `parseDate`, `parseVersionHeader`).

## Purpose
Parse the `== Changelog ==` section of a WordPress `readme.txt` into structured versions, each with a release date and change items classified by type (`feature` / `improvement` / `bug-fix`) and a confidence level (`high` / `medium` / `low`). It is the inverse of the exporter in `releaseFormat.ts` and feeds the import review queue.

## Inputs / Outputs
- **Input:** `readme: string`.
- **Output:** `ParsedChangelogVersion[]` = `{ version, releasedAt: Date | null, items: { title, type, confidence }[] }[]`.

## Algorithm (`parseReadmeChangelog`)
1. Empty input → `[]`. Otherwise split into lines.
2. Locate the Changelog section start (line matching `== change log ==`, case/space-insensitive). Absent → `[]`.
3. Find the section end at the next top-level `== ... ==` heading.
4. Iterate the section lines:
   - Blank lines are skipped.
   - Heading lines (start with `=` or match a version pattern) start a new version block via `parseVersionHeader`; pushed only if it parses.
   - Non-heading lines under a current block are run through `classify` and pushed if they yield a title.
5. Return the blocks, dropping any with zero items.

## Version header parsing (`parseVersionHeader`)
Recognizes both `= 2.1.0 - 4 June 2026 =` (one or more `=` per side) and bare `2.1.0 - 4 June 2026` lines. It extracts the inner text and matches `^v?\s*([0-9][\w.]*?)\s*(?:[-–—(:]\s*(.+?)\)?\s*)?$` to split the version token from an optional date, then `parseDate`s the date.

## Date parsing (`parseDate`)
Strips ordinal suffixes (`1st`, `2nd`, …) and parentheses, trims, then `new Date(...)`. Returns `null` for empty/invalid. Handles "4 June 2026", "June 4, 2026", "2026-06-04".

## Type + confidence classification (`classify`)
1. Strip leading list markers (`*`, `-`, `•`, `·`) and whitespace.
2. If the line is `Prefix: rest` / `Prefix - rest` (single alpha word + `:`/`-`/`–`/`—` separator) **and** the prefix is a recognized keyword → `{ type, title: rest, confidence: 'high' }`.
3. Otherwise infer from the first word: if it maps to a keyword → `medium` confidence, using that type with the full line as title.
4. If the first word is unknown → default to `improvement` with `low` confidence (a flagged guess).

`keywordType(kw)` lowercases and matches three regex families:
- **feature:** new / add(s) / added / feature / introduce / implement …
- **bug-fix:** fix(ed) / bug / hotfix / patch / resolve / correct …
- **improvement:** update / improve / enhance / change / tweak / optimize / refactor / perf / security / compat / dev / deprecate …

Confidence semantics: `high` = explicit recognized prefix, `medium` = first-word inference, `low` = defaulted guess. `medium`/`low` items are flagged for human review by the importer (`needsReview` + `reviewReason: 'uncertain-type'`).

## Complexity / performance
Single linear scan of the readme lines; per-line classification is a handful of regex tests. O(lines) time.

## Round-trip guarantee
`releaseFormat.ts`'s `toReadmeChangelog` emits `* New:` / `* Improvement:` / `* Fix:` prefixes, which `classify` recognizes as `high` confidence — so exported changelogs re-import cleanly. Covered by `releaseFormat.test.ts`.

## Edge cases & limitations
- Only the `== Changelog ==` section is parsed; other readme sections are ignored.
- Date parsing relies on `new Date` and may misread ambiguous/locale-specific formats.
- Lines with no leading keyword default to `improvement`/`low` (a guess needing review).
- Version blocks with no valid items are dropped.
