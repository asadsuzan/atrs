# `server/src/models/ProductMarketing.ts`
**Purpose / Collection name:** Marketing/landing-page content for a product (1-to-1 with Product). Collection: `productmarketings`.
**Language / Size:** TypeScript / 3271 bytes

## Mongoose Schema — Fields (root `ProductMarketingSchema`)
| Field | Type | Required | Default | Ref | Index | Notes/enum/validation |
| --- | --- | --- | --- | --- | --- | --- |
| ownerId | ObjectId | yes | — | User | yes (field-level) | |
| productId | ObjectId | yes | — | Product | unique | 1-to-1 with Product |
| pluginName | String | no | '' | — | — | |
| trailerVideo | String | no | '' | — | — | |
| tutorialVideo | String | no | '' | — | — | |
| wpOrgUrl | String | no | '' | — | — | |
| docsUrl | String | no | '' | — | — | |
| heroDescription | String | no | '' | — | — | |
| thumbnailImage | String | no | '' | — | — | |
| problemList | [String] | no | — | — | — | |
| smarterWayList | [String] | no | — | — | — | |
| keyFeatures | [KeyFeatureSchema] | no | — | — | — | subdoc, `_id:false` |
| allFeatures | [FeatureSchema] | no | — | — | — | subdoc, `_id:false` |
| proFeaturesDesc | String | no | '' | — | — | |
| demos | [DemoSchema] | no | — | — | — | subdoc, `_id:false` |
| topRatingLink | String | no | '' | — | — | |
| screenshots | [ScreenshotSchema] | no | — | — | — | subdoc, `_id:false` |
| faqs | [FAQSchema] | no | — | — | — | subdoc, `_id:false` |
| createdAt / updatedAt | Date | — | auto | — | — | via `{ timestamps: true }` |

Subdocuments (all `{ _id: false }`, all string fields default `''`):
- `DemoSchema`: icon, title, description, category, type, url
- `KeyFeatureSchema`: title, description, list [String], mediaUrl
- `FeatureSchema`: title, description, list [String]
- `ScreenshotSchema`: title, url
- `FAQSchema`: question, answer

## Indexes (schema.index(...) calls)
None. Field-level: `ownerId` index; `productId` unique.

## Virtuals / Methods / Hooks (pre/post middleware)
None.

## TypeScript interface(s) exported
- `IDemo`, `IKeyFeature`, `IFeature`, `IScreenshot`, `IFAQ`
- `IProductMarketing extends Document` — full field set (see above)

## Relationships (refs to other models)
- `ownerId` → User
- `productId` → Product (unique, 1-to-1)
