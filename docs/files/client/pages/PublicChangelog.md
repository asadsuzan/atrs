# `client/src/pages/PublicChangelog.tsx`

**Purpose:** Public, hosted changelog for a single product. Fetches a product's published release timeline by id and renders it as a vertical timeline. No auth, outside the app shell. This is the shareable per-product changelog (distinct from `AppChangelog`, which is ATRS's own release notes).

**Language / Size:** TypeScript(React) / 7656 bytes

## Route
- Mounted in `App.tsx` at `path="/changelog/:id"` inside a bare `<Suspense fallback={<PageSkeleton />}>` — public, outside `ProtectedLayout`.
- Reached from `Explore` product cards ("Changelog" link) when `publicChangelogEnabled`.

## Exports
- **Default export:** `PublicChangelog()`.
- No named exports.
- Module-local (not exported): `TYPE_META`, `TYPE_ORDER`, `fmtDate()`, `VersionEntry` sub-component.

## Imports (Internal / External)
**Internal:**
- `getPublicChangelog`, types `ReleaseType`, `ReleaseBlock` from `../services/release`
- `useDocumentTitle` from `../hooks/useDocumentTitle`
- `RichText` from `@/components/ui/RichText`
- `htmlToPlainText` from `@/lib/richText`
- `VersionBadge` from `../components/versions/VersionBadge`

**External:**
- `react-router-dom` (`useParams, Link`)
- `@tanstack/react-query` (`useQuery`)
- `lucide-react` icons: `Rocket, GitBranch, Globe, Loader2`

## State / Hooks / Contexts
- `useParams()` → `{ id }` (product id from the URL).
- `useQuery({ queryKey: ['public-changelog', id], queryFn: () => getPublicChangelog(id), enabled: !!id, retry: false })`.
- `useDocumentTitle(data?.product?.name ? `${name} — Changelog` : null)`.
- No mutations, no contexts.

## Services & data (query keys, mutations, endpoints hit)
- **Query key:** `['public-changelog', id]` → `getPublicChangelog(id)` (from `services/release`). `enabled: !!id`, `retry: false`.
- Returned `data` shape used: `{ product, releases, unreleased }`, where `product` has `name, icon, description, wpOrgSlug, githubUrl`; `releases` is `ReleaseBlock[]`; `unreleased` is an optional `ReleaseBlock`.

## Behavior / Rendering
- **Loading:** centered full-screen spinner.
- **Error / no data** (`isError || !data`): full-screen "Changelog not found" message with a link to `/` ("Go to ATRS").
- **Hero:** product icon (or letter-avatar), name, "Changelog & release notes", `RichText` product description, and external links to WordPress.org (`https://wordpress.org/plugins/${wpOrgSlug}`) and GitHub (`githubUrl`) when present.
- **Timeline (`main`):** if `releases.length === 0 && !unreleased` → "No releases published yet."; otherwise renders `unreleased` block first (if present) then each `releases` block via `<VersionEntry>` (keyed by `versionId || label`).
- **Footer:** "All products" (`/explore`) and "Powered by ATRS" (`/`).

**`VersionEntry`** (per `ReleaseBlock`):
- Timeline node: `block.label` heading; a `VersionBadge kind="unreleased"` when `block.unreleased && block.label !== 'Unreleased'`; formatted `block.releasedAt`.
- `RichText` `block.notes`.
- For each type in `TYPE_ORDER` (`feature, improvement, bug-fix`) with items in `block.groups[t]`: a colored group label (`TYPE_META`) and a list of entries. Each entry shows `it.title`; an amber "Unreleased" inline badge when `!block.unreleased && it.tags?.includes('unreleased')`; and a `— shortDescription` suffix computed via `htmlToPlainText(it.shortDescription)` only if non-empty and different from the title.

## Important logic / algorithms
- **Unreleased handling at two levels:** the block level (a whole "Unreleased" version bucket) and the entry level (individual items tagged `unreleased` within a released version get an inline badge).
- **Short-description dedupe:** `htmlToPlainText(shortDescription)` is compared to `title`; identical or empty descriptions are omitted to avoid redundant "title — title" lines.
- **`fmtDate`** guards invalid/null dates → `''`.
- **`TYPE_META` / `TYPE_ORDER`** here use `bug-fix` (hyphenated) as the `ReleaseType`, unlike `AppChangelog` which uses `fix`.

## Relationships
- `services/release` → `getPublicChangelog` (public endpoint keyed by product id).
- `components/versions/VersionBadge` — shared version badge (consistent with the authenticated app per the versioning single-source memory).
- `lib/richText` → `htmlToPlainText`; `components/ui/RichText` for sanitized HTML.
- Sibling public pages: `PublicIssues` (`/issues/:id`), `Explore` (`/explore`).

## Edge cases & known limitations
- Any fetch error or missing/unpublished changelog collapses to the same "not found" state (no distinction between 404 and network error) — intentional for a public page.
- Requires `id`; `enabled: !!id` prevents a query with an undefined id.
- Relies on the backend to only return published/enabled content — no client-side gating beyond what the endpoint returns.
