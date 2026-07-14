# `client/src/services/reports.ts`
**Purpose:** Reporting API — monthly report, trend data, annual report.
**Language / Size:** TS / 657 bytes

## Exports (functions)
`getMonthlyReport`, `getTrendData`, `getAnnualReport`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getMonthlyReport(params: { month?, year?, productId?, startDate?, endDate?, ownerId? }): Promise<any>`** — `GET /api/reports/monthly`; query = params.
- **`getTrendData(params: { months?, productId? }): Promise<any>`** — `GET /api/reports/trend`; query = params.
- **`getAnnualReport(params: { year?, productId?, ownerId? }): Promise<any>`** — `GET /api/reports/annual`; query = params.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the Reports page (route `/reports`).
- Backend target: `/api/reports/*`.
