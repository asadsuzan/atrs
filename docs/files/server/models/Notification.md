# `server/src/models/Notification.ts`
**Purpose / Collection name:** Per-user notification (system or mention). Collection: `notifications`.
**Language / Size:** TypeScript / 852 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| userId | ObjectId | yes | — | User | yes (field-level) | |
| type | String | no | 'system' | — | — | enum: system, mention |
| title | String | yes | — | — | — | |
| message | String | yes | — | — | — | |
| link | String | no | — | — | — | |
| read | Boolean | no | false | — | — | |
| createdAt | Date | — | auto | — | — | via `{ timestamps: { createdAt: true, updatedAt: false } }` |

## Indexes (schema.index(...) calls)
None. Field-level index on `userId`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `NotificationType` type = 'system' | 'mention'
- `INotification extends Document` — userId, type, title, message, link?, read, createdAt

## Relationships (refs to other models)
- `userId` → User
