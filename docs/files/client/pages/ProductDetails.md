# `client/src/pages/ProductDetails.tsx`

**Purpose / Route:** Product detail page at `/products/:id`. Shows a product header (banner/icon/meta, enriched from WordPress.org when `wpOrgSlug` set) and a tabbed workspace: Activity Timeline (changelog cards, drag-reorder, filter, infinite scroll, markdown export), Versions, Marketing Hub, Release, Issues, and (conditionally) Readme.
**Language / Size:** TSX / 43870 bytes

## Exports
- `default function ProductDetails()` — the page component.
- (Module-internal, not exported) `SortableActivityCard`, `ActivitySection` components; `ISSUE_STATUS_BADGE`, `ISSUE_SEVERITY_DOT`, `ISSUE_STATUS_LABEL` constant maps.

## Imports (Internal / External)
**External:** `react-router-dom` (`useParams`, `Link`, `useLocation`, `useSearchParams`); `react` (`useState`, `useEffect`, `useRef`); `@tanstack/react-query` (`useQuery`, `useInfiniteQuery`, `useQueryClient`, `useMutation`); `lucide-react` icons (ArrowLeft, GitBranch, Globe, ChevronDown, ChevronRight, Download, GripVertical, Edit2, Trash2, Bug, Loader2); `framer-motion` (`motion`, `AnimatePresence`); `sonner` (`toast`); `date-fns` (`format`); `@dnd-kit/core` (`DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors`); `@dnd-kit/sortable` (`SortableContext`, `sortableKeyboardCoordinates`, `rectSortingStrategy`, `useSortable`); `@dnd-kit/utilities` (`CSS`).
**Internal services:** `../services/products` (`getProductById`); `../services/activities` (`getActivities`, `reorderActivity`, `updateActivity`, `deleteActivity`).
**Internal UI/components:** `@/components/ui/button`, `badge`, `select`, `input`, `DatePicker`, `dialog`, `media-carousel`, `AuthorAvatar`, `RichText`, `skeletons` (`ProductDetailsSkeleton`, `ProductActivitiesSkeleton`); `../components/activities/ActivityForm`; `../components/layout/PageTransition`; `../components/marketing/MarketingManager`; `../components/versions/VersionManager`; `../components/versions/VersionBadge`; `../components/issues/IssueManager`; `../components/products/WpReadmeViewer`; `../components/products/ReleasePublish`.
**Internal hooks/lib:** `../hooks/useVersions` (`useProductVersions`); `../hooks/useDocumentTitle`; `../hooks/useDebouncedValue`; `../lib/versions` (`compareVersionDesc`); `@/lib/utils` (`cn`); `@/lib/sound` (`playSound`); `../contexts/ConfirmContext` (`useConfirm`).

## Component tree & sub-components defined
- `ProductDetails` (default)
  - `PageTransition` wrapper
  - Back button (`Link` to `/products`)
  - Product header block (banner/icon/title/author/description/badges/GitHub+WP.org links)
  - Tab bar (activities, versions, marketing, release, issues, readme[conditional])
  - Activity tab: filter toolbar + `DndContext` → 3× `ActivitySection` (Features / Improvements / Bug Fixes) → each maps `SortableActivityCard`
  - `VersionManager` / `MarketingManager` / `ReleasePublish` / `IssueManager` / `WpReadmeViewer` per active tab
  - Edit `Dialog` containing `ActivityForm`
- `SortableActivityCard` — draggable card (via `useSortable`); renders `MediaCarousel`, title/badges (version label, PRO, released/unreleased, needs-review link to `/review`), date, author avatar, `RichText` description, linked resolved issues (buttons calling `onIssueClick`), and sub-`items`.
- `ActivitySection` — collapsible group with animated height; wraps cards in `SortableContext` (rectSortingStrategy). Uses local `isOpen`/`animating` state to toggle overflow so active-card ring/scale isn't clipped.

## State / Refs / Context consumed
**State (ProductDetails):** `activeTab` ('activities'|'marketing'|'versions'|'readme'|'release'|'issues'), `activeCardId`, `search`, `type`, `tier`, `tagFilter`, `startDate`, `endDate`, `versionFilter`, `editingActivity`, `focusIssueId`.
**Derived:** `debouncedSearch` (via `useDebouncedValue(search, 300)`).
**Refs:** `loadMoreRef` (infinite-scroll sentinel).
**Context:** `useConfirm()` → `confirm` (ConfirmContext). `useQueryClient()`.
**SortableActivityCard state:** `useSortable` transform/transition. **ActivitySection state:** `isOpen`, `animating`.

## Hooks & Effects (deps, purpose, WHY)
- `useProductVersions(id)` → `productVersions`: single source for version filter options + Latest flag (shared cache with VersionManager).
- `useDocumentTitle(product?.name)`: sets tab title.
- `useEffect([searchParams])`: reads `?tab=` to set active tab; reads `?issue=` to open Issues tab and set `focusIssueId` (deep linking from dashboard/sidebar).
- `useEffect([allActivities.length, location.hash, activeTab])`: when on activities tab and a `#hash` is present, after 300ms timeout scrolls the matching element into view and flashes a primary ring for 2s. WHY: deep-link to a specific activity card.
- `useEffect([activeTab, versionFilter, hasNextPage, isFetchingNextPage, fetchNextPage, allActivities.length])`: IntersectionObserver on `loadMoreRef` (rootMargin 300px) that calls `fetchNextPage()` when sentinel visible. Only active on activities tab with `versionFilter === 'all'` and `hasNextPage`. WHY: auto infinite-scroll, but disabled under a version filter (narrowed set) — falls back to manual "Load more".
- `useSensors(PointerSensor, KeyboardSensor)`: dnd-kit drag sensors.

## Data fetching (services/endpoints; react-query keys/mutations)
- `useQuery(['product', id])` → `getProductById(id)`.
- `useQuery(['wp-plugin', product?.wpOrgSlug])` → direct `fetch` to `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request[slug]=<slug>` (returns null on failure); `enabled` only when `wpOrgSlug` present. Used to enrich header name/author and contributor avatars.
- `useInfiniteQuery(['activities', id, type, tier, tagFilter, debouncedSearch, startDate, endDate, versioned])` → `getActivities({...queryParams, page})`, page size 9, `getNextPageParam` compares `page < totalPages`. `enabled: !!id`.
- Export path: `getActivities({ productId:id, limit:-1, ... })` fetches ALL entries for markdown export.
- Mutations: `updateMutation` → `updateActivity` (invalidates `['activities', id]`, plays 'success' sound, toast, closes edit dialog); `deleteMutation` → `deleteActivity` (invalidates, plays 'delete' sound). `reorderActivity(act._id, targetIndex)` called imperatively in `handleDragEnd` then invalidates `['activities', id]`.

## Event handlers & key functions (purpose, algorithm, side effects)
- `handleIssueClick(issueId)`: sets active tab to 'issues' + `focusIssueId`.
- `handleEditActivity(act)`: normalizes act into editable shape (productId/versionId to ids, `activityDate` formatted `yyyy-MM-dd`, tags default `[]`) → sets `editingActivity`.
- `handleDeleteActivity(act)`: awaits `confirm()` dialog then `deleteMutation.mutate(act._id)`.
- `handleDragEnd(event)`: no-op if dropped outside/on self. Finds active & over activities; reorders ONLY within the same `type` group (features/improvements/bug-fix rendered separately), computes `targetIndex` within that group, calls `reorderActivity`, invalidates cache; toasts on error.
- `exportChangelog()`: fetches full activity list (limit -1), builds a Markdown string (`# Changelog - <name>`, per-activity `## title`, date/type/version line, shortDescription), creates a Blob and triggers download `<slug>-changelog.md`. Toasts on failure. (Markdown only — no PDF/PPTX here.)
- `avatarFor(author)`: looks up lowercased author in `contribAvatars` map built from `wpData.contributors`.

## Rendered UI sections
1. Back-to-products button. 2. Product header card (banner or grid placeholder; icon or initials; WP.org-enriched name/author; RichText description; category/status badges; GitHub + WordPress.org links). 3. Tab bar. 4. Activities tab: filter toolbar (search input, type select, conditional tier select for features, tag select, version select, Export button) + date-range row (From/To DatePickers, clear/reset) + activity sections in DndContext + lazy-load footer (sentinel div, spinner, "Load more (N more)" button, "All N entries loaded"). 5. Other tabs render their manager components. 6. Edit dialog with ActivityForm.

## Export/generation logic
Only client-side Markdown export (`exportChangelog`) — Blob of `text/markdown` downloaded as `<slug>-changelog.md`. No PDF/PPTX/PNG libraries used on this page.

## Important logic & design patterns
- Sub-components hoisted to module scope for stable identity.
- Version filter options merge real product versions (with Unreleased/Latest badges) plus orphan labels found only on activities, sorted by `compareVersionDesc`; `__none__` sentinel = "Unversioned".
- Client-side `activities` filtering by `versionFilter` on top of server-side query params; features/improvements/bugFixes split by `type`.
- Infinite scroll auto-load disabled while a version filter is active.
- Deep-linking via `?tab=`, `?issue=`, and `#hash`.
- dnd-kit sortable reorder scoped per type group.

## Relationships
- Reached from `/products` list (`Products.tsx`) and sidebar deep links.
- Delegates major features to `VersionManager`, `MarketingManager`, `ReleasePublish`, `IssueManager`, `WpReadmeViewer`, `ActivityForm`.
- Shares version cache via `useProductVersions` hook (same cache as VersionManager).
- Consumes ConfirmContext for delete confirmation; uses services `products` and `activities`.
