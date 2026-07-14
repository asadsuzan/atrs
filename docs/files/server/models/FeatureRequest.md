# `server/src/models/FeatureRequest.ts`
**Purpose / Collection name:** Feature request for the ATRS platform itself, submitted in-app by a logged-in user and triaged by admins. Collection: `featurerequests`.
**Language / Size:** TypeScript / 1193 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| requesterId | ObjectId | yes | — | User | yes (field-level) | |
| title | String | yes | — | — | — | |
| description | String | no | '' | — | — | |
| status | String | no | 'pending' | — | yes (field-level) | enum: pending, planned, in-progress, done, declined |
| adminNote | String | no | '' | — | — | Admin response visible to requester |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

## Indexes (schema.index(...) calls)
None. Field-level indexes on `requesterId`, `status`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `FeatureRequestStatus` type = 'pending' | 'planned' | 'in-progress' | 'done' | 'declined'
- `IFeatureRequest extends Document` — requesterId, title, description?, status, adminNote?, createdAt, updatedAt

## Relationships (refs to other models)
- `requesterId` → User
