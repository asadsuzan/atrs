# Changelog Management

**Summary:** Changelog entries (internally called *Activities*) are the per-product feature / improvement / bug-fix records that make up a product's changelog; this feature covers their full CRUD, filtering, reordering, tag-based release status, bulk operations (including an SSE-streamed bulk delete), and the low-confidence `needsReview` flag.

## User-facing entry points
- Route `/activities` — the **"Changelogs"** page (`client/src/pages/Activities.tsx`). Title renders as "Changelogs" even though the underlying model/service is "Activity".
- Deep-link query params consumed by the page: `?productId=<id>`, `?versioned=none|has|all`, `?tag=released|unreleased` (used by sidebar / cross-page links to pre-apply filters).
- Activity titles link out to `Products/{productId}#activity-{_id}` (per-product detail view).
- The create/edit surface is the `ActivityForm` dialog (`client/src/components/activities/ActivityForm.tsx`), opened from the page's "Add Changelog Entry" button and per-row edit action.
- Changelog entries are also drafted automatically by two other features: the AI Changelog Generator (see [changelog-generator.md](changelog-generator.md)) and WP.org readme import — both write `Activity` docs, often flagged `needsReview`.

## Client pieces
- **Page:** `client/src/pages/Activities.tsx` — table + grid views, filter bar, pagination, bulk-action bar. Filter state (product, type, tier, tag, versioned, search, date range, limit, sort, view) is persisted per-session via `useLocalStorage` (`atrs_activities_*` keys). Search is debounced 300 ms (`useDebouncedValue`).
- **Form:** `client/src/components/activities/ActivityForm.tsx` — react-hook-form + zod (`formSchema`), nested `items[]` via `useFieldArray`, media uploads, version linking (options tagged with `VersionBadge`), tags, AI title/description assist. Reads versions through `useProductVersions` (see [version-management.md](version-management.md)); reads issues for the bug-fix "Resolved Issues" checklist.
- **Service:** `client/src/services/activities.ts` — `getActivities`, `getActivityById`, `createActivity`, `updateActivity`, `deleteActivity`, `bulkUpdateActivities(ids, update)`, `bulkDeleteActivities(ids)`, `reorderActivity(id, displayOrder)`. All via the shared axios `api` (`/api` baseURL + JWT interceptor). `bulkUpdate` deliberately uses **POST** `/bulk-update` (not PATCH) so it isn't captured by the `/:id` route; `bulkDelete` sends ids in the axios request body.
- **React Query keys:** `['activities', queryParams]` (list), `['products']`, `['users']` (owner filter, admin only). Mutations (create/update/delete/bulkUpdate) invalidate `['activities']` on success and play sound + toast.
- **Contexts consumed:** `AuthContext` (isAdmin → owner filter + users query), `AddProductContext` (empty-state "add product first" flow), `ConfirmContext` (delete confirmations), `JobStreamContext` (`runJob` drives the streamed bulk delete).
- **ATRS's own release notes are separate:** `client/src/data/changelog.ts` (`RELEASES`, `APP_VERSION`) is a hand-maintained static changelog for the ATRS app itself, rendered by the `/changelog` page — it is **not** part of per-product changelog management.

## Server pieces
Router `server/src/routes/activityRoutes.ts` mounted at `/api/activities` behind `requireAuth` + `requireActive` (from `app.ts`). Bulk/literal routes are declared before `/:id`.

Routes → `ActivityController` (`server/src/controllers/ActivityController.ts`) → `ActivityService` (`server/src/services/ActivityService.ts`) → `ActivityRepository` (`server/src/repositories/ActivityRepository.ts`) → `Activity` model.

| Method + Path | Validation | Controller | Notes |
|---|---|---|---|
| `POST /` | `createActivitySchema` | `createActivity` | 201 |
| `GET /` | — | `getActivities` | owner-scoped list + filters |
| `GET /:id` | `idParamSchema` | `getActivityById` | 404 if not owned/found |
| `PATCH /:id` | `updateActivitySchema` (+`needsReview`) | `updateActivity` | never re-parents `productId`/`ownerId` |
| `PATCH /:id/reorder` | `idParamSchema` (+ body `displayOrder`) | `reorderActivity` | 400 if `displayOrder` missing |
| `DELETE /:id` | `idParamSchema` | `deleteActivity` | deletes owned media too |
| `POST /bulk-update` | `bulkUpdateActivitiesSchema` (`.strict()`) | `bulkUpdateActivities` | `{message, count}` |
| `DELETE /bulk-delete` | `bulkDeleteActivitiesSchema` | `bulkDeleteActivities` | `{message, count}` |
| `POST /bulk-delete-stream` | — (guards internally) | `bulkDeleteActivitiesStream` | **SSE** via `runStreamJob`, cancellable |

**Auth guards:** mount-level `requireAuth` + `requireActive`; there is no admin-only route here. Ownership is enforced in `ActivityService` via `scopeFilter(user)` / `assertOwner` — resources belonging to other owners read as 404. Admins may pass `ownerId` to `getActivities` for cross-owner listing.

**Key service behaviors:**
- **Ownership inheritance:** `createActivity` loads the parent `Product`, `assertOwner`s it, and sets `ownerId` from `product.ownerId` (never the request body).
- **Re-parenting blocked:** `updateActivity` strips `ownerId` and `productId` from the payload — downstream release assembly trusts `productId`.
- **Auto-resolve linked issues:** creating/updating a `bug-fix` entry with `relatedIssueIds` runs `resolveLinkedIssues`, `Issue.updateMany(... status:{$in:['open','in-progress']} → 'resolved')`, owner-scoped so only still-open, owned issues change.
- **Media lifecycle:** update deletes orphaned media (URLs in old-not-in-new across `mediaUrl`/`mediaUrls`/`items[]`); delete and bulk-delete delete all associated media (`deleteMediaFiles`) — this is why bulk delete is streamed, not a plain mutation.
- **Bulk update assembly:** `bulkUpdateActivities` never forwards raw client keys; `buildActivityBulkUpdate` (`server/src/utils/activityBulkUpdate.ts`) assembles a whitelisted `$set`/`$addToSet`/`$pull` doc server-side. "Mark Released" / "Mark Unreleased" from the page send `{addTags:['released'],removeTags:['unreleased']}` and its inverse.
- **Repository defense-in-depth:** `ActivityRepository.bulkUpdate` re-validates operators against `ALLOWED_BULK_OPERATORS` (`$set`,`$addToSet`,`$pull`) and throws on anything else; `findAll` populates `productId`, `versionId`, `relatedIssueIds` and supports `limit === -1` (return all).

## Data model
`Activity` model (`server/src/models/Activity.ts`), collection `activities`. Key fields:
- Identity/scoping: `ownerId`→User (inherited), `productId`→Product, `activityDate` (Date, required, indexed).
- Classification: `type` (feature/improvement/bug-fix), `tier` (free/pro), `priority` (low/medium/high/critical), `tags[]` (e.g. `released`/`unreleased`).
- Content: `title`, `shortDescription`, `referenceUrl`, `mediaType`/`mediaUrl`/`mediaUrls[]`, nested `items[]` (`ActivityItemSchema`, `_id:false`), `displayOrder`.
- Links: `versionId`→Version, `relatedIssueIds[]`→Issue, `assigneeIds[]`→User.
- Review/import: `needsReview` (bool, indexed), `reviewReason` (e.g. `uncertain-type`, `ai-generated`), `importConfidence` (high/medium/low), `importSourceKey` (`version|normalized-title`, or `ai-gen|...`), unique compound index `{productId, importSourceKey}` (partial, dedups imports). Legacy: `autoTracked`, `filePath`, `estimatedHours`, `actualHours`.
- Indexes include `{ownerId, activityDate, type}` for report aggregations.

## Notable behaviors & edge cases
- **`needsReview` flag** marks low-certainty auto-derived entries (WP.org import at medium/low classification confidence, AI-generated drafts). These feed the `/review` queue (see project memory "Import review queue"). Both `updateActivitySchema` and the bulk-update `update` sub-object accept `needsReview`, so a reviewer can clear the flag individually or in bulk.
- **Tags are the release-status mechanism at the changelog level** (`released`/`unreleased` tags via bulk add/remove); this is distinct from a `Version`'s `status` field. The "versioned" filter (`none`/`has`) filters on presence of `versionId`, not tags.
- **Bulk selection auto-clears** whenever page/filters change, so bulk actions never hit rows no longer visible (page effect #1).
- **Tier filter only applies to `type==='feature'`** and is only added to the query in that case.
- **SSE bulk delete** (`/bulk-delete-stream`) loops ids, checks `isCancelled()` per item, emits per-item progress, returns `{deleted, errors, cancelled, total}`; cancellable via `POST /api/jobs/cancel` or client disconnect; already-deleted rows are **not** rolled back.
- **`.strict()` Zod on bulk endpoints** rejects any unlisted key (including raw Mongo operators) before the request reaches the service — layered with the repository operator allow-list.
- Editing the same activity object in place won't re-seed the form (the reset effect only depends on `initialData?._id`).

## Related docs
- Client: [../files/client/pages/Activities.md](../files/client/pages/Activities.md), [../files/client/components/activities/ActivityForm.md](../files/client/components/activities/ActivityForm.md), [../files/client/services/activities.md](../files/client/services/activities.md), [../files/client/data/changelog.md](../files/client/data/changelog.md)
- Server: [../files/server/routes/activityRoutes.md](../files/server/routes/activityRoutes.md), [../files/server/controllers/ActivityController.md](../files/server/controllers/ActivityController.md), [../files/server/services/ActivityService.md](../files/server/services/ActivityService.md), [../files/server/repositories/ActivityRepository.md](../files/server/repositories/ActivityRepository.md), [../files/server/models/Activity.md](../files/server/models/Activity.md), [../files/server/schemas/activity.schema.md](../files/server/schemas/activity.schema.md), [../files/server/schemas/activityBulk.schema.md](../files/server/schemas/activityBulk.schema.md), [../files/server/utils/activityBulkUpdate.md](../files/server/utils/activityBulkUpdate.md)
- API: [../api/server-api-endpoints.md](../api/server-api-endpoints.md) (§4), [../api/client-endpoint-map.md](../api/client-endpoint-map.md)
- Related features: [version-management.md](version-management.md), [changelog-generator.md](changelog-generator.md)
