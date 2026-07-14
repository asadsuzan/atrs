# Boot-Time Seed & Migration

**Source:** `server/src/scripts/seedAndMigrate.ts`, invoked (non-fatal) from
`bootstrap()` in `server/src/app.ts`. Runs on every server start / serverless
cold start.

## Purpose
Bring the database into a consistent, current state at boot: retire legacy
indexes, deduplicate imported data, ensure a root admin exists, and back-fill
ownership on legacy records. Failures are swallowed so a migration hiccup never
blocks the server from serving requests.

## Steps
1. **Drop legacy global slug index.** Remove the old global `slug_1` index on
   `Product` — slugs are now unique **per owner** via the compound
   `{ ownerId, slug }` unique index.
2. **Dedupe imported data.**
   - **Activities** by `{ productId, importSourceKey }` — keep the oldest,
     delete the rest.
   - **Versions** by `{ productId, label }` — keep the survivor and repoint
     orphaned activities' `versionId` to it.
   - Then `Activity.createIndexes()` so the unique index is in place.
3. **Ensure root admin.** `ensureRootAdmin()` upserts an admin/active user from
   `ROOT_ADMIN_EMAIL` / `ROOT_ADMIN_PASSWORD` / `ROOT_ADMIN_NAME` (password
   hashed).
4. **Back-fill ownership.** Set `ownerId = root._id` on any ownerless
   `Product` / `Activity` / `Version` / `ProductMarketing` documents (legacy
   data predating multi-tenant ownership scoping).

## Design notes
- **Non-fatal:** the whole routine is wrapped so an error is logged and boot
  continues (a failed `bootstrap()` nulls its memo so the next request retries —
  see `overview.md §2`).
- **Idempotent:** each step is safe to run repeatedly (drop-if-exists, dedupe by
  key, upsert, conditional back-fill), which is required because it runs on every
  cold start.

## Edge cases & limitations
- Dedupe "keep oldest" is by document age; if two imports produced genuinely
  different content under the same key, the newer one is discarded.
- Ownership back-fill assigns everything ownerless to the root admin — there is
  no attempt to infer the original owner.

## Source references
- `server/src/scripts/seedAndMigrate.ts` (`ensureRootAdmin`).
- Compound index defined on `server/src/models/Product.ts`.
