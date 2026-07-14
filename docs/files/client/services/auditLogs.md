# `client/src/services/auditLogs.ts`
**Purpose:** Fetch audit-log entries.
**Language / Size:** TS / 163 bytes

## Exports (functions)
`getAuditLogs`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getAuditLogs(params?: any): Promise<any>`** — `GET /api/audit-logs`; query params passed via `{ params }`; returns `data`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the AuditLogs page (route `/audit-logs`).
- Backend target: `/api/audit-logs`.
