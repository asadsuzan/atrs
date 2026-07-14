# `server/src/controllers/ActivityController.ts`
**Purpose:** HTTP handlers for changelog Activity entries: CRUD, bulk update/delete (incl. an SSE-streamed bulk delete), and reorder.
**Language / Size:** TypeScript / 5106 bytes
## Exports
Named function exports: `createActivity`, `getActivities`, `getActivityById`, `updateActivity`, `deleteActivity`, `bulkUpdateActivities`, `bulkDeleteActivities`, `bulkDeleteActivitiesStream`, `reorderActivity`.
## Imports (Internal / External)
- Internal: `../services/ActivityService` (`ActivityService`), `../utils/sseStream` (`runStreamJob`).
- External: `express` (`Request`, `Response`, `NextFunction`).
- Module-level singleton: `const activityService = new ActivityService()`.
## Handlers / Functions
- **createActivity(req,res,next)** — Create an activity. Reads `req.body`, `req.user`. No in-controller Zod (validated at route via `createActivitySchema`). Calls `activityService.createActivity(req.body, req.user!)`. Responds `201` with activity; errors via `next`.
- **getActivities(req,res,next)** — List activities. Reads `req.query`, `req.user`. Calls `activityService.getActivities(req.query, req.user!)`. `200` with array.
- **getActivityById(req,res,next)** — Reads `req.params.id`, `req.user`. Calls `activityService.getActivityById`. `404` `{message:'Activity not found'}` if null; else `200`.
- **updateActivity(req,res,next)** — Reads `req.params.id`, `req.body`, `req.user`. Calls `activityService.updateActivity`. `404` if null; else `200`.
- **deleteActivity(req,res,next)** — Reads `req.params.id`, `req.user`. Calls `activityService.deleteActivity`. `404` if null; else `200` `{message:'Activity deleted successfully'}`.
- **bulkUpdateActivities(req,res,next)** — Reads `req.body.ids`, `req.body.update`. In-controller guard: `ids` must be a non-empty array → else `400 {message:'ids array is required'}`. Calls `activityService.bulkUpdateActivities(ids, update, req.user!)`. `200 {message:'Updated N activities', count}`.
- **bulkDeleteActivities(req,res,next)** — Reads `req.body.ids`. Same non-empty-array guard. Calls `activityService.bulkDeleteActivities(ids, req.user!)`. `200 {message:'Deleted N activities', count}`.
- **bulkDeleteActivitiesStream(req,res)** — SSE-streamed bulk delete. Reads `req.body.ids`; guard `400 {message:'ids must be a non-empty array'}` before streaming. Uses `runStreamJob`; loops ids, checks `isCancelled()`, calls `activityService.deleteActivity(id, req.user!)` per id, `emit`s per-item `info/success/warn/error` events. Returns summary `{deleted, errors, cancelled, total}`. No `next` (SSE owns the response).
- **reorderActivity(req,res,next)** — Reads `req.params.id`, `req.body.displayOrder`. Guard: `displayOrder` required (undefined/null → `400`). Calls `activityService.reorderActivity(id, displayOrder, req.user!)`. `404` if null; else `200`.
## Important logic & design patterns
- Standard try/catch → `next(error)` for JSON handlers; SSE handler manages its own response lifecycle via `runStreamJob`.
- Inline manual validation for bulk/reorder body shape (not Zod).
- All service calls pass `req.user!` (owner scoping enforced in the service layer).
## Relationships
- Routed by `activityRoutes.ts` (mounted `/api/activities`, behind `requireAuth`+`requireActive`).
- Delegates business logic to `ActivityService`; streaming via `runStreamJob`.
