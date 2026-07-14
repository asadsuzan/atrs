# `client/src/components/layout/SidebarNav.tsx`
**Purpose:** The primary left-sidebar navigation: top-level links plus collapsible, deep-linked nested trees for Products (→ detail tabs), Changelogs (→ log entries), and Reports (→ Monthly months / Annual), with badges and an admin owner-grouping mode.
**Language / Size:** TSX / 26752 bytes

## Exports
- `SidebarNav({ isCollapsed, isAdmin })` (named function component).

## Imports (Internal / External)
- Internal (services): `getProducts` (products), `getActivities` (activities), `getPendingReviewIssues` (issues), `getFeatureRequests` (featureRequests), `getUsers` (users), `getNavSettings` (config). Context: `useAddProduct` from `../../contexts/AddProductContext`. UI: `Skeleton` from `@/components/ui/skeleton`.
- External: `Link, useLocation, useSearchParams` (react-router-dom); `useQuery` (@tanstack/react-query); `useState, useEffect, useMemo, type ReactNode` (react); many lucide-react icons.

## Props
- `isCollapsed: boolean` — icon-only rail vs full labels.
- `isAdmin: boolean` — enables owner grouping, Users link, feature-request pending badge.

## State / Refs / Context consumed
- Module-scope constants: `MONTHS` (12 season/holiday icons), `LOG_TYPE_ICONS`/`LOG_TYPE_COLOR` (feature/improvement/bug-fix), `PRODUCT_TABS` (activities, versions, marketing, release, issues).
- `SidebarNav` state: `productsOpen`, `changelogsOpen`, `reportsOpen` (default true), `monthlyOpen` (default false).
- Child components carry their own state: `ProductTabsItem` (`open`), `ChangelogProductItem` (`open`), `UserNavGroup` (`open` from `defaultOpen`).
- Context: `useAddProduct()` → `openAddProduct`, `openAddProductFirst`.
- Router: `useLocation()`, `useSearchParams()`.

## Hooks & Effects (deps, purpose)
- `useQuery(['products','nav'])` → `getProducts({ limit: 100 })` (shares 'products' prefix so create/delete/import invalidations refresh it).
- `useQuery(['activities','needs-review-count'])` → `getActivities({ needsReview: true, limit: 1 })`.
- `useQuery(['issues','pending-review'])` → `getPendingReviewIssues`. `reviewCount = reviewData.total + pendingIssues.length`.
- `useQuery(['feature-requests'])` → `getFeatureRequests` (`enabled: isAdmin`); `pendingFeatureCount` = pending statuses.
- `useQuery(['users'])` → `getUsers()` (`enabled: isAdmin`); `useMemo` builds `userNameMap`.
- `useQuery(['nav-settings'])` → `getNavSettings`; `navMode` = `navSettings?.mode ?? 'expanded'` (expanded|collapsed|disabled).
- `useMemo` `productGroups`: for admins, buckets products by owner id and sorts by owner name.
- `ChangelogProductItem` `useQuery(['activities','nav',productId])` — lazily (`enabled: open`) loads that product's 50 latest logs.
- `useEffect([navMode])`: seeds section open-state from admin default (collapsed → all closed; expanded → all open).

## Functions & handlers
- `navLabel(name)`: truncates product names > 10 chars with an ellipsis.
- `ProductAvatar({ product })`: product icon image, else tinted initial fallback.
- Helper components: `ProductTabsItem` (product → detail tabs, adds Readme tab only if `product.wpReadme`), `ChangelogProductItem` (product → its log entries, deep-linked to `#activity-{id}`), `UserNavGroup` (collapsible owner bucket), inline `LeafLink`, `SectionHeader` (label navigates, chevron toggles), `ChildLink`, `ChildSkeleton`, `EmptyAction`.
- `isPathActive(to)`: exact match or (non-root) prefix match.

## Rendered UI
- `<nav>` column: Dashboard; Products section; Changelogs section; Review queue (with amber `reviewCount` badge); Media Library; Reports section (Monthly months grid + Annual); Readme Tools; Git Changelog; Audit Logs; Users (admin); Help & Demos; and a separated Feature Requests card (amber accent, `pendingFeatureCount` badge, admin subtitle "Triage user ideas" vs "Share your ideas").
- When `navDisabled` (`navMode === 'disabled'`), Products/Changelogs/Reports render as plain `LeafLink`s (no nesting).
- Collapsed mode hides labels and centers icons; badges become dots.

## Important logic & design patterns
- Deep-linking everywhere: product tabs via `?tab=`, changelog entries via `#activity-{id}`, reports via `?tab=monthly&month=&year=` / `?tab=annual`; active states derived from `location`/`searchParams`/`hash`.
- Helper components declared at module scope so their open/loaded state survives the parent's re-renders on navigation.
- Lazy loading: changelog entries fetched only when a product row is expanded.
- Query keys share prefixes with page-level queries so mutations elsewhere refresh sidebar data automatically.
- Admin owner grouping bucketed via `ownerId()` (handles populated object vs raw id).

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `AddProductContext`. Does not use JobStream/ChangelogGen/WindowManager/Notification. Rendered inside the app layout shell (sidebar), which passes `isCollapsed`/`isAdmin`.
