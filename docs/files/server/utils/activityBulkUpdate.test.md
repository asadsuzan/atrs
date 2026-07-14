# `server/src/utils/activityBulkUpdate.test.ts`
**Purpose:** Vitest tests for `buildActivityBulkUpdate` and for the Zod `bulkUpdateActivitiesSchema` operator-injection guard.
**Language / Size:** TypeScript / 3368 bytes

## Imports (Internal / External)
- Internal: `buildActivityBulkUpdate` from `./activityBulkUpdate`; `bulkUpdateActivitiesSchema` from `../schemas/activityBulk.schema`.
- External: `describe, it, expect` from `vitest`.

## Tests (cases covered)
`describe('buildActivityBulkUpdate')`:
- builds `$set` for scalar fields (`type`, `tier`).
- builds `$addToSet`/`$pull` for tag operations; `$set` undefined.
- parses `activityDate` into a `Date` instance.
- rejects invalid `activityDate` (throws /valid date/).
- rejects combining `tags` replace with `addTags`/`removeTags` (throws /Cannot combine/).
- rejects empty payload (throws /No valid fields/).
- ignores rogue operator keys and never emits them: a lone `{ $set: { ownerId } }` (cast `as any`) throws /No valid fields/; mixed with a real field, output contains only the real field and no `ownerId`.

`describe('bulkUpdateActivitiesSchema (operator-injection guard)')`:
- accepts a clean named-field payload (`{ ids:[validId], update:{ addTags:['released'] } }`).
- rejects a raw `$addToSet` operator in update.
- rejects a `$set` `ownerId` reassignment attempt.
- rejects `$unset` and `$rename` operators.

`validId` = 'a' repeated 24 times (valid ObjectId length).

## Relationships
Validates the two-layer injection defense: Zod schema rejects operators at the edge; the builder only emits whitelisted fields.
