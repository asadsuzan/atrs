# `server/src/repositories/ProductMarketingRepository.ts`
**Purpose:** Data-access layer for the `ProductMarketing` model (1-to-1 per product).
**Language / Size:** TypeScript

## Exports
- `class ProductMarketingRepository`

## Imports
- `ProductMarketing`, `IProductMarketing` from `../models/ProductMarketing`

## Functions (methods)
| Method | Signature | Behavior |
| --- | --- | --- |
| findByProductId | `(productId) => Promise<IProductMarketing|null>` | `findOne({ productId })` |
| upsertByProductId | `(productId, data) => Promise<IProductMarketing>` | `findOneAndUpdate({ productId }, { ...data, productId }, { new: true, upsert: true, setDefaultsOnInsert: true })` |
| deleteByProductId | `(productId) => Promise<boolean>` | `deleteOne({ productId })`; returns `deletedCount > 0` |

## Important logic
- Upsert always forces `productId` into the update doc and applies schema defaults on insert.

## Relationships
- Wraps `ProductMarketing` model (keyed by `productId`).
