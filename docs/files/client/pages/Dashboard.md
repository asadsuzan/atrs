# `client/src/pages/Dashboard.tsx`

**Purpose / Route:** Renders at `/` (per App.tsx knowledge: Dashboard=/). The "Command Center" home dashboard — monthly summary metrics, an action center (open issues, pending releases, unversioned entries, stale products), activity trend chart, recent activity feed, and product-landscape overview.

**Language / Size:** TSX / 44023 bytes

## Exports (default component + named)
- **Default export:** `Dashboard()`.
- No named exports.
- Module-local consts (not exported): `SEVERITY_RANK`, `SEVERITY_DOT`, `TYPE_DOT`.

## Imports (Internal components/hooks/contexts/services / External libs)
**Internal — services:**
- `getMonthlyReport, getTrendData` from `../services/reports`
- `getProducts, getStaleProducts`, type `StaleProduct` from `../services/products`
- `getActivities, updateActivity` from `../services/activities`
- `getAuditLogs` from `../services/auditLogs`
- `getAllIssues`, type `IssueWithProduct` from `../services/issues`

**Internal — hooks:**
- `useAllVersions` from `../hooks/useVersions`

**Internal — components:**
- `VersionBadge` from `../components/versions/VersionBadge`
- `PageTransition`, `staggerContainer`, `staggerItem` from `../components/layout/PageTransition`
- `TrendChart` from `../components/reports/TrendChart`
- `DashboardSkeleton` from `@/components/ui/skeletons`
- `QuickIssueDialog` from `../components/issues/QuickIssueDialog`
- `StreakCard` from `../components/dashboard/StreakCard`
- `classifyStale` from `../components/products/StaleProductAlert`
- shadcn UI: `Card, CardContent, CardHeader, CardTitle, CardDescription`; `Button`; `Badge`; `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`
- `playSound` from `@/lib/sound`

**External libs:**
- `@tanstack/react-query` (`useQuery, useMutation, useQueryClient`)
- `react` (`useState`)
- `react-router-dom` (`Link`)
- `date-fns` (`formatDistanceToNow`)
- `sonner` (`toast`)
- `lucide-react` icons (Package, PlusCircle, Wrench, Bug, FileText, Activity as ActivityIcon, ArrowRight, Play, ServerOff, Puzzle, LayoutGrid, AlertTriangle, Rocket, CircleCheck, Tag, Clock, Globe, Copy, Check)
- `framer-motion` (`AnimatePresence, motion`)

## Component tree & sub-components defined in file
Single `Dashboard()` component. No sub-components declared in-file (all reused: `StreakCard`, `TrendChart`, `QuickIssueDialog`, `VersionBadge`). Renders: `PageTransition` → header + action buttons → `StreakCard` → stale banner (AnimatePresence) → Monthly Summary grid (6 metric `Card`s) → Action Center grid (4 `Card`s) → two-column grid (Activity Trend + Recent Activity Feed | Product Landscape + Activity Distribution) → `QuickIssueDialog`.

## State (useState/useReducer), Refs, Context consumed
**useState:**
- `quickIssueOpen` (false) — controls `QuickIssueDialog`.
- `copiedPublic` (false) — "copied" checkmark state for the public-URL copy button.
- `staleBannerDismissed` (false) — dismisses the critical-stale banner.
- `assigningId: string | null` — id of the activity currently having a version assigned (loading state).

**Refs/Context:** No refs. `useQueryClient()` → `queryClient`. No React context consumed directly.

## Hooks & Effects — for each useEffect: deps, purpose, WHY
- No `useEffect` in this file. Data is fetched declaratively via react-query; side effects live in mutation callbacks and event handlers.

## Data fetching (services/api endpoints; react-query keys/mutations)
**Queries:**
- `['dashboardReport', currentMonth, currentYear]` → `getMonthlyReport({ month, year })`.
- `['dashboardProducts']` → `getProducts()`.
- `['dashboardActivities']` → `getActivities({ limit: -1 })` (all activities).
- `['dashboardAuditLogs']` → `getAuditLogs()`.
- `['dashboardTrend']` → `getTrendData({ months: 6 })`.
- `['allIssues']` → `getAllIssues()` — loads independently so a slow/failed fetch never blocks the rest of the dashboard.
- `['staleProducts']` → `getStaleProducts()`.
- `useAllVersions()` custom hook → `{ raw: versionsData, byProduct: versionsByProduct }` — single source for all products' versions (decorated + grouped per product).

**Mutations:**
- `assignVersion` → `updateActivity({ id, productId, versionId })`. onMutate sets `assigningId`; onSuccess plays success sound, toasts, invalidates `['dashboardActivities']`, `['release', productId]`, `['allVersions']`; onError sound+toast; onSettled clears `assigningId`.

**Loading/error gating:** If any of report/products/activities/auditLogs/trend is loading → returns `<DashboardSkeleton />`. If any of those errored → returns a ServerOff error state. Issues, stale, and versions load independently (not part of the blocking gate).

## Event handlers & key functions — purpose, algorithm, side effects
- `copyPublicUrl()` — writes `${window.location.origin}/explore` to clipboard, sets `copiedPublic` true for 1800ms, plays click sound; toasts on failure.
- `getLogLink(log)` — builds a Link target from an audit log: `#` for DELETE; `/products/{entityId}` for PRODUCT; for ACTIVITY resolves the product from `allActivities` → `/products/{productId}#activity-{id}` (or `/activities` fallback).
- `getProductNameForLog(log)` — for ACTIVITY logs, resolves the parent product name via `allActivities` + `allProducts` lookup; else null.
- `productNameOf(pid)` / `productIdOf(pid)` — normalize a productId that may be a populated object or a raw id.
- `ensurePending(rawId, name)` — lazily creates/returns a `Pending` accumulator entry in `pendingMap` keyed by product id.

**Derived data (computed each render):**
- `summary` — from `report.summary` (products/features/improvements/bugFixes/totalActivities) with zero defaults.
- Product buckets: `activeProducts`, `inactiveProducts` (by status), `plugins`, `blocks` (by category).
- Activity totals: `totalFeatures`, `totalImprovements`, `totalBugs`, `totalReleased`/`totalUnreleased` (by `tags`), `grandTotal`; percentages `featurePct`/`improvePct`/`bugPct` (bugPct computed as remainder to always total 100%).
- `openIssues` — issues with status open/in-progress, sorted by `SEVERITY_RANK`; `criticalCount`.
- `pendingByProduct` — per-product unreleased entries (activities tagged `unreleased`) + versions with `status==='unreleased'`, sorted by total count desc; `totalUnreleasedVersions`.
- `unversionedActs` — activities with no `versionId`, sorted by `activityDate` desc.
- `staleProducts`, `staleDays`, `criticalStale` (via `classifyStale`, level `critical`).

## Rendered UI sections (tabs/panels) and what each does
- **Header/action bar:** title "Command Center"; buttons Manage Products (`/products`), Log Activity (`/activities`), Report Issue (opens QuickIssueDialog, disabled if no products), Public Site split-button (opens `/explore` + copy link), View Reports (`/reports`).
- **StreakCard** — daily logging habit widget.
- **Critical-stale banner** — animated (AnimatePresence); shows count of products urgently needing updates when `criticalStale.length>0` and not dismissed; names up to 3; dismissible.
- **Monthly Summary grid (6 cards):** Products Updated, Features Delivered, Improvements Made, Bug Fixes Resolved (all from `summary`, "This month"); Released (`totalReleased`) and Unreleased (`totalUnreleased`), "All time".
- **Action Center grid (4 cards):**
  - *Open Issues* — top 5 open issues (severity dot, product name, In Progress badge), links to `/products/{id}?tab=issues&issue={id}`; Report button.
  - *Pending Release* — top 5 products with unreleased entries/versions, linking to filtered `/activities` and `/products/{id}?tab=versions&versionStatus=unreleased`.
  - *Unversioned Entries* — top 5 activities without a version; either "Add version" link (product has no versions) or an inline `Select` to assign a version (calls `assignVersion` mutation; options decorated with `VersionBadge` latest/unreleased); "View all" link to `/activities?versioned=none`.
  - *Needs Updating* — top 5 stale products (icon, last-activity relative time), link to `/products/{id}?tab=activities`.
- **Left column:** Activity Trend card (`TrendChart` over `trendData`); Recent Activity Feed card (scrollable list of audit logs with CREATE/UPDATE/DELETE icons, entity name, product name, type & action badges, relative time, links via `getLogLink`).
- **Right column:** Product Landscape card (total products count, Active/Inactive/Plugins/Blocks tiles, View All Products link); Activity Distribution card (stacked percentage bar + Features/Improvements/Bug Fixes legend).
- **QuickIssueDialog** — controlled by `quickIssueOpen`, receives `allProducts`.

## Important logic & design patterns
- **Independent (non-blocking) queries:** issues, stale products, and versions are fetched separately from the five core queries so their latency/failure doesn't block the dashboard render.
- **Optimistic-ish assign flow:** `assignVersion` tracks `assigningId` via onMutate/onSettled to show per-row busy state and disable the Select.
- **Defensive productId normalization** (`productNameOf`/`productIdOf`/`ensurePending`) handles both populated objects and raw ids.
- **Percentage remainder trick:** `bugPct` is derived as `100 - featurePct - improvePct` when totals exist to guarantee the stacked bar sums to 100.
- **`limit: -1`** passed to `getActivities` to fetch the full activity set for client-side aggregation.
- Constant color/rank maps (`SEVERITY_RANK`, `SEVERITY_DOT`, `TYPE_DOT`) drive sorting and dot colors.
- framer-motion stagger animations on the summary grid; AnimatePresence on the banner.

## Relationships (services called -> backend routes; contexts used)
- `services/reports` → `getMonthlyReport`, `getTrendData`.
- `services/products` → `getProducts`, `getStaleProducts`.
- `services/activities` → `getActivities`, `updateActivity`.
- `services/auditLogs` → `getAuditLogs`.
- `services/issues` → `getAllIssues`.
- `hooks/useVersions` (`useAllVersions`) → aggregated versions data (invalidated via `['allVersions']`).
- `lib/sound` → `playSound`.
- No React context consumed directly (only `useQueryClient`).
- Navigation via react-router `Link` to `/products`, `/activities`, `/reports`, `/explore`, and product-scoped deep links with query params/hash.
