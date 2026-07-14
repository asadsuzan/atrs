# `client/src/services/issues.ts`
**Purpose:** Issue tracker API — authenticated CRUD plus two public (no-auth) endpoints for the hosted issue tracker and public bug-report submission.
**Language / Size:** TS / 3305 bytes

## Exports
Types: `IssueStatus` (`'open'|'in-progress'|'resolved'|'closed'`), `IssueSeverity` (`'low'|'medium'|'high'|'critical'`), `Issue`, `PublicIssueReport`, `PublicIssuesPayload`, `IssueWithProduct`.
Functions: `getIssues`, `getAllIssues`, `getPendingReviewIssues`, `createIssue`, `updateIssue`, `deleteIssue`, `getPublicIssues`, `reportPublicIssue`.

`PublicIssueReport` includes a `website?` honeypot field (bots that fill it are dropped server-side).

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api` for authed calls. Public functions use raw `fetch` (no auth) instead of `api`.

## Functions
- **`getIssues(productId: string): Promise<Issue[]>`** — `GET /api/issues`; query `{ productId }`.
- **`getAllIssues(): Promise<IssueWithProduct[]>`** — `GET /api/issues` (no params; all issues across the owner's products, product populated).
- **`getPendingReviewIssues(): Promise<IssueWithProduct[]>`** — `GET /api/issues/pending-review` (publicly-reported issues awaiting approval).
- **`createIssue(issue: any): Promise<any>`** — `POST /api/issues`; body = issue.
- **`updateIssue({ id, ...issue }: any): Promise<any>`** — `PATCH /api/issues/{id}`; body = remaining fields.
- **`deleteIssue(id: string): Promise<any>`** — `DELETE /api/issues/{id}`.
- **`getPublicIssues(id: string): Promise<PublicIssuesPayload>`** — raw `fetch GET /api/public/issues/{id}` (no auth). On `!res.ok` throws an `Error('Issues not found')` with a `.status` property set to `res.status`. Returns `res.json()`.
- **`reportPublicIssue(id: string, report: PublicIssueReport): Promise<void>`** — raw `fetch POST /api/public/products/{id}/issues` (no auth), `Content-Type: application/json`, body `JSON.stringify(report)`. On `!res.ok` tries to read a JSON `message`, else throws `Error('Could not submit your report. Please try again.')`.

## Error handling
Authed functions: none explicit (axios propagates). Public functions: explicit `res.ok` checks that throw typed/`message`-bearing errors as noted above.

## Relationships
- Authed CRUD consumed by ProductDetails / issues panels and the Review page (`pending-review`). Public functions consumed by the PublicIssues page (route `/issues/:id`).
- Backend targets: `/api/issues/*` (authed) and `/api/public/issues/:id`, `/api/public/products/:id/issues` (public).
