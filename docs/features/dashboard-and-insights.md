# Reports & Dashboard

**Summary:** The Dashboard ("Command Center" at `/`) surfaces this-month metrics, an activity trend, and a triage action center (open issues, pending releases, unversioned entries, stale products) with inline version-assign; the Reports page (`/reports`) generates monthly/custom-range and annual reports with a version filter, admin cross-owner scoping, exports (PDF/PPTX/CSV/JSON), and a full-screen Presentation deck.

## User-facing entry points
- **`/` — Dashboard ("Command Center").** Home landing page. Header actions link to `/products`, `/activities`, `/explore` (public site + copy-link), `/reports`, and open the `QuickIssueDialog`. Deep links into product-scoped views (e.g. `/products/{id}?tab=issues&issue={id}`, `?tab=versions&versionStatus=unreleased`, `/activities?versioned=none`).
- **`/reports` — Reports page.** Two tabs: **Detailed Report** (monthly or custom date range) and **Annual Summary**. Reachable from the sidebar with optional `?tab`/`?month`/`?year` deep-link params. Buttons: toggle custom range, Generate, Present, and an Export dropdown (PDF/PPTX/CSV/JSON).
- **Presentation Mode** — a full-screen (townhall) slide deck launched from the Reports "Present" button, rendered as a portal overlay.
- The **StreakCard** habit widget is surfaced on the Dashboard but is a separate feature (see Related docs).

## Client pieces
**Pages**
- `client/src/pages/Dashboard.tsx` — the Command Center. React Query keys:
  - `['dashboardReport', currentMonth, currentYear]` → `getMonthlyReport({ month, year })`
  - `['dashboardProducts']` → `getProducts()`
  - `['dashboardActivities']` → `getActivities({ limit: -1 })` (full set for client-side aggregation)
  - `['dashboardAuditLogs']` → `getAuditLogs()` (recent-activity feed)
  - `['dashboardTrend']` → `getTrendData({ months: 6 })`
  - `['allIssues']` → `getAllIssues()` (loaded independently; non-blocking)
  - `['staleProducts']` → `getStaleProducts()` (non-blocking)
  - `useAllVersions()` (`hooks/useVersions`) → `{ raw, byProduct }`, the single source for per-product versions.
  - Mutation `assignVersion` → `updateActivity({ id, productId, versionId })`; tracks `assigningId` via onMutate/onSettled; onSuccess invalidates `['dashboardActivities']`, `['release', productId]`, `['allVersions']`.
  - Loading/error gate: report/products/activities/auditLogs/trend block render (`DashboardSkeleton` / ServerOff state); issues, stale, and versions load independently so their latency/failure never blocks the page.
- `client/src/pages/Reports.tsx` — report builder + exporter. React Query keys:
  - `['products']` → `getProducts()`; `['users']` → `getUsers()` (`enabled: isAdmin`, for the admin user/owner select)
  - `['report-monthly', monthlyQueryArgs]` → `getMonthlyReport({ month, year, productId, ownerId, startDate, endDate })` — month/year sent only when NOT a custom range; `'all'` selections sent as `undefined`; uses `placeholderData: (prev) => prev` so the deck doesn't blank when stepping months
  - `['report-annual', annualQueryArgs]` → `getAnnualReport({ year, productId, ownerId })`
  - No mutations — "generation" = copying UI filter state into the query-key objects (`monthlyQueryArgs`/`annualQueryArgs`). Filter selections persist to localStorage (`atrs_reports_*`) via `useLocalStorage`.

**Components**
- `client/src/components/dashboard/StreakCard.tsx` — daily-logging widget (own feature).
- `client/src/components/reports/TrendChart.tsx` — Recharts stacked bar (per-month Features/Improvements/Bug Fixes); empty-data guard.
- `client/src/components/reports/DonutChart.tsx` — Recharts donut of Features/Improvements/Bug Fixes; shared fixed category colors (`#3b82f6`/`#a855f7`/`#ef4444`), empty-data guard.
- `client/src/components/reports/PresentationMode.tsx` — portal-rendered full-screen deck: summary slide + one slide per product + optional thank-you slide. Keyboard/wheel navigation, fullscreen, per-product dynamic accent colors (`extractAccentColor`), media lightbox, and in-deck month stepping. Reads `['branding']` via `getBranding` and `useAuth()` for the "Prepared by" footer.

**Services**
- `client/src/services/reports.ts` — `getMonthlyReport`, `getTrendData`, `getAnnualReport` (thin axios wrappers over `/api/reports/*`).

**Contexts/hooks**
- `AuthContext` (`useAuth`) → `isAdmin` gates the Reports user/owner select.
- `useAllVersions` → cross-product version-status data (`labelInfo`) for version badging/filtering; shared with other version-aware pages.

## Server pieces
Route → controller → service; guarded at the mount by `requireAuth` + `requireActive` (any authenticated, active user).
- `server/src/routes/reportRoutes.ts` — mounted `app.use('/api/reports', requireAuth, requireActive, reportRoutes)`. No Zod; query hardening is in the controller.
  - `GET /monthly` → `ReportController.getMonthlyReport`
  - `GET /trend` → `ReportController.getTrend`
  - `GET /annual` → `ReportController.getAnnual`
- `server/src/controllers/ReportController.ts` — input hardening:
  - `getMonthlyReport`: if both `startDate` & `endDate` present → custom-range mode (`getMonthlyReport(0, 0, user, productId, startDate, endDate, ownerId)`); else requires `month` (1–12) + `year` (2000–2100) → `400` if missing/out of range.
  - `getTrend`: `months` clamped to [1,60], default 6 (invalid silently falls back).
  - `getAnnual`: `year` in [2000,2100] else defaults to current year.
  - `ownerId` is an optional cross-owner (admin) scoping param passed straight through.
- `server/src/services/ReportService.ts` — aggregates the `Activity` collection only:
  - `getMonthlyReport(...)`: builds a date window (custom range, else local-time `[year, month-1, 1]` .. last day of month), `matchStage = scopeFilter(user, { activityDate })` + optional `productId`/`ownerId`, `Activity.find().populate('productId').populate('versionId','label author').sort({ activityDate: -1 })`, buckets into per-product `{ product, activities[], counts }` and a `summary`.
  - `getTrendData(months, user, productId)` and `getAnnualReport(year, user, productId, ownerId)` both call the private `groupByMonthAndType` (`$group` keyed by UTC `$year`/`$month`/`$type`) and fill missing month buckets with zeros.

**Auth guards:** mount-level `requireAuth` + `requireActive`; `ownerId` cross-owner scoping only takes effect when `user.role === 'admin'` (non-admins are already limited by `scopeFilter`).

## Data model
- **Activity** (`activities`) — the sole source for all reports. Read fields: `activityDate`, `type` (`feature`/`improvement`/`bug-fix`), `ownerId` (via `scopeFilter`), `productId` (populated), `versionId` (populated `label`/`author`), plus `tags` (used client-side on the Dashboard for released/unreleased totals).
- **Product** (`products`) — populated into report per-product cards; Dashboard also reads product `status`/`category`/last-activity and the stale set (`GET /products/stale`).
- **Version** (`versions`) — surfaced via `useAllVersions`; the Dashboard "Unversioned Entries" card assigns `versionId` onto activities via `updateActivity`.
- No dedicated report collection — reports are derived entirely from activities at query time (no persistence, no pagination on the monthly report).

## Notable behaviors & edge cases
- **Custom range wins:** when both `startDate` and `endDate` are supplied, month/year are ignored (`ReportController`/`ReportService`).
- **UTC vs local month boundaries:** trend/annual bucket via UTC `$group`; the explicit monthly/date-range report uses local-server-time `new Date(...)` boundaries, so its exact month edges depend on server timezone (documented in `ReportService.md`).
- **Orphaned activities** (product deleted, `!act.productId`) are skipped in `getMonthlyReport` to avoid crashing on `._id`.
- **Dashboard non-blocking queries:** issues, stale, and versions are fetched separately so a slow/failed fetch never blocks the render.
- **Inline version-assign:** the "Unversioned Entries" card either offers an "Add version" link (product has none) or a `Select` decorated with `VersionBadge` latest/unreleased that calls `assignVersion`, showing per-row busy state.
- **Percentage remainder trick:** the Activity Distribution bar computes `bugPct = 100 - featurePct - improvePct` so the stacked bar always sums to 100.
- **Reports client-side version filter:** `displayedMonthlyReport` re-filters each product's activities by `matchesVersion` (label-keyed, cross-product union from `useAllVersions().labelInfo`), recomputes counts, and drops emptied products.
- **Exports:** PDF via `html2canvas` + `jsPDF` (forces `forceExpand=true`, 350ms settle, scale-2 rasterization — also the PNG path); PPTX via `pptxgenjs` (summary slide + one per product, ≤12 bullets each); CSV via `escapeCsv` + `htmlToPlainText`; JSON via `JSON.stringify`.
- **Presentation Mode:** content-first wheel navigation with a 650ms inertia cooldown; `toCleanText` double-decodes entities for double-encoded imports; render-time index reset when `periodLabel` changes; best-effort fullscreen; dynamic accent extraction is async per report and falls back to a fixed accent for art-less products.
- **Admin owner scoping:** the Reports user/owner select only appears for admins (`enabled: isAdmin`), matching the server's admin-only `ownerId`.

## Related docs
- Per-file: [Dashboard](../files/client/pages/Dashboard.md), [Reports](../files/client/pages/Reports.md), [StreakCard](../files/client/components/dashboard/StreakCard.md), [DonutChart](../files/client/components/reports/DonutChart.md), [TrendChart](../files/client/components/reports/TrendChart.md), [PresentationMode](../files/client/components/reports/PresentationMode.md), [reports service](../files/client/services/reports.md), [reportRoutes](../files/server/routes/reportRoutes.md), [ReportController](../files/server/controllers/ReportController.md), [ReportService](../files/server/services/ReportService.md)
- Feature: [Streak tracking](./streak-tracking.md) (StreakCard's own feature)
- API: [Server API reference §8 Reports](../api/server-api-endpoints.md), [Client → Endpoint map](../api/client-endpoint-map.md)
