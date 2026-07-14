# `server/src/routes/featureRequestRoutes.ts`
**Purpose:** Express router for in-app feature requests for the ATRS platform itself (users submit/track their own; admins triage); mounted at `/api/feature-requests` (app.ts: `app.use('/api/feature-requests', requireAuth, requireActive, featureRequestRoutes)`).
**Language / Size:** TypeScript / 907 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/` | validate | `createFeatureRequestSchema` | `FeatureRequestController.createFeatureRequest` |
| GET | `/` | — | — | `FeatureRequestController.getFeatureRequests` |
| PATCH | `/:id` | validate | `updateFeatureRequestSchema` | `FeatureRequestController.updateFeatureRequest` |
| DELETE | `/:id` | validate | `idParamSchema` | `FeatureRequestController.deleteFeatureRequest` |
## Relationships
- Controller: `../controllers/FeatureRequestController`.
- Schemas: `featureRequest.schema` (`createFeatureRequestSchema`, `updateFeatureRequestSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- No admin gate at the router level — admin-only triage fields (status + response note) are enforced inside the controller/service.
