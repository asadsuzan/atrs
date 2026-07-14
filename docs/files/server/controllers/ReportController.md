# `server/src/controllers/ReportController.ts`
**Purpose:** Read-only reporting endpoints — monthly report (month/year or custom date range), rolling trend series, and annual report — all owner/product-scoped via `req.user`.
**Language / Size:** TypeScript / 2758 bytes
## Exports
Named exports: `getMonthlyReport`, `getTrend`, `getAnnual`.
## Imports (Internal / External)
- Internal: `../services/ReportService` (`ReportService`).
- External: `express` (`Request`, `Response`, `NextFunction`).
- Module-level singleton: `reportService = new ReportService()`.
## Handlers / Functions
- **getMonthlyReport(req,res,next)** — Reads `req.query`: `month`, `year`, `productId`, `startDate`, `endDate`, `ownerId`. Two modes:
  - If both `startDate` and `endDate` present: calls `reportService.getMonthlyReport(0, 0, req.user!, productId, startDate, endDate, ownerId)` and returns `200`.
  - Otherwise requires `month` and `year` -> `400` if missing. Parses to ints; validates `month` in [1,12] (`400` otherwise) and `year` in [2000,2100] (`400` otherwise). Calls `reportService.getMonthlyReport(monthNum, yearNum, req.user!, productId, undefined, undefined, ownerId)`. `200`.
- **getTrend(req,res,next)** — Reads `req.query.months` (parsed int) and `req.query.productId`. Clamps `months` to [1,60], defaulting to 6 when not an integer. `reportService.getTrendData(months, req.user!, productId)`. `200`.
- **getAnnual(req,res,next)** — Reads `req.query.year` (parsed int; valid range [2000,2100], else defaults to current year), `req.query.productId`, `req.query.ownerId`. `reportService.getAnnualReport(year, req.user!, productId, ownerId)`. `200`.
## Important logic & design patterns
- Input hardening done in the controller (not via a Zod schema): month/year bounds checks, trend `months` clamp to a sane window ([1,60]) so a caller can't request thousands of buckets, and annual `year` fallback to the current year.
- `getMonthlyReport` overloads a single service method for both month/year and custom-date-range modes by passing `0, 0` for month/year and the date strings in the trailing args.
- All handlers pass `req.user!` for owner scoping and forward errors to `next(error)`.
## Relationships
- Routed by `reportRoutes.ts` (mounted `/api/reports`, behind `requireAuth` + `requireActive`).
- Delegates all data assembly to `ReportService`.
## Edge cases
- Custom date range takes precedence over month/year when both `startDate` and `endDate` are supplied.
- Missing/invalid `month`/`year` -> `400`; invalid `months`/`year` for trend/annual silently fall back to defaults rather than erroring.
- `ownerId` is an optional cross-owner scoping param (admin use); passed straight through to the service.
