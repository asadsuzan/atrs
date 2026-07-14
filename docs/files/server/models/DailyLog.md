# `server/src/models/DailyLog.ts`
**Purpose / Collection name:** One entry in a user's personal daily work journal — the unit of the logging-streak habit. Independent of Products/Activities (private "what did I work on today" note). Collection: `dailylogs`.
**Language / Size:** TypeScript / 841 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| note | String | yes | — | — | — | |
| createdAt | Date | — | auto | — | — | via `{ timestamps: { createdAt: true, updatedAt: false } }` |

## Indexes (schema.index(...) calls)
- `{ ownerId: 1, createdAt: -1 }` — streak aggregation groups user entries by day.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IDailyLog extends Document` — ownerId, note, createdAt

## Relationships (refs to other models)
- `ownerId` → User
