# `client/src/components/products/ReleasePublish.tsx`
**Purpose:** "Release Publishing" tab for a product: toggles for the public changelog page and public-directory listing, ready-to-paste export formats (WP.org readme.txt + Markdown), and a grouped preview of released/unreleased blocks.
**Language / Size:** TypeScript(React) / 12810 bytes

## Exports
- `ReleasePublish({ productId })` (named component).
- `ExportBox` and `ReleaseBlockView` are module-private helpers.

## Props
- `productId: string`.

## State / Hooks
- `copiedUrl` local state.
- `useQuery(['release', productId], getProductRelease)` → `{ product, releases, unreleased, formats }`.
- `publishMutation`(`updateProduct({ publicChangelogEnabled })`) and `directoryMutation`(`updateProduct({ listedInDirectory })`); both play sound, toast, and invalidate `['release', productId]` and `['product', productId]`.

## Behavior / Rendering
- Loading/`!data` → centered spinner.
- Header + (when no releases) a dashed empty prompt.
- Public changelog card: switch bound to `publishMutation`; when published shows `${origin}/changelog/${product.id}` with copy + open buttons.
- Public directory card: switch bound to `directoryMutation`; links to `/explore`.
- Export formats (when `hasReleases && formats`): two `ExportBox`es — readme.txt (`formats.readme`, download `<slug>-changelog.txt`) and Markdown (`formats.markdown`, download `<slug>-CHANGELOG.md`).
- Preview: `unreleased` block first, then each `releases` block via `ReleaseBlockView`.

## Important logic / algorithms
- `ExportBox`: read-only textarea; copy via `navigator.clipboard` (1.8s "Copied" state, sound); download via Blob/object-URL/`<a>` click.
- `ReleaseBlockView`: renders label, unreleased `VersionBadge` (unless label is literally "Unreleased"), formatted date or "Not yet released", notes, then groups (`TYPE_ORDER = feature, improvement, bug-fix`) each with a colored bullet, item title, "Pro" tag for `tier==='pro'`, an unreleased badge for items tagged `unreleased` in a released block, and an em-dash short description when it differs from the title.
- `fmtDate` formats ISO to a localized long date (empty on invalid).
- `hasReleases = releases.length > 0 || !!unreleased`.

## Relationships
- Services: `release` (`getProductRelease`, types `ReleaseType`/`ReleaseBlock`), `products` (`updateProduct`). Shares `VersionBadge` and type-color conventions with `PresentationMode`/`ActivityForm`. Public page: `/changelog/:id`; directory: `/explore`.

## Edge cases & known limitations
- Export content (`formats`) is produced server-side; the component only displays/copies it.
- Publishing to the directory and the changelog page are independent toggles.
