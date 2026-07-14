# `server/src/services/ReportService.ts`
**Purpose:** Aggregates changelog activities into monthly, trend (rolling N months), and annual reports, bucketing counts by activity type (feature / improvement / bug-fix) with UTC-consistent month math.
**Language / Size:** TypeScript / 6787 bytes

## Exports
- `class ReportService` — the service (consumer: ReportController).

## Imports (Internal / External)
Internal:
- `../models/Activity` (Activity)
- `../utils/ownership` (scopeFilter)
- `../types/auth` (AuthUser type)

External: `mongoose` (Types.ObjectId), Mongoose statics (find, aggregate), Date/Intl (toLocaleString with timeZone: 'UTC').

## Functions / Methods
- **getMonthlyReport(month, year, user, productId?, startDate?, endDate?, ownerId?): Promise<{ summary, products }>** — computes a date window: if `startDate`&`endDate` given, uses them (end pushed to 23:59:59.999 local); else `[year, month-1, 1]` .. last day of month (local `new Date(year, month, 0, ...)`). Builds `matchStage = scopeFilter(user, { activityDate: {$gte,$lte} })`; optional `productId` (ObjectId); admins may add `ownerId` (ObjectId). `Activity.find(matchStage).populate('productId').populate('versionId', 'label author').sort({ activityDate: -1 })`. Iterates activities into a `productsMap` (per-product `{ product, activities[], counts }`), skipping activities whose product was removed (`!act.productId`). Aggregates a `summary` (products, features, improvements, bugFixes, totalActivities). Returns `{ summary, products: Array.from(map.values()) }`. DB read only.
- **groupByMonthAndType(start, end, user, productId?, ownerId?): Promise<Map<string, {features,improvements,bugFixes}>>** (private) — single `$group` aggregation keyed by UTC year/month/type. Match = scopeFilter + optional productId/ownerId (admin only for ownerId). Uses `$year`/`$month` with `timezone: 'UTC'`. Collapses rows into a Map keyed `"${year}-${month}"` (month 1-based) with per-type counts. Foundation for trend + annual reports.
- **getTrendData(months = 6, user, productId?): Promise<Array>** — rolling last N months. Computes `rangeStart`/`rangeEnd` in UTC (first day of the month N-1 back .. last day of current month). One `groupByMonthAndType` call, then iterates `i = months-1 .. 0` building per-month entries `{ month (short name, UTC), year, label, features, improvements, bugFixes, total }`; missing buckets default to zeros. Oldest-first output.
- **getAnnualReport(year, user, productId?, ownerId?): Promise<{ year, summary, months }>** — UTC range Jan 1 .. Dec 31 of `year`; one `groupByMonthAndType` call; loops months 1..12 building `{ month, label (long name, UTC), features, improvements, bugFixes, total }` and accumulating totals. Returns `{ year, summary: {features,improvements,bugFixes,total}, months }`.

## Data structures / Types / Constants
- Type bucket: `{ features, improvements, bugFixes }` mapped from Activity `type` values `'feature' | 'improvement' | 'bug-fix'`.
- groupByMonthAndType Map key: `"${year}-${month}"` (month 1-based to match `$month`).
- getMonthlyReport per-product entry: `{ product, activities: [], counts: { features, improvements, bugFixes } }`.

## Important algorithms
### UTC-consistent month bucketing
`groupByMonthAndType` buckets `$activityDate` by `$year`/`$month` with `timezone: 'UTC'`, and both trend and annual callers build their range boundaries and lookup keys with `Date.UTC(...)` / `getUTCMonth()`. This guarantees a month-boundary activity lands in the same bucket the caller looks it up under, regardless of the server's local timezone. `$month` is 1-based while `getUTCMonth()` is 0-based, so callers add 1 when forming keys.

Note: `getMonthlyReport` (the explicit month/date-range report) uses local-time `new Date(year, month-1, 1)` boundaries rather than UTC — it filters with `find` on `activityDate` directly rather than through the UTC `$group`.

## Relationships
- Called by: ReportController (monthly, trend, annual endpoints).
- Models: Activity (only) — reports are derived entirely from changelog activities.
- Utils: ownership (scopeFilter enforces per-user data isolation; admins may additionally scope by ownerId).

## Edge cases & known limitations
- Orphaned activities (product deleted, `!act.productId`) are skipped in getMonthlyReport so they don't crash on `._id`.
- `ownerId` scoping only takes effect for `user.role === 'admin'`; non-admins are already limited by scopeFilter.
- getMonthlyReport uses local-server-time month boundaries (unlike the UTC path used by trend/annual), so its exact month edges depend on server timezone.
- No pagination on getMonthlyReport — returns all matching activities with populated product/version.
