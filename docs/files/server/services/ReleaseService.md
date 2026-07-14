# `server/src/services/ReleaseService.ts`
**Purpose:** Assembles a product's versions + published changelog activities into a single publishable release payload — a structured per-version model plus ready-to-paste WordPress.org readme and GitHub Markdown exports.
**Language / Size:** TypeScript / 2007 bytes

## Exports
- `class ReleaseService` — the service (consumer: ReleaseController / public release endpoint).

## Imports (Internal / External)
Internal:
- `../models/Activity` (Activity)
- `../models/Version` (Version)
- `../models/Product` (IProduct type)
- `../utils/releaseFormat` (assembleRelease, toReadmeChangelog, toMarkdown)

External: Mongoose model statics (find), Promise.all.

## Functions / Methods
- **buildRelease(product: IProduct): Promise<...>** — the single public method.
  1. Reads `product._id` and `(product as any).ownerId`.
  2. In parallel (`Promise.all`): `Version.find({ productId, ownerId }).lean()` and `Activity.find({ productId, ownerId, needsReview: { $ne: true } }).sort({ displayOrder: 1, activityDate: -1 }).lean()`. Both are scoped by `ownerId` as well as `productId` so a record re-parented across tenants can never leak into another owner's release. Activities still pending review are excluded (`needsReview: { $ne: true }`) — drafts only publish after confirmation.
  3. `assembleRelease(versions, activities)` → `{ releases, unreleased }`.
  4. Builds a sanitized `productView` DTO: id (String), name, slug, description (''), icon (''), banner (''), githubUrl (''), wpOrgSlug (''), category, `publicChangelogEnabled` (boolean coerced via `!!`), `listedInDirectory` (`!== false`, so missing/legacy defaults to true).
  5. Returns `{ product: productView, releases, unreleased, formats: { readme: toReadmeChangelog(assembled), markdown: toMarkdown(product.name, assembled) } }`.

## Data structures / Types / Constants
- Return shape: `{ product, releases, unreleased, formats: { readme, markdown } }`.
- `productView` DTO — a whitelist of safe product fields for public rendering.

## Important algorithms
### Owner-scoped, review-filtered release assembly
Child queries add `ownerId` to the `productId` filter (defense against cross-tenant re-parenting) and drop `needsReview` entries so unconfirmed AI/imported drafts never appear in the published changelog. Activities are ordered by `displayOrder` asc then `activityDate` desc. Formatting is delegated to `releaseFormat` utils (`assembleRelease` groups into releases/unreleased; `toReadmeChangelog` and `toMarkdown` produce the export strings).

## Relationships
- Called by: the release/publish controller (produces the public release view + copy-paste export formats).
- Models: Version, Activity, Product (type).
- Utils: releaseFormat (assembleRelease, toReadmeChangelog, toMarkdown) does all structural/format work.

## Edge cases & known limitations
- Read-only service — no writes, no audit logging.
- `listedInDirectory !== false` means a legacy product lacking the field is treated as listed.
- Cross-tenant safety depends on `ownerId` being present on the product; casts `product as any` to read it.
- Output completeness depends entirely on releaseFormat utils; this service does no version/activity validation itself.
