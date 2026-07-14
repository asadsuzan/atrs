# `server/src/controllers/AuditLogController.ts`
**Purpose:** Read audit logs, supporting both a simple recent-logs query and a filtered/paginated query.
**Language / Size:** TypeScript / 830 bytes
## Exports
Named export: `getAuditLogs`.
## Imports (Internal / External)
- Internal: `../services/AuditLogService` (`AuditLogService`).
- External: `express` (`Request`, `Response`, `NextFunction`).
- Module-level singleton: `const auditLogService = new AuditLogService()`.
## Handlers / Functions
- **getAuditLogs(req,res,next)** — GET. Reads `req.query`: `page`, `entityType`, `action`, `startDate`, `search`, `userId`, `limit`. No Zod. If any filter param present, calls `auditLogService.getLogs(req.query, req.user!)` → `200` (paginated result). Otherwise parses `limit` (default 20) and calls `auditLogService.getRecentLogs(limit, req.user!)` → `200`.
## Important logic & design patterns
- Dual-mode dispatch: legacy simple mode vs filtered mode chosen by presence of any filter query param.
- `parseInt(limit, 10)` with default 20.
## Relationships
- Routed by `auditLogRoutes.ts` (mounted `/api/audit-logs`, behind `requireAuth`+`requireActive`).
- Delegates to `AuditLogService`.
