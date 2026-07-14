# `server/src/schemas/issue.schema.ts`
**Purpose:** Zod validation for creating/updating issues and for the public "Report an issue" form.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Internal helpers
- `status` = enum open/in-progress/resolved/closed
- `severity` = enum low/medium/high/critical
- `optionalDate` = string nullable optional; '' → null

## Exports (Zod schemas)
- `createIssueSchema` — `{ body }`
- `updateIssueSchema` — `{ body, params:{ id } }`
- `publicReportIssueSchema` — `{ body, params:{ id } }`

## Fields — createIssueSchema.body
| Field | Rule |
| --- | --- |
| productId | objectId (required) |
| title | string min1('title is required') |
| description | string, optional |
| status | status enum, optional |
| severity | severity enum, optional |
| reporter | string, optional |
| versionLabel | string, optional |
| mediaUrls | array(string), optional |
| foundAt / resolvedAt / dueDate | optionalDate |
| assigneeIds | array(objectId), optional |
| estimatedHours / actualHours | number, optional |

## Fields — updateIssueSchema.body
Same as create with title `min1` optional, productId optional, plus `needsReview` (boolean optional). `params.id` = objectId.

## Fields — publicReportIssueSchema.body (narrow, anonymous)
| Field | Rule |
| --- | --- |
| title | string trim min3('Please describe the issue') max200 |
| description | string trim max5000, optional |
| versionLabel | string trim max60, optional |
| reporter | string trim max120, optional |
| reporterEmail | string trim email('Enter a valid email') max200 optional, OR literal '' |
| website | string max0, optional — honeypot (must be empty) |

`params.id` = objectId. Status/severity/source/needsReview set server-side, never by client.

## Relationships
- Validates payloads for the `Issue` model.
