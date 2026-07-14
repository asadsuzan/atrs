# `client/src/pages/AppChangelog.tsx`

**Purpose:** ATRS's own release-notes / "What's New" page. Renders the app's changelog (from a static data module) as a filterable vertical timeline. Public — no auth, rendered outside the app shell (Layout).

**Language / Size:** TypeScript(React) / 7538 bytes

## Route
- Mounted in `App.tsx` at `path="/changelog"` inside a bare `<Suspense fallback={<PageSkeleton />}>` — NOT inside `ProtectedLayout`, so it is publicly reachable and has no sidebar. (Note: the sibling route `/changelog/:id` maps to `PublicChangelog`, a different component.)
- Linked from the sidebar "What's New" link (`App.tsx` `SidebarShell`) and from `Login.tsx` ("What's new · v{APP_VERSION}").

## Exports
- **Default export:** `AppChangelog()` — the page component.
- No named exports.
- Module-local (not exported): `TYPE_META` (per-`ChangeType` presentation map), `TYPE_ORDER` (array), `fmtDate()` helper, `ReleaseEntry` sub-component.

## Imports (Internal / External)
**Internal:**
- `useDocumentTitle` from `../hooks/useDocumentTitle`
- `RELEASES, APP_VERSION`, types `ChangeType`, `Release` from `../data/changelog` (static data module — the changelog is source-controlled, not fetched)

**External:**
- `react` (`useMemo, useState`)
- `react-router-dom` (`Link`)
- `lucide-react` icons: `Rocket, Sparkles, Wrench, Bug, ShieldCheck, ArrowLeft`

## State / Hooks / Contexts
- `useDocumentTitle("What's New")` — sets the tab title (this page owns its own title; `App.tsx`'s `titleForPath` returns null for it).
- `useState<ChangeType | 'all'>('all')` → `filter` — active type filter.
- Inside `ReleaseEntry`: `useMemo` computes `grouped` (entries bucketed by type, honoring `filter`) keyed on `[release.entries, filter]`.
- No contexts, no data fetching, no refs.

## Services & data (query keys, mutations, endpoints hit)
- None. All content comes from the static `RELEASES` array in `../data/changelog`. No react-query, no API calls.

## Behavior / Rendering
- Full-screen `min-h-screen` layout with three regions: hero header, timeline main, footer.
- **Hero:** "Back to ATRS" link (`/`), ATRS favicon, title "What's New in ATRS", current version `v{APP_VERSION}`, and a row of filter pills: All / New / Improved / Fixed / Security. Active pill is highlighted; clicking sets `filter`.
- **Timeline (`main`):** if `RELEASES.length === 0` shows "No releases yet."; otherwise maps `RELEASES` to `<ReleaseEntry>` (keyed by `release.version`).
- **`ReleaseEntry`** renders one release node on a left-border timeline with a primary dot:
  - Heading: `release.version` (shown raw if unreleased) or `v{version}`; an amber "In progress" badge when `release.date` is falsy (`isUnreleased`); formatted date when present.
  - Optional `release.title` and `release.summary`.
  - For each type in `TYPE_ORDER` (`feature, improvement, fix, security`) with visible items, renders a labeled group (icon + colored label from `TYPE_META`) and a bulleted list of `entry.title` + optional `— description`.
  - Returns `null` when no entries survive the filter (`hasVisible` false) — filtered-out releases disappear entirely.
- **Footer:** links to ATRS Dashboard (`/`) and Help & docs (`/help`).

## Important logic / algorithms
- **Filtering by grouping:** `grouped` initializes every `TYPE_ORDER` key to `[]`, then pushes each entry into its type bucket, skipping entries whose type ≠ `filter` (unless `filter === 'all'`). `hasVisible` drives whether the whole release entry renders.
- **`fmtDate`** guards against null/invalid dates (`isNaN(d.getTime())`) and returns `''`, using `toLocaleDateString` with long month.
- **Unreleased detection:** purely `!release.date` — no date means "In progress".
- `TYPE_META` centralizes label, dot color, text color, and icon per change type (feature=blue/Sparkles, improvement=purple/Wrench, fix=red/Bug, security=emerald/ShieldCheck).

## Relationships
- Consumes `data/changelog` (`RELEASES`, `APP_VERSION`, types) — the same module `App.tsx`, `Login.tsx`, and the sidebar read `APP_VERSION` from.
- Uses `hooks/useDocumentTitle` for the tab title.
- Distinct from `PublicChangelog.tsx` (per-product, data-fetched) despite the similar timeline styling — this one is for ATRS itself and is data-static.

## Edge cases & known limitations
- Empty `RELEASES` → "No releases yet.".
- A release with entries that all fail the active filter renders nothing (no empty placeholder card).
- The changelog is compile-time static: updating release notes requires editing `data/changelog`, not any admin UI.
- No error/loading states (nothing async).
