# Release Assembly & Export (readme + Markdown)

**Source:** `server/src/utils/releaseFormat.ts` — `assembleRelease`,
`toReadmeChangelog`, `toMarkdown` (+ private helpers). The inverse of the
importer `server/src/utils/readmeChangelog.ts`. Consumed by `ReleaseService`
and the public release / changelog-export routes.

## Purpose
Turn a product's versions + changelog activities into publishable artifacts: a
structured per-version model, a WordPress.org `== Changelog ==` block, and
GitHub-flavored Markdown — engineered so the readme output round-trips back
through the importer.

## Data shapes
- `ReleaseType = 'feature' | 'improvement' | 'bug-fix'`.
- `ReleaseBlock { versionId, label, releasedAt, notes?, unreleased?, groups,
  counts, total }` where `groups` buckets items by type.
- `AssembledRelease { releases: ReleaseBlock[], unreleased?: ReleaseBlock }`.

## Algorithm

### `assembleRelease(versions, activities)`
1. Build `versionsById`.
2. Partition activities: those whose `versionId` maps to a known version →
   `byVersion`; the rest → `unversioned`.
3. For each version **with ≥1 activity**, create a block; block date =
   `v.releasedAt` (ISO) or `latestDate(acts)`; flag `unreleased` when
   `v.status==='unreleased'`. Versions with no activities are skipped entirely.
4. Unversioned activities (if any) become a single `null`-versioned "Unreleased"
   block (`unreleased:true`).
5. **Sort:** unreleased blocks first, then release date descending, then label
   descending with numeric-aware `localeCompare`.

### `toReadmeChangelog(assembled)` — WordPress.org
- Emits released blocks under `== Changelog ==`. Header `= <label> - <date><tag>
  =`; the unreleased marker is kept **inside** the `= … =` header (` (Unreleased)`
  when dated, ` - Unreleased` otherwise) so the importer can still recover the
  label. Items: `* <Keyword>: <title>` using `TYPE_KEYWORD` (`New` / `Improvement`
  / `Fix`). **The unversioned "Unreleased" block is omitted.**

### `toMarkdown(productName, assembled)` — GitHub
- Starts `# <productName> — Changelog`. Per block: `## <label> — <date>`
  (` (Unreleased)` appended for versioned-but-unreleased), block notes via
  `htmlToText`, then `### <Heading>` per type. Items: `- **<title>**`, plus
  ` — <shortDescription>` (via `htmlToInlineText`, only when it differs from the
  title), plus ` _(Unreleased)_` for individual `unreleased`-tagged items inside
  an otherwise-released block. **The unversioned "Unreleased" block renders
  first**, then releases. Collapses 3+ newlines.

## Round-trip convention
The `New:` / `Improvement:` / `Fix:` keyword prefixes are shared with
`readmeChangelog.ts`, so exporting to readme and re-importing recovers the same
types. Version labels survive because the unreleased marker lives inside the
header, not as a separate line.

## Edge cases & limitations
- Versions with zero activities are excluded from all output.
- `toReadmeChangelog` omits the unversioned "Unreleased" block; `toMarkdown`
  includes it. (Deliberate asymmetry — the WP readme has no place for
  unversioned changes.)
- Label sort tie-breaks use locale-aware numeric compare, **not** strict semver.

## Source references
- `releaseFormat.{assembleRelease,toReadmeChangelog,toMarkdown}`,
  constants `TYPE_ORDER`/`TYPE_HEADING`/`TYPE_KEYWORD`.
- Round-trips with `readme-changelog-parsing.md`.
