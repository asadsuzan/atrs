# `server/src/schemas/changelogGen.schema.ts`
**Purpose:** Zod validation for AI-assisted changelog generation from a git range. Hardens git-ref inputs against argument injection.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`; `hasControlChars` from `../utils/sanitize`

## Internal helpers
- `gitRef` = `z.string().max(200)` refined: must not start with `-` ('Value cannot start with "-"'); must not contain control chars ('Value contains control characters'). Allows dates like "2 weeks ago".

## Exports (Zod schemas)
- `generateChangelogSchema` — `{ body }`

## Fields — generateChangelogSchema.body
| Field | Rule |
| --- | --- |
| productId | objectId (required) |
| rangeType | enum tags/commit/date/working (required) |
| from | gitRef, optional |
| to | gitRef, optional |
| model | string max120, optional |
| createReviewEntries | boolean, optional |

## Important logic
- `.refine`: if `rangeType === 'working'` no from/to needed; otherwise `from` is required (else 'A "from" value is required for the selected range type').

## Relationships
- Feeds changelog generation into `Activity` model. Uses `objectId`, `hasControlChars`.
