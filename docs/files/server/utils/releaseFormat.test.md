# `server/src/utils/releaseFormat.test.ts`
**Purpose:** Vitest unit tests for the unreleased-marker behavior of `releaseFormat.ts`, including a round-trip check through `readmeChangelog.ts`.
**Language / Size:** TypeScript / 2506 bytes

## Exports
None (test file).

## Imports (Internal / External)
- Internal: `assembleRelease`, `toReadmeChangelog`, `toMarkdown` from `./releaseFormat`; `parseReadmeChangelog` from `./readmeChangelog`.
- External: `describe`, `it`, `expect` from `vitest`.

## Functions / Methods
Helper `acts(versionId)` builds a one-item feature activity list. Suite `releaseFormat — unreleased marker`:
- **flags a version whose status is unreleased** — `assembleRelease` with a `status: 'unreleased'` version → `releases[0].unreleased === true`.
- **sorts unreleased versions first** — given a released `2.0.7` and an unreleased `2.0.8`, `releases[0].label === '2.0.8'`.
- **readme.txt marks unreleased inside the header and still round-trips** — `toReadmeChangelog` output contains `Unreleased`, and `parseReadmeChangelog` recovers `version === '2.0.8'` from the header (verifies the marker doesn't break importer parsing).
- **markdown marks unreleased versions but not the unversioned block** — `toMarkdown` output contains `## 2.0.8 (Unreleased)`.
- **markdown marks an individual unreleased entry inside a released version** — a released version with one normal item and one item tagged `['unreleased']`: output contains `- **Pending fix** _(Unreleased)_` and `- **Shipped feature**`, and does NOT contain `Shipped feature** _(Unreleased)_`.

## Data structures / Types / Constants
None beyond the inline `acts` helper.

## Important algorithms
Validates the unreleased flag propagation, sort ordering, per-item unreleased tagging, and the readme round-trip contract between exporter and importer.

## Relationships
Tests `releaseFormat.ts` and its interplay with `readmeChangelog.ts`.

## Edge cases & known limitations
Focuses specifically on unreleased-marking behavior; does not exhaustively test grouping, counts, notes rendering, or date formatting.
