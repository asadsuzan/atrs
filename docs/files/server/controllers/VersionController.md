# `server/src/controllers/VersionController.ts`
**Purpose:** CRUD for product Versions (releases).
**Language / Size:** TypeScript / 2047 bytes
## Exports
Named exports: `createVersion`, `getVersions`, `getVersionById`, `updateVersion`, `deleteVersion`.
## Imports (Internal / External)
- Internal: `../services/VersionService` (`VersionService`).
- External: `express`.
- Module-level singleton: `versionService`.
## Handlers / Functions
- **createVersion(req,res,next)** — Reads `req.body` (`createVersionSchema`), `req.user`. `versionService.createVersion`. `201`.
- **getVersions(req,res,next)** — Reads `req.query.productId` (optional; omit for all owner products, product populated), `req.user`. `versionService.getVersions(productId, req.user!)`. `200`.
- **getVersionById(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200`.
- **updateVersion(req,res,next)** — Reads `req.params.id`, `req.body` (`updateVersionSchema`), `req.user`. `404` if null; else `200`.
- **deleteVersion(req,res,next)** — Reads `req.params.id` (`idParamSchema`), `req.user`. `404` if null; else `200 {message:'Version deleted successfully'}`.
## Important logic & design patterns
- Thin CRUD delegation; uniform try/catch → `next`; owner scoping in service.
## Relationships
- Routed by `versionRoutes.ts` (mounted `/api/versions`, behind `requireAuth`+`requireActive`).
- Delegates to `VersionService`.
