# `server/src/routes/issueRoutes.ts`
**Purpose:** Express router for product Issues (CRUD + pending-review queue); mounted at `/api/issues` (app.ts: `app.use('/api/issues', requireAuth, requireActive, issueRoutes)`).
**Language / Size:** TypeScript / 850 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/` | validate | `createIssueSchema` | `IssueController.createIssue` |
| GET | `/` | — | — | `IssueController.getIssues` |
| GET | `/pending-review` | — | — | `IssueController.getPendingReviewIssues` |
| GET | `/:id` | validate | `idParamSchema` | `IssueController.getIssueById` |
| PATCH | `/:id` | validate | `updateIssueSchema` | `IssueController.updateIssue` |
| DELETE | `/:id` | validate | `idParamSchema` | `IssueController.deleteIssue` |
## Relationships
- Controller: `../controllers/IssueController`.
- Schemas: `issue.schema` (`createIssueSchema`, `updateIssueSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Literal route `/pending-review` is declared before `/:id` so it isn't captured as an id (explicit in-file comment).
- Public issue-facing endpoints live in `publicRoutes.ts` (`getPublicIssues`, `reportPublicIssue`), not here.
