# `server/src/models/AuditLog.ts`
**Purpose / Collection name:** Audit trail of create/update/delete actions on domain entities. Collection: `auditlogs`. Default export (not named).
**Language / Size:** TypeScript / 1267 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| action | String | yes | — | — | — | enum: CREATE, UPDATE, DELETE |
| entityType | String | yes | — | — | — | enum: PRODUCT, ACTIVITY, VERSION, MARKETING, ISSUE, TASK, MILESTONE, FEATURE_REQUEST |
| userId | ObjectId | no | — | User | yes | |
| userName | String | no | — | — | — | |
| entityId | ObjectId | yes | — | (none) | — | |
| entityName | String | yes | — | — | — | |
| details | String | no | — | — | — | |
| createdAt | Date | — | auto | — | — | via `{ timestamps: { createdAt: true, updatedAt: false } }` |

## Indexes (schema.index(...) calls)
None. Field-level index on `userId`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IAuditLog extends Document` — action, entityType, entityId, entityName, details?, userId?, userName?, createdAt

## Relationships (refs to other models)
- `userId` → User. `entityId` is a plain ObjectId with no `ref` (polymorphic — target depends on `entityType`).
