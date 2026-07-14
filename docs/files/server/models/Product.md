# `server/src/models/Product.ts`
**Purpose / Collection name:** A product (WP plugin/block/theme or standalone) owned by a user. Collection: `products`.
**Language / Size:** TypeScript / 2480 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| name | String | yes | — | — | — | |
| slug | String | yes | — | — | (compound) | unique per owner, not globally |
| description | String | no | '' | — | — | |
| githubUrl | String | no | '' | — | — | standalone products may omit |
| banner | String | no | '' | — | — | |
| icon | String | no | '' | — | — | |
| wpOrgSlug | String | no | '' | — | — | |
| wpReadme | String | no | '' | — | — | |
| repoPath | String | no | '' | — | — | absolute local path watched by code-activity tracker |
| publicChangelogEnabled | Boolean | no | false | — | — | serve public /changelog/:id |
| publicIssuesEnabled | Boolean | no | false | — | — | serve public /issues/:id |
| listedInDirectory | Boolean | no | true | — | — | appears in public /explore |
| category | String | yes | — | — | yes (schema.index) | enum: plugin, block, theme, standalone |
| status | String | no | 'active' | — | yes (schema.index) | enum: active, inactive |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

## Indexes (schema.index(...) calls)
- `{ ownerId: 1, slug: 1 }` — `unique` (slug unique within owner namespace)
- `{ status: 1 }`
- `{ category: 1 }`
- Field-level index on `ownerId`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IProduct extends Document` — full field set (see above)

## Relationships (refs to other models)
- `ownerId` → User
- (Referenced by Activity, Issue, Version, ProductMarketing via `productId`.)
