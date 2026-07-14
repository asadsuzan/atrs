# `server/src/schemas/common.schema.ts`
**Purpose:** Shared Zod primitives reused across schemas.
**Language / Size:** TypeScript

## Imports
- `z` from zod

## Exports
| Export | Rule |
| --- | --- |
| objectId | `z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format')` — 24-char hex MongoDB ObjectId |
| idParamSchema | `{ params: { id: objectId } }` — validates a route `:id` param |

## Relationships
- Imported by most other schema files (activity, activityBulk, changelogGen, featureRequest, github, issue, marketing, version).
