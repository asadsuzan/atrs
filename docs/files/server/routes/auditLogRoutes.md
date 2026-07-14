# `server/src/routes/auditLogRoutes.ts`
**Purpose:** Express router for audit log retrieval; mounted at `/api/audit-logs` (app.ts: `app.use('/api/audit-logs', requireAuth, requireActive, auditLogRoutes)`).
**Language / Size:** TypeScript / 182 bytes
## Middleware applied (router-level)
- None inside the file. `requireAuth` + `requireActive` are applied at the mount in `app.ts`.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/` | (mount: requireAuth, requireActive) | — | `AuditLogController.getAuditLogs` |
## Relationships
- Controller: `../controllers/AuditLogController` (`getAuditLogs`).
## Notes
- Minimal read-only router; filtering/pagination handled inside the controller via query params.
