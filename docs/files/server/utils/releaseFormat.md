# `server/src/utils/releaseFormat.ts`
**Purpose:** Pure (no-DB) functions that turn a product's versions + changelog activities into publishable release artifacts: a structured per-version model, a WordPress.org `== Changelog ==` block, and GitHub-flavoured Markdown. Inverse of the importer `readmeChangelog.ts`.
**Language / Size:** TypeScript / 8894 bytes

## Exports
- `type ReleaseType = 'feature' | 'improvement' | 'bug-fix'`
- `interface ReleaseItem`, `interface ReleaseBlock`, `interface AssembledRelease`
- `function assembleRelease(versions, activities): AssembledRelease`
- `function toReadmeChangelog(assembled): string`
- `function toMarkdown(productName, assembled): string`
- `const __types = { TYPE_ORDER, orderedItems }`

## Imports (Internal / External)
- Internal: `htmlToText`, `htmlToInlineText` from `./html`.
- External: none.

## Functions / Methods
### `idStr(v)` (private)
Normalizes an id/populated ref to a string (or null): handles `null`, objects with `_id`, and plain values.

### `emptyGroups()` / `toItem(a)` (private)
`emptyGroups` returns an empty `{ feature, improvement, 'bug-fix' }` arrays record. `toItem` maps a `RawActivity` to a `ReleaseItem` (title, shortDescription, type, tier, tags).

### `finalizeBlock(versionId, label, releasedAt, notes, acts, unreleased = false)` (private)
Buckets activities into `groups` by type, computes per-type `counts` and `total`, and returns a `ReleaseBlock` (notes normalized to undefined when empty).

### `latestDate(acts)` (private)
Returns the latest valid `activityDate` in the set as ISO, or null.

### `assembleRelease(versions, activities)`
Builds a `versionsById` map, then partitions activities: those whose `versionId` maps to a known version are grouped `byVersion`; the rest go to `unversioned`. For each version **with at least one activity**, creates a release block whose date is `v.releasedAt` (ISO) or `latestDate(acts)`, flagging `unreleased` when `v.status === 'unreleased'`. Versions with no activities are skipped. **Sort order:** unreleased blocks first, then by release date descending, then by label descending with numeric-aware `localeCompare`. Unversioned activities (if any) become a single `null`-versioned "Unreleased" block (`unreleased: true`). Returns `{ releases, unreleased }`.

### `wpDate(iso)` (private)
Formats an ISO date as `"4 June 2026"` (`en-GB`, day/long-month/year); null for missing/invalid.

### `orderedItems(block)` (private, re-exported via `__types`)
Flattens a block's groups in `TYPE_ORDER`.

### `toReadmeChangelog(assembled)`
Renders released blocks as a WordPress.org `== Changelog ==` section. Each version header is `= <label> - <date><tag> =` (or without date), where the unreleased marker is kept **inside** the `= ... =` header (` (Unreleased)` when dated, ` - Unreleased` otherwise) so the importer can still recover the version label. Items are emitted as `* <Keyword>: <title>` using `TYPE_KEYWORD` (`New`/`Improvement`/`Fix`) so they round-trip. **Unreleased (unversioned) block is omitted.** Ends with a trailing newline.

### `toMarkdown(productName, assembled)`
Renders GitHub Markdown starting with `# <productName> — Changelog`. `renderBlock` writes `## <label> — <date>` (or without date), appends ` (Unreleased)` for versioned-but-unreleased blocks (not the already-titled "Unreleased" block), renders block notes via `htmlToText`, and per-type `### <Heading>` sections. Each item: `- **<title>**`, plus ` — <shortDescription>` (via `htmlToInlineText`, only when it differs from the title), plus ` _(Unreleased)_` for individual items tagged `unreleased` inside an otherwise-released block. The unversioned "Unreleased" block renders first, then releases. Collapses 3+ newlines and ends with one trailing newline.

## Data structures / Types / Constants
- `TYPE_ORDER = ['feature','improvement','bug-fix']`.
- `TYPE_HEADING`: feature→"Features", improvement→"Improvements", bug-fix→"Bug Fixes".
- `TYPE_KEYWORD`: feature→"New", improvement→"Improvement", bug-fix→"Fix" (matches importer keywords).
- `RawVersion` (`_id`, `label`, `notes?`, `status?`, `releasedAt?`) and `RawActivity` (`type`, `title`, `shortDescription?`, `tier?`, `tags?`, `versionId?`, `activityDate?`) input shapes.
- `ReleaseBlock`: `{ versionId, label, releasedAt, notes?, unreleased?, groups, counts, total }`.

## Important algorithms
Version/activity grouping with a fallback "Unreleased" bucket; multi-key sort (unreleased-first, date desc, numeric-aware label desc); prefix-tagged readme output engineered to round-trip through `readmeChangelog.ts`.

## Relationships
Uses `html.ts` for rich-text→plain conversion. Round-trips with `readmeChangelog.ts` (shared `New:`/`Improvement:`/`Fix:` keyword convention). Tested by `releaseFormat.test.ts`. Consumed by public release page / changelog export routes.

## Edge cases & known limitations
- Versions with zero associated activities are excluded from output entirely.
- `toReadmeChangelog` deliberately omits the unversioned "Unreleased" block; `toMarkdown` includes it.
- Sort tie-breaking on labels uses locale-aware numeric compare, not strict semver.
- `__types` re-export exists so callers can access `TYPE_ORDER`/`orderedItems` without importing internal helpers.
