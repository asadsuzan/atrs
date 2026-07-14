# `server/src/schemas/activityBulk.schema.ts`
**Purpose:** Zod validation for bulk update / bulk delete of Activities. Uses `.strict()` to block NoSQL operator-injection (client cannot send raw `$set`/`$pull`/etc.).
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Exports (Zod schemas)
- `bulkUpdateActivitiesSchema` — `{ body }`
- `bulkDeleteActivitiesSchema` — `{ body }`

## Fields — bulkUpdateActivitiesSchema.body (`.strict()`)
| Field | Rule |
| --- | --- |
| ids | array(objectId).min(1, 'ids array is required') |
| update | object (`.strict()`) with fields below |

update sub-object (`.strict()`):
| Field | Rule |
| --- | --- |
| type | enum feature/improvement/bug-fix, optional |
| tier | enum free/pro, optional |
| priority | enum low/medium/high/critical, optional |
| versionId | objectId nullable optional |
| tags | array(string), optional |
| addTags | array(string), optional |
| removeTags | array(string), optional |
| activityDate | string, optional |
| needsReview | boolean, optional |

## Fields — bulkDeleteActivitiesSchema.body
| Field | Rule |
| --- | --- |
| ids | array(objectId).min(1, 'ids array is required') |

## Important logic
- Both `body` and `update` are `.strict()`, so any unlisted key (including Mongo operators) fails validation. Server assembles the actual update doc from these named fields (`addTags`/`removeTags` → `$addToSet`/`$pull` in service).

## Relationships
- Validates bulk-op payloads for the `Activity` model.
