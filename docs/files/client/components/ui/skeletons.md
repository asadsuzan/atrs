# `client/src/components/ui/skeletons.tsx`
**Purpose:** Library of composed shimmer/skeleton loading placeholders that mirror the app's real layouts — shared primitives plus full-page skeletons used as Suspense/route fallbacks.
**Language / Size:** TSX / 25603 bytes

## Exports (all named function components)
**Shared primitives:** `StatCardSkeleton`, `TableRowSkeleton({ cols })`, `ProductCardSkeleton`, `ChangelogCardSkeleton`.
**Page/route-level:** `PageSkeleton` (generic lazy-route fallback), `AuthBootSkeleton` (centered, no app chrome, while auth resolves), `UsersTableSkeleton`, `DashboardSkeleton`, `ProductsTableSkeleton`, `ActivitiesTableSkeleton`, `ProductDetailsSkeleton`, `ProductActivitiesSkeleton` (tab-content only), `ReportsSkeleton`, `AuditLogSkeleton`.

## Props
- Only `TableRowSkeleton` takes props: `{ cols: number }` (renders that many placeholder cells). All others are prop-less.

## Imports (Internal / External)
- Internal: `Skeleton` (`@/components/ui/skeleton`), `Card, CardContent, CardHeader` (`@/components/ui/card`).
- External: none.

## Behavior / Rendering
- Each component composes `Skeleton` blocks (and `Card` sections) into a static shape matching its target screen: headers, filter bars, stat-card grids, tables with header rows + N shimmer rows (typically `Array.from({ length: N })`), pagination footers, hero/banner blocks, and tabbed activity sections.
- `DashboardSkeleton` mirrors the dashboard: header, 6 `StatCardSkeleton`s, an activity feed column, and product-landscape/activity-distribution cards.
- `ProductDetailsSkeleton` / `ProductActivitiesSkeleton` mirror grouped activity sections (Features / Improvements / Bug Fixes).
- Table skeletons (`ProductsTableSkeleton`, `ActivitiesTableSkeleton`, `AuditLogSkeleton`, `UsersTableSkeleton`) render realistic column headers and cell placeholders.

## Relationships
- No contexts. Built purely from `Skeleton` + `Card`. Consumed as loading fallbacks by their corresponding pages/routes (Dashboard, Products, Activities, Product Details, Reports, Audit Log, Users) and as the generic lazy-route Suspense fallback (`PageSkeleton`).

## Edge cases & known limitations
- Purely presentational and static; row/card counts are hard-coded to approximate typical page density, not the eventual data length.
