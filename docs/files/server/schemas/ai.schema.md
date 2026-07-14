# `server/src/schemas/ai.schema.ts`
**Purpose:** Zod validation for AI suggestion requests (suggest a title or description).
**Language / Size:** TypeScript

## Imports
- `z` from zod

## Exports (Zod schemas)
- `aiSuggestSchema` — `{ body }`

## Fields — aiSuggestSchema.body
| Field | Rule |
| --- | --- |
| task | enum 'title' / 'description' (required) |
| entity | string, min 1 ('entity is required'), max 60 |
| context | record(string, any), optional — structured form context |
| title | string, max 300, optional — chosen title, used when task === 'description' |

## Relationships
- Standalone (no common.schema import).
