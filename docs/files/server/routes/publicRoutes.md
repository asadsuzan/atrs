# `server/src/routes/publicRoutes.ts`
**Purpose:** Express router for unauthenticated, read-only public endpoints (public product directory, hosted changelog/issues pages) plus the one public "report an issue" write; mounted at `/api/public` (app.ts: `app.use('/api/public', publicRoutes)` — **no auth**; owners opt products in via `publicChangelogEnabled`).
**Language / Size:** TypeScript / 1352 bytes
## Middleware applied (router-level)
- None global. A dedicated `reportLimiter` (`express-rate-limit`) is defined in-file for the single public write endpoint: 1-hour window, max 10/IP, on top of the global `/api` limiter.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/products` | — | — | `ProductController.getPublicProducts` |
| GET | `/changelog/:id` | — | — | `ReleaseController.getPublicChangelog` |
| GET | `/issues/:id` | — | — | `IssueController.getPublicIssues` |
| POST | `/products/:id/issues` | reportLimiter, validate | `publicReportIssueSchema` | `IssueController.reportPublicIssue` |
## Relationships
- Controllers: `../controllers/ProductController` (`getPublicProducts`), `../controllers/ReleaseController` (`getPublicChangelog`), `../controllers/IssueController` (`getPublicIssues`, `reportPublicIssue`).
- Schema: `issue.schema` (`publicReportIssueSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Entire router is publicly accessible (mounted with no `requireAuth`). Backs the `/explore` directory and hosted `/changelog/:id` and `/issues/:id` pages.
- Only write endpoint is `POST /products/:id/issues`, rate-limited (`reportLimiter`) to blunt spam and Zod-validated.
