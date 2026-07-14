# `client/src/components/products/ProductWpStats.tsx`
**Purpose:** Compact WordPress.org ecosystem stats strip for a product card: core WP.org metrics (installs, rating, last-updated) plus clickable chips linking to WP Rankings, WP Hive, Patchstack, and Plugin Tests.
**Language / Size:** TypeScript(React) / 5275 bytes

## Exports
- `ProductWpStats({ productId })` (named component).
- `Stat` and `StatChip` are module-private helpers.

## Props
- `productId: string`.

## State / Hooks
- `useQuery(['wpStats', productId], getProductWpStats)` with `staleTime: 30m`, `gcTime: 60m`, `refetchOnWindowFocus: false`, `retry: 1`.

## Behavior / Rendering
- Loading → skeleton grid (3 stat placeholders + 4 chip placeholders).
- Renders `null` when there's no data, no `slug`, or no `links`.
- Core metrics grid (when `wporg` present): Installs (`compact(activeInstalls)+`), Rating (`rating/20` → 0–5, one decimal), Updated (`daysAgo`).
- Chip row: Rank (WP Rankings, `#compact(ranking)`), Hive (WP Hive, `hive.memory`), Patch (Patchstack — icon/tone switch on `patchstack.present > 0`: red `ShieldAlert` vs emerald `ShieldCheck`; title shows present/patched counts), PT (Plugin Tests). Each chip is an external link with `e.stopPropagation()` so clicks don't trigger the card.

## Important logic / algorithms
- `compact(n)`: `Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })`, null-safe.
- `daysAgo(s)`: extracts a `YYYY-MM-DD`, computes day delta → "today" / "Nd ago" / "Nmo ago" / "Ny ago"; null on invalid.
- `stars = rating/20` (WP rating is 0–100).

## Relationships
- Service: `getProductWpStats` (`../../services/products`). Rendered inside product cards on the products listing.

## Edge cases & known limitations
- Silently renders nothing without a resolvable WP slug/links (e.g. standalone products).
- Long cache windows mean stats can be stale for up to ~30 minutes; single retry on failure.
