# `server/src/utils/activityBulkUpdate.ts`
**Purpose:** Builds a safe MongoDB update document from whitelisted bulk-activity-update input, preventing client-supplied operator injection (NoSQL-injection guard).
**Language / Size:** TypeScript / 2521 bytes

## Exports
- `interface ActivityBulkUpdateInput`
- `interface MongoUpdateDoc`
- `function buildActivityBulkUpdate(input): MongoUpdateDoc`

## Imports (Internal / External)
- Internal: `createHttpError` from `./httpError`.
- External: none.

## Functions
### `buildActivityBulkUpdate(input: ActivityBulkUpdateInput): MongoUpdateDoc`
Purpose: Assemble the actual `$set`/`$addToSet`/`$pull` update document server-side so no raw client-supplied operator ever reaches the DB.
Algorithm:
1. Init empty `update` and `$set`.
2. For each field in `SET_FIELDS` (`type`, `tier`, `priority`, `versionId`, `needsReview`): if `input[field] !== undefined`, copy into `$set`.
3. If `input.activityDate` defined: parse `new Date(...)`; if `Number.isNaN(date.getTime())` throw 400 "activityDate is not a valid date"; else set `$set.activityDate = date` (Date object, not string).
4. Compute `replacingTags` (input.tags defined) and `mutatingTags` (addTags or removeTags defined). If both, throw 400 "Cannot combine `tags` (replace) with `addTags`/`removeTags`" — Mongo cannot `$set` and `$addToSet` the same path in one update.
5. If replacingTags: `$set.tags = input.tags`.
6. If `$set` non-empty, attach as `update.$set`.
7. If `addTags` non-empty: `update.$addToSet = { tags: { $each: input.addTags } }`.
8. If `removeTags` non-empty: `update.$pull = { tags: { $in: input.removeTags } }`.
9. If `update` is still empty, throw 400 "No valid fields to update".
10. Return `update`.
Side effects: none. Error handling: throws HttpError (400) via createHttpError.
Notable branches & WHY: The tags replace-vs-mutate conflict guard exists because MongoDB rejects setting and array-mutating the same path atomically. Only whitelisted named fields are ever emitted, so a rogue `$set`/`$addToSet` key in input is silently ignored (not a recognized field) — the anti-injection design.

## Types / Constants
- `ActivityBulkUpdateInput`: optional `type` ('feature'|'improvement'|'bug-fix'), `tier` ('free'|'pro'), `priority` ('low'|'medium'|'high'|'critical'), `versionId` (string|null), `tags` (string[]), `addTags`, `removeTags`, `activityDate` (string), `needsReview` (boolean).
- `MongoUpdateDoc`: optional `$set`, `$addToSet`, `$pull` records.
- `SET_FIELDS` (const): the five scalar fields eligible for `$set`.

## Important logic & design patterns
Whitelist-based update assembly (NoSQL injection defense). The interface represents plain field values / tag operations, NOT raw Mongo operators.

## Relationships (who uses it)
Consumed by the activity bulk-update route/controller; paired with `bulkUpdateActivitiesSchema` (Zod) which rejects raw operators before this runs. Uses `httpError`.

## Tests
See activityBulkUpdate.test.ts.
