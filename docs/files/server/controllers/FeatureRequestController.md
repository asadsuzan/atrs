# `server/src/controllers/FeatureRequestController.ts`
**Purpose:** In-app feature requests for the ATRS platform: create, list, update (admin triage), delete.
**Language / Size:** TypeScript / 1520 bytes
## Exports
Named exports: `createFeatureRequest`, `getFeatureRequests`, `updateFeatureRequest`, `deleteFeatureRequest`.
## Imports (Internal / External)
- Internal: `../services/FeatureRequestService` (`FeatureRequestService`).
- External: `express`.
- Module-level singleton: `const featureRequestService = new FeatureRequestService()`.
## Handlers / Functions
- **createFeatureRequest(req,res,next)** — Reads `req.body` (`createFeatureRequestSchema`), `req.user`. Calls `featureRequestService.createRequest(req.body, req.user!)`. `201`.
- **getFeatureRequests(req,res,next)** — Reads `req.user`. Calls `featureRequestService.getRequests(req.user!)`. `200` array.
- **updateFeatureRequest(req,res,next)** — Reads `req.params.id`, `req.body` (`updateFeatureRequestSchema`), `req.user`. Calls `featureRequestService.updateRequest(id, body, req.user!)`. `404` if null; else `200`.
- **deleteFeatureRequest(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. Calls `featureRequestService.deleteRequest(id, req.user!)`. `404` if null; else `200 {message:'Feature request deleted successfully'}`.
## Important logic & design patterns
- Thin CRUD delegation; uniform try/catch → `next`. Owner/role scoping handled in service.
## Relationships
- Routed by `featureRequestRoutes.ts` (mounted `/api/feature-requests`, behind `requireAuth`+`requireActive`).
- Delegates to `FeatureRequestService`.
