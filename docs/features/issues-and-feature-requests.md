# Issues & Feature Requests

**Summary:** Two distinct feedback systems: a per-product **bug/issue tracker** (internal CRUD plus an unauthenticated public reporting flow that queues submissions into an owner review queue) and platform-level **feature requests** for ATRS itself, which users submit and admins triage with a status + response note.

These share this doc because they are the app's two "feedback" surfaces, but they are **separate collections, routers, and lifecycles** — keep them mentally separate.

---

## User-facing entry points

**Issues (per-product bug tracker):**
- **Product Details → Issues panel** — the authenticated `IssueManager` component (embedded in the product page), the full tracker: stats, filterable/paginated table, add/edit dialog, approve/publish actions.
- **Quick report from anywhere** — `QuickIssueDialog` (e.g. dashboard) creates an internal issue with minimal fields.
- **Review queue** — the `/review` page consumes `getPendingReviewIssues()` for publicly-submitted issues awaiting approval (see the import-review-queue memory; `needsReview` is the shared flag).
- **Public hosted issues page** — route `/issues/:id` (`PublicIssues`), no auth, outside the app shell. Reached from `Explore`/`/explore` product cards when `publicIssuesEnabled`. Anonymous visitors browse known issues and submit new ones via `ReportIssueDialog`.

**Feature requests (platform):**
- **`/feature-requests`** page (`FeatureRequests.tsx`) — users submit/withdraw their own; admins triage all.

## Client pieces

**Issues:**
- Pages: `client/src/pages/PublicIssues.tsx` (public `/issues/:id`).
- Components: `components/issues/IssueManager.tsx` (authed full tracker + publish toggle + approve), `components/issues/QuickIssueDialog.tsx` (lightweight internal create), `components/issues/ReportIssueDialog.tsx` (public anonymous report with honeypot).
- Service: `client/src/services/issues.ts` — authed CRUD (`getIssues`, `getAllIssues`, `getPendingReviewIssues`, `createIssue`, `updateIssue`, `deleteIssue`) via axios `api`; public functions (`getPublicIssues`, `reportPublicIssue`) via raw `fetch` (no auth).
- React Query keys: `['issues', productId]` (per-product), `['allIssues']` (global, dashboard), `['public-issues', id]` (public page, `retry:false`), `['product', productId]` (name + `publicIssuesEnabled`), `['versions', productId]` (affected-version select). `QuickIssueDialog` invalidates `['issues', productId]` + `['allIssues']`; the publish toggle invalidates `['product', productId]`.
- Contexts: `ConfirmContext` (delete confirmation), sound via `@/lib/sound`. AI assist: `SuggestTitleButton` / `GenerateDescriptionButton` (see [AI assist](ai-assist.md)).

**Feature requests:**
- Page: `client/src/pages/FeatureRequests.tsx`.
- Service: `client/src/services/featureRequests.ts` (`getFeatureRequests`, `createFeatureRequest`, `updateFeatureRequest`, `deleteFeatureRequest`) — all authed axios.
- React Query key: `['feature-requests']`. One `updateMutation` is reused for both status changes and admin-note saves.
- Contexts: `AuthContext` (`user`, `isAdmin` — gates status select, response, requester name, delete rights), `ConfirmContext`.

## Server pieces

**Issues — authed:** `/api/issues` (mount guard `requireAuth` + `requireActive`) → `issueRoutes.ts` → `IssueController` → `IssueService` → `Issue` model.
- `POST /` (`createIssueSchema`), `GET /` (`?productId` optional), `GET /pending-review` (declared before `/:id`), `GET /:id`, `PATCH /:id` (`updateIssueSchema`, includes `needsReview`), `DELETE /:id`.
- Ownership enforced in `IssueService` via `scopeFilter`/`assertOwner`; non-owners read as `404`. On create, `ownerId` is inherited from the product (never from the client).

**Issues — public:** `/api/public` (mounted **no auth**) → `publicRoutes.ts` → `IssueController` public handlers → `IssueService`.
- `GET /public/issues/:id` (`getPublicIssues`) — malformed id / missing product / `!publicIssuesEnabled` all return the same `404 'Issues not found'` (probe-resistant). Returns `{ product:{id,name,slug,description,icon,githubUrl,wpOrgSlug}, issues }`.
- `POST /public/products/:id/issues` (`reportPublicIssue`) — guarded by `reportLimiter` (10/hr/IP, on top of global `apiLimiter`) + `publicReportIssueSchema`. Honeypot `website`: if truthy, silently returns `201 {ok:true}` (bot dropped, nothing written). Otherwise `IssueService.reportPublicIssue` sanitizes and creates the issue.

**Feature requests:** `/api/feature-requests` (mount guard `requireAuth` + `requireActive`, **no admin gate at router level**) → `featureRequestRoutes.ts` → `FeatureRequestController` → `FeatureRequestService` → `FeatureRequest` model.
- `POST /` (`createFeatureRequestSchema`), `GET /` (own for users, all for admins), `PATCH /:id` (`updateFeatureRequestSchema`), `DELETE /:id`.
- **Admin-only fields (`status`, `adminNote`) are enforced in the service, not the router** — non-admin attempts to set them return 403. Requesters may edit their own title/description only while `status === 'pending'` (else 400) and may withdraw (delete) only pending requests.

## Data model

**`Issue`** (collection `issues`, `server/src/models/Issue.ts`): `ownerId`→User, `productId`→Product, `title`, `description`, `status` (open/in-progress/resolved/closed, default open), `severity` (low/medium/high/critical, default medium), `reporter`, `reporterEmail` (public contact, never shown publicly), `source` (internal/public, default internal), `needsReview` (bool — public submissions flagged, hidden until owner clears), `versionLabel`, `mediaUrls[]`, `foundAt`, `resolvedAt`, `assigneeIds[]`→User, `dueDate`, `estimatedHours`, `actualHours`, timestamps. Indexes: `productId`, `ownerId`, `assigneeIds`.

**`FeatureRequest`** (collection `featurerequests`, `server/src/models/FeatureRequest.ts`): `requesterId`→User, `title`, `description`, `status` (pending/planned/in-progress/done/declined, default pending), `adminNote` (admin response visible to requester), timestamps. Field-level indexes on `requesterId`, `status`.

**Product flags touched:** `publicIssuesEnabled` (gates the public issues page + reporting; toggled by `IssueManager`'s publish switch via `updateProduct`), plus `publicChangelogEnabled`/`listedInDirectory` for sibling public surfaces.

## Notable behaviors & edge cases

- **Public submission moderation:** every public report is written with `source:'public'`, `needsReview:true`, `status:'open'`, `severity:'medium'`, `foundAt:now`. `getPublicIssues` filters `needsReview: { $ne: true }`, so unmoderated reports never appear publicly. Owners clear them from the review queue (`getPendingReview` = `source:'public', needsReview:true`), and `IssueManager`'s approve action calls `updateIssue({ id, needsReview:false })`.
- **Input sanitization on public reports:** `IssueService.reportPublicIssue` escapes/caps fields server-side — `title` escapeHtml+trim+slice(0,200), `description` via `plainTextToSafeHtml`, `versionLabel` ≤60, `reporter` ≤120, `reporterEmail` ≤200. Zod (`publicReportIssueSchema`) also enforces title trim 3–200, description ≤5000, email format-or-empty, and the honeypot `website` must be empty (`max0`).
- **Probe resistance:** both public and authed handlers return `404` (not `403`) for missing/unauthorized/unpublished resources so ids can't be probed for existence.
- **`resolvedAt` lifecycle:** stamped when an issue enters a resolved/closed status without an explicit value; cleared when it moves back out; left untouched if resolved→resolved.
- **Notifications:** a public issue report fires `notificationManager.sendToUser(ownerId, 'issue-reported', …)` (live only, no persisted record) — see [Notifications](notifications.md). Feature requests notify **all admins** on create and notify the **requester** on admin status change / note (persisted `Notification` + live SSE, best-effort).
- **Audit logging:** all issue and feature-request mutations are audit-logged (`ISSUE`, `FEATURE_REQUEST` entity types). Anonymous public reports log with a system/no actor.
- **Client-side scaling:** `IssueManager` filters and paginates entirely client-side (loads the full list); no server pagination on `getIssues`/`getPublicIssues`.
- **Version select preservation:** the edit dialog keeps a previously-set version label selectable even if that version was deleted, to avoid silent data loss.
- **Quick vs full vs public:** `QuickIssueDialog` creates internal issues (no attachments/versions, `source` unset); `IssueManager` is the full editor; `ReportIssueDialog` is the anonymous public form feeding the review queue.

## Related docs

- Client: [FeatureRequests](../files/client/pages/FeatureRequests.md), [PublicIssues](../files/client/pages/PublicIssues.md), [IssueManager](../files/client/components/issues/IssueManager.md), [QuickIssueDialog](../files/client/components/issues/QuickIssueDialog.md), [ReportIssueDialog](../files/client/components/issues/ReportIssueDialog.md), [issues service](../files/client/services/issues.md), [featureRequests service](../files/client/services/featureRequests.md), [public service](../files/client/services/public.md)
- Server routes: [issueRoutes](../files/server/routes/issueRoutes.md), [featureRequestRoutes](../files/server/routes/featureRequestRoutes.md), [publicRoutes](../files/server/routes/publicRoutes.md)
- Server controllers: [IssueController](../files/server/controllers/IssueController.md), [FeatureRequestController](../files/server/controllers/FeatureRequestController.md)
- Server services: [IssueService](../files/server/services/IssueService.md), [FeatureRequestService](../files/server/services/FeatureRequestService.md)
- Models & schemas: [Issue](../files/server/models/Issue.md), [FeatureRequest](../files/server/models/FeatureRequest.md), [issue.schema](../files/server/schemas/issue.schema.md), [featureRequest.schema](../files/server/schemas/featureRequest.schema.md)
- API: [server-api-endpoints](../api/server-api-endpoints.md) §6, §7, §17 · [client-endpoint-map](../api/client-endpoint-map.md)
- Related features: [Notifications](notifications.md), [AI assist](ai-assist.md), [Releases](releases.md) (sibling public pages)
