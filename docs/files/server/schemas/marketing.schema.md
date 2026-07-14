# `server/src/schemas/marketing.schema.ts`
**Purpose:** Zod validation for upserting product marketing content.
**Language / Size:** TypeScript

## Imports
- `z` from zod; `objectId` from `./common.schema`

## Internal sub-schemas (all fields optional)
- `keyFeatureSchema`: title, description, list [string], mediaUrl
- `featureSchema`: title, description, list [string]
- `demoSchema`: icon, title, description, category, type, url
- `screenshotSchema`: title, url
- `faqSchema`: question, answer

## Exports (Zod schemas)
- `upsertMarketingSchema` — `{ body (.passthrough()), params:{ id: objectId } }`

## Fields — upsertMarketingSchema.body (all optional, `.passthrough()`)
| Field | Rule |
| --- | --- |
| pluginName, trailerVideo, tutorialVideo, wpOrgUrl, docsUrl, heroDescription, thumbnailImage, proFeaturesDesc, topRatingLink | string, optional |
| problemList, smarterWayList | array(string), optional |
| keyFeatures | array(keyFeatureSchema), optional |
| allFeatures | array(featureSchema), optional |
| demos | array(demoSchema), optional |
| screenshots | array(screenshotSchema), optional |
| faqs | array(faqSchema), optional |

## Important logic
- `.passthrough()` on body permits unlisted keys to pass through (not stripped).

## Relationships
- Validates payloads for the `ProductMarketing` model.
