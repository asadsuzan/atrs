# `client/src/pages/Explore.tsx`

**Purpose:** Public product directory. Lists all published products as cards with links to each product's public changelog and issues pages. No auth, rendered outside the app shell.

**Language / Size:** TypeScript(React) / 6363 bytes

## Route
- Mounted in `App.tsx` at `path="/explore"` inside a bare `<Suspense fallback={<PageSkeleton />}>` — public, outside `ProtectedLayout` (no sidebar).
- Linked to from the Dashboard "Public Site" button (`copyPublicUrl` copies `${origin}/explore`) and from the "All products" footer link on `PublicChangelog` and `PublicIssues`.

## Exports
- **Default export:** `Explore()` — the page component.
- No named exports.
- Module-local (not exported): `CATEGORY_LABEL` (map), `ProductCard` sub-component.

## Imports (Internal / External)
**Internal:**
- `getPublicProducts`, type `PublicProduct` from `../services/public`
- `useDocumentTitle` from `../hooks/useDocumentTitle`
- `RichText` from `@/components/ui/RichText`

**External:**
- `react-router-dom` (`Link`)
- `@tanstack/react-query` (`useQuery`)
- `react` (`useState`)
- `lucide-react` icons: `Rocket, GitBranch, Globe, Loader2, ScrollText, Bug, Boxes, Search`

## State / Hooks / Contexts
- `useQuery({ queryKey: ['public-products'], queryFn: getPublicProducts, retry: false })` → `{ data, isLoading, isError }`.
- `useState('')` → `search` — client-side search text.
- `useDocumentTitle('Products')`.
- No contexts, no mutations.

## Services & data (query keys, mutations, endpoints hit)
- **Query key:** `['public-products']` → `getPublicProducts()` (from `services/public`). `retry: false` so a failed public fetch surfaces the error state quickly.
- No mutations.

## Behavior / Rendering
- **Loading:** while `isLoading`, renders a centered full-screen spinner (`Loader2` animate-spin).
- After load, `products = data ?? []`; `filtered` = case-insensitive substring match of `search` against each product's `name` and `description` (empty search → all products).
- **Hero header:** `Boxes` icon + "Products" title, blurb, and a search input (rendered only when `products.length > 0`).
- **Main content branches:**
  - `isError` → "Couldn't load products. Please try again later."
  - `products.length === 0` → empty state (Boxes icon + "No products published yet.").
  - `filtered.length === 0` (search matched nothing) → `No products match "{search}".`
  - otherwise → responsive grid (`sm:grid-cols-2 lg:grid-cols-3`) of `<ProductCard>` (keyed by `p.id`).
- **Footer:** "Powered by ATRS" link to `/`.

**`ProductCard`** renders per product:
- Optional banner image (lazy-loaded) at top.
- Icon image (lazy) or a letter-avatar fallback (`name[0]`), name, and category label from `CATEGORY_LABEL` (`plugin→Plugin, block→Block, theme→Theme, standalone→App`).
- Optional `RichText` description clamped to 3 lines.
- Footer link row: "Changelog" link to `/changelog/${id}` (only if `publicChangelogEnabled`), "Issues" link to `/issues/${id}` (only if `publicIssuesEnabled`), a spacer, then external icon links to `https://wordpress.org/plugins/${wpOrgSlug}` (if `wpOrgSlug`) and `githubUrl` (if set), both `target="_blank" rel="noopener noreferrer"`.

## Important logic / algorithms
- **Client-side filtering:** `search.trim().toLowerCase()`; `filtered` uses `[name, description].some(...)` — descriptions are raw HTML strings but are matched as text (no stripping), so HTML tags could technically affect matches.
- **Conditional per-product links:** changelog/issues links depend on the product's `publicChangelogEnabled` / `publicIssuesEnabled` flags returned by the API, so a product may appear with no public sub-pages.
- Three distinct empty/error states (error vs. nothing published vs. nothing matched search).

## Relationships
- `services/public` → `getPublicProducts` (public, unauthenticated backend endpoint returning `PublicProduct[]`).
- Links feed the other public pages: `PublicChangelog` (`/changelog/:id`) and `PublicIssues` (`/issues/:id`).
- `RichText` renders sanitized product description HTML.

## Edge cases & known limitations
- Card links assume the product's public flags are accurate; if both are disabled the card shows only external links (or nothing in the link row besides the spacer).
- Search only matches name + description, not category or slug.
- Description HTML is used for both display (`RichText`) and the search predicate (raw string) — tags are not stripped before matching.
- No pagination — all published products render at once.
