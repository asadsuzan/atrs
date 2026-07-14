# `server/src/repositories/ProductRepository.ts`
**Purpose:** Data-access layer for the `Product` model — CRUD and paginated listing.
**Language / Size:** TypeScript

## Exports
- `class ProductRepository`

## Imports
- `Product`, `IProduct` from `../models/Product`

## Functions (methods)
| Method | Signature | Behavior |
| --- | --- | --- |
| create | `(data: Partial<IProduct>) => Promise<IProduct>` | `new Product(data).save()` |
| findAll | `(filter, options={}) => Promise<{data,totalPages}>` | Defaults page 1, limit 10. Sorts `{ createdAt: -1 }`, skip/limit paginate. Returns `data` and `totalPages` (note: no `total`/`page` returned) |
| findById | `(id) => Promise<IProduct|null>` | `findById` |
| update | `(id, data) => Promise<IProduct|null>` | `findByIdAndUpdate(id, data, { new: true, runValidators: true })` |
| delete | `(id) => Promise<IProduct|null>` | `findByIdAndDelete` |

## Important logic
- `findAll` return shape differs from ActivityRepository — only `{ data, totalPages }`.

## Relationships
- Wraps `Product` model. No populate calls.
