# `server/src/schemas/activity.schema.ts`
**Purpose:** Zod validation for creating/updating Activity (changelog) entries.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Exports (Zod schemas)
- `createActivitySchema` — `{ body }`
- `updateActivitySchema` — `{ body, params:{ id: objectId } }`

## Fields — createActivitySchema.body
| Field | Rule |
| --- | --- |
| productId | objectId (required) |
| type | enum feature/improvement/bug-fix (required) |
| title | string (required) |
| shortDescription | string (required) |
| tier | enum free/pro, optional |
| priority | enum low/medium/high/critical, optional |
| referenceUrl | string nullable optional; '' → null |
| versionId | preprocess '' → null, then objectId.nullish() |
| relatedIssueIds | array(objectId), optional |
| displayOrder | number, optional |
| tags | array(string), optional |
| mediaType | preprocess '' → null; enum image/gif/video nullable optional |
| mediaUrl | string nullable optional; '' → null |
| mediaUrls | array(string), optional |
| items | array of `{ title(req), description(nullable opt), mediaType, mediaUrl, mediaUrls }`; default `[]` |
| activityDate | string (required) |
| assigneeIds | array(objectId), optional |
| estimatedHours | number, optional |
| actualHours | number, optional |

## Fields — updateActivitySchema.body
Same as create but all fields `.optional()` (items is optional, no default), plus `needsReview` (boolean optional). `params.id` = objectId.

## Relationships
- Validates payloads for the `Activity` model. Uses `objectId` common schema.
