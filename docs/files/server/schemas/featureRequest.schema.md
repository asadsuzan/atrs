# `server/src/schemas/featureRequest.schema.ts`
**Purpose:** Zod validation for creating/updating platform feature requests.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Internal helpers
- `status` = enum pending/planned/in-progress/done/declined

## Exports (Zod schemas)
- `createFeatureRequestSchema` — `{ body }`
- `updateFeatureRequestSchema` — `{ body, params:{ id: objectId } }`

## Fields — createFeatureRequestSchema.body
| Field | Rule |
| --- | --- |
| title | string trim min3('Please describe the feature') max200 |
| description | string trim max5000, optional |

## Fields — updateFeatureRequestSchema.body
| Field | Rule |
| --- | --- |
| title | string trim min3 max200, optional |
| description | string trim max5000, optional |
| status | enum (above), optional |
| adminNote | string trim max2000, optional |

## Important logic
- Per comment: requesters may edit title/description of their own pending request; `status`/`adminNote` are admin-only (enforced in the service, not here).

## Relationships
- Validates payloads for the `FeatureRequest` model.
