# `server/src/repositories/ActivityRepository.ts`
**Purpose:** Data-access layer for the `Activity` model — CRUD, paginated listing, and guarded bulk operations.
**Language / Size:** TypeScript

## Exports
- `class ActivityRepository`

## Imports
- `Activity`, `IActivity` from `../models/Activity`

## Functions (methods)
| Method | Signature | Behavior |
| --- | --- | --- |
| create | `(data: Partial<IActivity>) => Promise<IActivity>` | `new Activity(data).save()` |
| findAll | `(filter, options={}) => Promise<{data,total,page,totalPages}>` | Defaults: page 1, limit 10, sortBy 'activityDate', sortOrder 'desc'. If `limit === -1` returns all (no skip/limit). Populates `productId` (name slug icon category status), `versionId` (label author), `relatedIssueIds` (title status severity versionLabel). Runs find + countDocuments in parallel |
| findById | `(id) => Promise<IActivity|null>` | findById with same 3 populates |
| update | `(id, data) => Promise<IActivity|null>` | `findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })` |
| delete | `(id) => Promise<IActivity|null>` | `findByIdAndDelete` |
| findManyByIds | `(ids, scope={}) => Promise<IActivity[]>` | `find({ _id: { $in: ids }, ...scope })` |
| bulkUpdate | `(ids, update, scope={}) => Promise<number>` | Validates update keys against allow-list; `updateMany({_id:{$in:ids},...scope}, update, {runValidators:true})`; returns modifiedCount |
| bulkDelete | `(ids, scope={}) => Promise<number>` | `deleteMany`; returns deletedCount |
| reorder | `(id, displayOrder) => Promise<IActivity|null>` | `findByIdAndUpdate(id, { displayOrder }, { new: true })` |

## Important logic
- `ALLOWED_BULK_OPERATORS` (static, private) = `{ $set, $addToSet, $pull }`. `bulkUpdate` throws `Disallowed bulk update operator(s): ...` if the update is empty or contains any operator outside the set — defense-in-depth against NoSQL operator injection.
- `scope` parameter lets the service constrain bulk/multi ops (e.g. to an owner).

## Relationships
- Wraps `Activity` model. Populates Product, Version, Issue references.
