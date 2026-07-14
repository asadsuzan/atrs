# `server/src/models/Version.ts`
**Purpose / Collection name:** A product version/release (manual or GitHub-synced). Collection: `versions`.
**Language / Size:** TypeScript / 1860 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| productId | ObjectId | yes | — | Product | yes (schema.index) | |
| label | String | yes | — | — | — | |
| notes | String | no | '' | — | — | |
| status | String | no | 'released' | — | — | enum: released, unreleased |
| releasedAt | Date | no | — | — | — | |
| author | String | no | '' | — | — | |
| source | String | no | 'manual' | — | (compound) | enum: manual, github |
| externalId | String | no | '' | — | (compound) | GitHub release/tag id for idempotent sync |
| externalUrl | String | no | '' | — | — | link to upstream release page |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

## Indexes (schema.index(...) calls)
- `{ productId: 1 }`
- `{ productId: 1, source: 1, externalId: 1 }` — `unique`, `partialFilterExpression: { externalId: { $type: 'string', $gt: '' } }` (idempotent GitHub sync; manual versions with empty externalId exempt)
- Field-level index on `ownerId`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IVersion extends Document` — full field set (see above)

## Relationships (refs to other models)
- `ownerId` → User
- `productId` → Product
