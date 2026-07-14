# `server/src/routes/configRoutes.ts`
**Purpose:** Express router for admin app configuration and storage-connection testing; mounted at `/api/config` (app.ts: `app.use('/api/config', requireAuth, requireActive, requireAdmin, configRoutes)`).
**Language / Size:** TypeScript / 296 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` + `requireAdmin` are applied at the mount in `app.ts` (admin-only surface).
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | (mount: requireAuth, requireActive, requireAdmin) | — | `ConfigController.getConfig` |
| POST | `/` | (mount: requireAuth, requireActive, requireAdmin) | — | `ConfigController.updateConfig` |
| POST | `/storage/test` | (mount: ...requireAdmin) | — | `ConfigController.testStorageConnection` |
## Relationships
- Controller: `../controllers/ConfigController` (`getConfig`, `updateConfig`, `testStorageConnection`).
## Notes
- Entire router is admin-gated at the mount. No per-route validation middleware.
