# `server/src/routes/activityRoutes.ts`
**Purpose:** Express router for changelog Activities (CRUD + bulk ops + SSE bulk delete); mounted at `/api/activities` (app.ts: `app.use('/api/activities', requireAuth, requireActive, activityRoutes)`).
**Language / Size:** TypeScript / 1265 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/bulk-update` | validate | `bulkUpdateActivitiesSchema` | `ActivityController.bulkUpdateActivities` |
| DELETE | `/bulk-delete` | validate | `bulkDeleteActivitiesSchema` | `ActivityController.bulkDeleteActivities` |
| POST | `/bulk-delete-stream` | — | — | `ActivityController.bulkDeleteActivitiesStream` |
| POST | `/` | validate | `createActivitySchema` | `ActivityController.createActivity` |
| GET | `/` | — | — | `ActivityController.getActivities` |
| GET | `/:id` | validate | `idParamSchema` | `ActivityController.getActivityById` |
| PATCH | `/:id` | validate | `updateActivitySchema` | `ActivityController.updateActivity` |
| PATCH | `/:id/reorder` | validate | `idParamSchema` | `ActivityController.reorderActivity` |
| DELETE | `/:id` | validate | `idParamSchema` | `ActivityController.deleteActivity` |
## Relationships
- Controller: `../controllers/ActivityController`.
- Schemas: `activity.schema` (`createActivitySchema`, `updateActivitySchema`), `activityBulk.schema` (`bulkUpdateActivitiesSchema`, `bulkDeleteActivitiesSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Bulk / literal routes (`/bulk-update`, `/bulk-delete`, `/bulk-delete-stream`) are declared before the `/:id` routes so they aren't captured as ids.
- `/bulk-delete-stream` is an SSE (streaming) endpoint with no `validate` — it parses/guards its body internally.
