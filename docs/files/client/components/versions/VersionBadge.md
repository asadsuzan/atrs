# `client/src/components/versions/VersionBadge.tsx`
**Purpose:** The single shared badge for a version's state — "Latest" / "Unreleased" / "Released" — used everywhere (version tables, selector options, activity cards, changelogs) so wording and colors stay identical app-wide.
**Language / Size:** TypeScript(React) / 1678 bytes

## Exports
- `VersionBadge({ kind, size?, className? })` (named component).
- `type VersionBadgeKind = 'latest' | 'unreleased' | 'released'`.

## Props
- `kind: VersionBadgeKind` — which badge to render.
- `size?: 'xs' | 'sm'` (default `'sm'`) — controls padding/text via `SIZE_CLASSES` and dot size.
- `className?: string` — extra classes merged via `cn`.

## Behavior / Rendering
- `unreleased`: amber pill with a leading amber dot + "Unreleased".
- `latest`: green pill with a ring + "Latest" (no dot).
- `released` (default): green pill + "Released" (no ring/dot).
- All variants share a base of `inline-flex … rounded-full font-bold uppercase` sizing.

## Relationships
- Centralizes version-state styling; consumed by `ActivityForm`, `VersionManager`, `ReleasePublish`, and changelog views. Aligns with the versioning single-source approach (see versioning memory).

## Edge cases & known limitations
- Presentational only; the caller decides which `kind` applies (e.g. from `useProductVersions` decoration).
