# `server/src/models/JobSession.ts`
**Purpose / Collection name:** Cross-instance cancellation flag for a streaming job (WP import, bulk delete, ...). On serverless the start and cancel requests may hit different instances, so the cancel signal is mirrored in the DB and polled. TTL-expiring. Collection: `jobsessions`.
**Language / Size:** TypeScript / 1016 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| sessionId | String | yes | — | — | unique | |
| userId | String | yes | — | — | — | (plain string, not ObjectId ref) |
| cancelled | Boolean | no | false | — | — | |
| createdAt | Date | no | Date.now | — | TTL | `expires: 3600` — row dropped 1h after creation |

## Indexes (schema.index(...) calls)
None via schema.index. Field-level: `sessionId` unique; `createdAt` TTL (`expires: 3600`).

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IJobSession extends Document` — sessionId, userId, cancelled, createdAt

## Relationships (refs to other models)
None (userId is a plain string with no ref).
