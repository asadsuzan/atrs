# `server/src/schemas/product.schema.ts`
**Purpose:** Zod validation for creating/updating products.
**Language / Size:** TypeScript

## Imports
- `z` from zod (no common.schema import — note `params.id` is plain string, not objectId)

## Exports (Zod schemas)
- `createProductSchema` — `{ body }`
- `updateProductSchema` — `{ body, params:{ id: z.string() } }`

## Fields — createProductSchema.body
| Field | Rule |
| --- | --- |
| name | string (required) |
| githubUrl | string url('Invalid URL format') optional, OR literal '' |
| description | string, optional |
| category | enum plugin/block/theme/standalone (required) |
| status | enum active/inactive, optional |
| icon, banner, wpOrgSlug, wpReadme, repoPath | string, optional |

## Fields — updateProductSchema.body
| Field | Rule |
| --- | --- |
| name | string, optional |
| githubUrl | string url('Invalid URL format'), optional (no empty-string allowance here) |
| description | string, optional |
| category | enum plugin/block/theme/standalone, optional |
| status | enum active/inactive, optional |
| icon, banner, wpOrgSlug, wpReadme, repoPath | string, optional |
| publicChangelogEnabled, publicIssuesEnabled, listedInDirectory | boolean, optional |

`params.id` = `z.string()` (not objectId-validated).

## Relationships
- Validates payloads for the `Product` model.
