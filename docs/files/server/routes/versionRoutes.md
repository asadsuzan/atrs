# `server/src/routes/versionRoutes.ts`
**Purpose:** Express router for product Versions CRUD; mounted at `/api/versions` (app.ts: `app.use('/api/versions', requireAuth, requireActive, versionRoutes)`).
**Language / Size:** TypeScript / 743 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| POST | `/` | validate | `createVersionSchema` | `VersionController.createVersion` |
| GET | `/` | — | — | `VersionController.getVersions` |
| GET | `/:id` | validate | `idParamSchema` | `VersionController.getVersionById` |
| PATCH | `/:id` | validate | `updateVersionSchema` | `VersionController.updateVersion` |
| DELETE | `/:id` | validate | `idParamSchema` | `VersionController.deleteVersion` |
## Relationships
- Controller: `../controllers/VersionController`.
- Schemas: `version.schema` (`createVersionSchema`, `updateVersionSchema`), `common.schema` (`idParamSchema`).
- Middleware: `../middlewares/validate`.
## Notes
- Standard REST CRUD; owner/product scoping enforced in the controller via `req.user`.
