# `server/src/models/Issue.ts`
**Purpose / Collection name:** Bug/issue tracked per product, from internal or public sources. Collection: `issues`.
**Language / Size:** TypeScript / 2799 bytes

## Mongoose Schema — Fields
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| productId | ObjectId | yes | — | Product | yes (schema.index) | |
| title | String | yes | — | — | — | |
| description | String | no | '' | — | — | |
| status | String | no | 'open' | — | — | enum: open, in-progress, resolved, closed |
| severity | String | no | 'medium' | — | — | enum: low, medium, high, critical |
| reporter | String | no | '' | — | — | free text (name/username/email) |
| reporterEmail | String | no | '' | — | — | public reporter contact; never shown publicly |
| source | String | no | 'internal' | — | — | enum: internal, public |
| needsReview | Boolean | no | false | — | — | Public submissions flagged; hidden until owner clears |
| versionLabel | String | no | '' | — | — | free text version, e.g. "2.0.3" |
| mediaUrls | [String] | no | — | — | — | screenshots/recordings |
| foundAt | Date | no | — | — | — | |
| resolvedAt | Date | no | — | — | — | |
| assigneeIds | [ObjectId] | no | — | User | yes (field-level on array) | |
| dueDate | Date | no | — | — | — | |
| estimatedHours | Number | no | — | — | — | |
| actualHours | Number | no | — | — | — | |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

## Indexes (schema.index(...) calls)
- `{ productId: 1 }`
- Field-level indexes on `ownerId`, `assigneeIds`.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IssueStatus` type = 'open' | 'in-progress' | 'resolved' | 'closed'
- `IssueSeverity` type = 'low' | 'medium' | 'high' | 'critical'
- `IIssue extends Document` — full field set (see above)

## Relationships (refs to other models)
- `ownerId` → User; `assigneeIds` → User
- `productId` → Product
