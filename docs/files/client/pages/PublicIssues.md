# `client/src/pages/PublicIssues.tsx`

**Purpose:** Public, hosted "known issues" page for a single product. Fetches a product's published issues by id, lists them ordered by status, and lets visitors report a new issue. No auth, outside the app shell.

**Language / Size:** TypeScript(React) / 8089 bytes

## Route
- Mounted in `App.tsx` at `path="/issues/:id"` inside a bare `<Suspense fallback={<PageSkeleton />}>` — public, outside `ProtectedLayout`.
- Reached from `Explore` product cards ("Issues" link) when `publicIssuesEnabled`.

## Exports
- **Default export:** `PublicIssues()`.
- No named exports.
- Module-local (not exported): `STATUS_META`, `SEVERITY_META`, `STATUS_ORDER`, `fmtDate()`, `Pill` and `IssueRow` sub-components.

## Imports (Internal / External)
**Internal:**
- `getPublicIssues`, types `Issue`, `IssueStatus`, `IssueSeverity` from `../services/issues`
- `useDocumentTitle` from `../hooks/useDocumentTitle`
- `MediaCarousel` from `@/components/ui/media-carousel`
- `RichText` from `@/components/ui/RichText`
- `ReportIssueDialog` from `@/components/issues/ReportIssueDialog`

**External:**
- `react-router-dom` (`useParams, Link`)
- `@tanstack/react-query` (`useQuery`)
- `lucide-react` icons: `Rocket, GitBranch, Globe, Loader2, Bug`

## State / Hooks / Contexts
- `useParams()` → `{ id }`.
- `useQuery({ queryKey: ['public-issues', id], queryFn: () => getPublicIssues(id), enabled: !!id, retry: false })`.
- `useDocumentTitle(data?.product?.name ? `${name} — Issues` : null)`.
- No local state, no mutations (issue submission is owned by `ReportIssueDialog`).

## Services & data (query keys, mutations, endpoints hit)
- **Query key:** `['public-issues', id]` → `getPublicIssues(id)` (from `services/issues`). `enabled: !!id`, `retry: false`.
- Returned `data`: `{ product, issues }`. `product`: `id, name, icon, description, wpOrgSlug, githubUrl`. `issues`: `Issue[]` with `title, description, severity, status, mediaUrls?, versionLabel?, reporter?, foundAt?, createdAt, _id`.
- Issue creation happens via `ReportIssueDialog` (passed `productId`, `productName`).

## Behavior / Rendering
- **Loading:** centered full-screen spinner.
- **Error / no data:** full-screen "Issues not found" message + link to `/`.
- **Derived:** `ordered = [...issues].sort((a,b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))` (open → in-progress → resolved → closed). `openCount` = issues with status open or in-progress.
- **Hero:** product icon/letter-avatar, name, "Known issues" (Bug icon), `RichText` description, external WordPress.org/GitHub links, and a `<ReportIssueDialog productId productName>` trigger.
- **Main:** if `issues.length === 0` → empty state ("No known issues. Everything looks good! 🎉"); otherwise a summary line (`{openCount} open issue(s) · {total} total`) and the `ordered` list of `<IssueRow>` (keyed by `_id`).
- **Footer:** "All products" (`/explore`), "Powered by ATRS" (`/`).

**`IssueRow`** (per `Issue`): title; severity + status `Pill`s (colors from `SEVERITY_META` / `STATUS_META`); `RichText` description; a `MediaCarousel` when `mediaUrls` is non-empty; and a meta row showing version label, reporter, and date (`foundAt` preferred, else `createdAt`).

**`Pill`** — small rounded label with a color class.

## Important logic / algorithms
- **Status ordering:** `STATUS_ORDER = ['open','in-progress','resolved','closed']` used both for sort priority and as a display convention (active first). Sort is a stable copy (`[...issues]`).
- **Date fallback:** `fmtDate(foundAt) || fmtDate(createdAt)` so a row always shows a date if either exists.
- **Pluralization:** `openCount === 1 ? 'issue' : 'issues'`.
- Color/label maps centralize per-status and per-severity styling.

## Relationships
- `services/issues` → `getPublicIssues` (public endpoint by product id). The same service supplies `getAllIssues`/`Issue` types used elsewhere (e.g. Dashboard).
- `components/issues/ReportIssueDialog` — public issue-submission dialog (its own mutation/service).
- `components/ui/media-carousel`, `components/ui/RichText`.
- Sibling public pages: `PublicChangelog` (`/changelog/:id`), `Explore` (`/explore`).

## Edge cases & known limitations
- Any error or unpublished/missing issues page collapses to a single "not found" state.
- Requires `id`; `enabled: !!id` avoids a query with undefined id.
- Publicly exposes a "Report issue" affordance to anonymous visitors — spam/abuse mitigation is the dialog/backend's responsibility.
- Relies on the backend to return only issues intended to be public.
