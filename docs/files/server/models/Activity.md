# `server/src/models/Activity.ts`
**Purpose / Collection name:** Changelog / activity entries per product (features, improvements, bug-fixes). Collection: `activities` (Mongoose default pluralization of model `Activity`).
**Language / Size:** TypeScript / 5284 bytes

## Mongoose Schema — Fields
Table (root `ActivitySchema`):
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| productId | ObjectId | yes | — | Product | yes (schema.index) | |
| type | String | yes | — | — | yes (schema.index) | enum: feature, improvement, bug-fix |
| title | String | yes | — | — | — | |
| shortDescription | String | yes | — | — | — | |
| tier | String | no | — | — | — | enum: free, pro |
| tags | [String] | no | — | — | — | |
| priority | String | no | — | — | — | enum: low, medium, high, critical |
| referenceUrl | String | no | — | — | — | |
| versionId | ObjectId | no | — | Version | — | |
| relatedIssueIds | [ObjectId] | no | — | Issue | — | Issues resolved (bug-fix entries) |
| displayOrder | Number | no | — | — | — | |
| mediaType | String | no | — | — | — | enum: image, gif, video |
| mediaUrl | String | no | — | — | — | |
| mediaUrls | [String] | no | — | — | — | |
| items | [ActivityItemSchema] | no | — | — | — | subdocument array, `_id: false` |
| activityDate | Date | yes | — | — | yes (schema.index) | |
| assigneeIds | [ObjectId] | no | — | User | yes (field-level on array) | |
| estimatedHours | Number | no | — | — | — | |
| actualHours | Number | no | — | — | — | |
| autoTracked | Boolean | no | false | — | yes | Legacy flag from removed code-activity tracker |
| filePath | String | no | — | — | — | Source file for AI-generated draft |
| importSourceKey | String | no | — | — | yes | `version|normalized-title` at import; stable identity for WP.org readme imports |
| needsReview | Boolean | no | false | — | yes | Low-certainty auto-derived entry |
| reviewReason | String | no | — | — | — | e.g. 'uncertain-type' |
| importConfidence | String | no | — | — | — | enum: high, medium, low |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

Subdocument `ActivityItemSchema` (`{ _id: false }`):
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| title | String | yes | |
| description | String | no | |
| mediaType | String | no | enum: image, gif, video |
| mediaUrl | String | no | |
| mediaUrls | [String] | no | |

## Indexes (schema.index(...) calls)
- `{ activityDate: -1 }`
- `{ productId: 1 }`
- `{ type: 1 }`
- `{ ownerId: 1, activityDate: 1, type: 1 }` — owner-scoped trend/annual aggregations
- `{ productId: 1, importSourceKey: 1 }` — `unique`, `partialFilterExpression: { importSourceKey: { $exists: true } }` (dedup imported entries only)
- Field-level indexes: `ownerId`, `assigneeIds`, `autoTracked`, `importSourceKey`, `needsReview`.

## Virtuals / Methods / Hooks (pre/post middleware)
None defined.

## TypeScript interface(s) exported
- `IActivityItem` — title, description?, mediaType?, mediaUrl?, mediaUrls?
- `IActivity extends Document` — full field set (see above)

## Relationships (refs to other models)
- `ownerId` → User; `assigneeIds` → User
- `productId` → Product
- `versionId` → Version
- `relatedIssueIds` → Issue
