# `server/src/controllers/IssueController.ts`
**Purpose:** Issue-tracker handlers: authenticated CRUD + pending-review list, plus two public (no-auth) endpoints for viewing and reporting issues on opted-in products.
**Language / Size:** TypeScript / 4225 bytes
## Exports
Named exports: `createIssue`, `getIssues`, `getPendingReviewIssues`, `getIssueById`, `updateIssue`, `deleteIssue`, `getPublicIssues`, `reportPublicIssue`.
## Imports (Internal / External)
- Internal: `../services/IssueService` (`IssueService`), `../models/Product` (`Product`).
- External: `express`, `mongoose`.
- Module-level singleton: `const issueService = new IssueService()`.
## Handlers / Functions
- **createIssue(req,res,next)** — Reads `req.body` (`createIssueSchema`), `req.user`. Calls `issueService.createIssue`. `201`.
- **getIssues(req,res,next)** — Reads `req.query.productId` (optional; omit for all owner products, product populated), `req.user`. Calls `issueService.getIssues(productId, req.user!)`. `200`.
- **getPendingReviewIssues(req,res,next)** — Reads `req.user`. Calls `issueService.getPendingReview(req.user!)`. `200`.
- **getIssueById(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200`.
- **updateIssue(req,res,next)** — Reads `req.params.id`, `req.body` (`updateIssueSchema`), `req.user`. `404` if null; else `200`.
- **deleteIssue(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200 {message:'Issue deleted successfully'}`.
- **getPublicIssues(req,res,next)** — Public. Reads `req.params.id`. If not a valid ObjectId → `404 'Issues not found'`. Loads `Product.findById(id)`; if missing or `!publicIssuesEnabled` → `404`. Calls `issueService.getPublicIssues(id)`. `200` with `{product:{id,name,slug,description,icon,githubUrl,wpOrgSlug}, issues}`.
- **reportPublicIssue(req,res,next)** — Public write. Reads `req.params.id`, `req.body` (route Zod `publicReportIssueSchema`). Invalid ObjectId → `404`. Honeypot: if `req.body.website` truthy, silently `201 {ok:true}` (drops bot). Else `issueService.reportPublicIssue(id, req.body)` → `201 {ok:true}`.
## Important logic & design patterns
- Probe-resistant 404s: unknown/malformed ids and unpublished products all return the same `404`.
- Honeypot spam trap on the public report form.
- Public endpoints gated by product opt-in flag `publicIssuesEnabled`; created public issues queued for owner review (hidden until approved).
## Relationships
- Authenticated handlers routed by `issueRoutes.ts` (mounted `/api/issues`, behind `requireAuth`+`requireActive`).
- Public handlers routed by `publicRoutes.ts` (mounted `/api/public`, no auth).
- Delegates to `IssueService`; reads `Product` model directly for publish-flag checks.
