# Changelog Metrics Aggregation (Monthly / Trend / Annual)

**Source:** `server/src/services/ReportService.ts` —
`getMonthlyReport`, `getTrendData`, `getAnnualReport`, private
`groupByMonthAndType`. Consumer: `ReportController`
(`GET /api/reports/{monthly,trend,annual}`). Data: the `Activity` collection.

## Purpose
Turn changelog activities into per-period counts bucketed by type
(`feature` / `improvement` / `bug-fix`), for the Dashboard trend chart and the
Reports page, with timezone-consistent month math.

## Inputs / Outputs
- All methods take `user` (ownership-scoped via `scopeFilter`) and optional
  `productId`; admins may additionally pass `ownerId`.
- Outputs are period-bucketed `{ features, improvements, bugFixes, total }`
  structures (plus a populated activity list for the monthly report).

## Algorithm

### `groupByMonthAndType(start, end, user, productId?, ownerId?)` (the core)
1. `match = scopeFilter(user, { activityDate: {$gte:start, $lte:end} })`, plus
   optional `productId` (ObjectId) and `ownerId` (admin only).
2. Single `$group` keyed by `$year`/`$month` of `$activityDate` **with
   `timezone:'UTC'`** and by `type`, `count:$sum 1`.
3. Collapse rows into a `Map` keyed `"${year}-${month}"` (month **1-based**, to
   match `$month`) with per-type counts.

### `getTrendData(months=6, user, productId?)`
- Compute a UTC range: first day of the month `months-1` back .. last day of the
  current month. One `groupByMonthAndType` call. Iterate `i = months-1 … 0`,
  emitting `{ month (short name, UTC), year, label, features, improvements,
  bugFixes, total }`; missing buckets default to zeros. Oldest-first.

### `getAnnualReport(year, user, productId?, ownerId?)`
- UTC range Jan 1 .. Dec 31; one `groupByMonthAndType`; loop months 1..12
  building `{ month, label (long name, UTC), … , total }` and accumulating a
  `summary`.

### `getMonthlyReport(month, year, user, productId?, startDate?, endDate?, ownerId?)`
- Window: explicit `[startDate, endDate]` (end pushed to 23:59:59.999) if given,
  else `[new Date(year, month-1, 1) … new Date(year, month, 0, 23:59:59.999)]`
  (**local time**, not UTC).
- `Activity.find(match).populate('productId').populate('versionId','label
  author').sort({activityDate:-1})`, grouped into a per-product map (skipping
  orphaned activities whose product was deleted), plus a `summary`.

## Key design point — UTC vs local
`groupByMonthAndType` (trend + annual) buckets in **UTC** and its callers build
range boundaries and lookup keys with `Date.UTC`/`getUTCMonth()`, guaranteeing a
month-boundary activity lands in the bucket the caller reads it from, regardless
of server timezone. `getMonthlyReport` deliberately uses **local-time** month
boundaries via `find` (not the UTC `$group`), so its exact edges depend on
server tz.

## Complexity / performance
- Trend/annual: exactly one aggregation each. Monthly: one `find` (no
  pagination) with product/version population.

## Edge cases & limitations
- Orphaned activities (`!act.productId`) are skipped in `getMonthlyReport`.
- `ownerId` scoping only applies for admins; non-admins are already limited by
  `scopeFilter`.
- `$month` is 1-based; `getUTCMonth()` is 0-based — callers add 1 when forming
  keys.

## Source references
- `ReportService.{getMonthlyReport,getTrendData,getAnnualReport,groupByMonthAndType}`
- `server/src/utils/ownership.ts` (`scopeFilter`).
