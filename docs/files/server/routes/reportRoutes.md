# `server/src/routes/reportRoutes.ts`
**Purpose:** Express router for reporting; mounted at `/api/reports` (app.ts: `app.use('/api/reports', requireAuth, requireActive, reportRoutes)`).
**Language / Size:** TypeScript / 313 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/monthly` | (mount: requireAuth, requireActive) | — | `ReportController.getMonthlyReport` |
| GET | `/trend` | (mount: requireAuth, requireActive) | — | `ReportController.getTrend` |
| GET | `/annual` | (mount: requireAuth, requireActive) | — | `ReportController.getAnnual` |
## Relationships
- Controller: `../controllers/ReportController`.
- No Zod schemas; query validation is done inside the controller.
## Notes
- Read-only report surface. All params are query-string based (`month`, `year`, `startDate`, `endDate`, `productId`, `ownerId`, `months`).
