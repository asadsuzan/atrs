# `server/src/schemas/version.schema.ts`
**Purpose:** Zod validation for creating/updating product versions.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Exports (Zod schemas)
- `createVersionSchema` — `{ body }`
- `updateVersionSchema` — `{ body, params:{ id: objectId } }`

## Fields — createVersionSchema.body
| Field | Rule |
| --- | --- |
| productId | objectId (required) |
| label | string min1('label is required') |
| notes | string, optional |
| status | enum released/unreleased, optional |
| releasedAt | string nullable optional; '' → null |
| author | string, optional |

## Fields — updateVersionSchema.body
Same as create but productId optional, label `min1` optional. `params.id` = objectId.

## Relationships
- Validates payloads for the `Version` model.
