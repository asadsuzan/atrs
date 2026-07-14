# `server/src/scripts/seedAndMigrate.ts`

**Purpose:** Idempotent startup migration/seed task. Drops a legacy global slug index, dedupes imported activities/versions and rebuilds unique indexes, ensures a single root admin exists (from env vars), and back-fills `ownerId` on legacy ownerless records. Proven from `ensureRootAdmin`, the dedupe aggregations, and the `updateMany` back-fills.
**Language / Size:** TypeScript / 5810 bytes

## Exports
| Name | Kind | Signature / Type | Purpose |
|------|------|------------------|---------|
| `seedAndMigrate` | function (async) | `(): Promise<void>` | Orchestrates the startup migration/seed steps |

## Imports
- Internal: `../models/User` → `User, hashPassword`; `../models/Product` → `Product`; `../models/Activity` → `Activity`; `../models/Version` → `Version`; `../models/ProductMarketing` → `ProductMarketing`
- External: none directly (uses Mongoose models)

## Functions / Classes
**`seedAndMigrate(): Promise<void>`** — orchestrator.
- Steps:
  1. `await dropLegacyProductSlugIndex()`.
  2. `await dedupeImportedData()` (dedupe MUST precede unique-index build — the index can't build while duplicates exist).
  3. `rootAdmin = await ensureRootAdmin()`; if falsy, `return` (no root admin → skip back-fill).
  4. Back-fill: `filter = { ownerId: { $exists: false } }`, `update = { $set: { ownerId: rootAdmin._id } }`; run `updateMany` in parallel via `Promise.all` on Product, Activity, Version, ProductMarketing.
  5. Sum `modifiedCount`s; if `> 0`, log per-collection counts.
- Side effects: DB writes, index drops/builds, console logging.

**`dedupeImportedData(): Promise<void>`** (private) — wrapped in try/catch (warns and skips on error).
- **Activities:** aggregate `$match importSourceKey exists & != null` → `$group by { productId, importSourceKey }` collecting `ids` and `count` → `$match count > 1`. For each group, sort ids as strings (ObjectIds sort by creation time, so `[0]` is oldest = keeper), `deleteMany` the rest; log removed count (with singular/plural wording).
- **Versions:** aggregate `$group by { productId, label }` → `$match count > 1`. For each group: keep `ids[0]`; for the dropped ids, `Activity.updateMany({ versionId: { $in: drop } }, { $set: { versionId: keep } })` to repoint activities onto the survivor, then `Version.deleteMany` the drops; log merged count.
- Finally `await Activity.createIndexes()` to build schema indexes (incl. unique `{ productId, importSourceKey }`) now that duplicates are gone.
- Error handling: catch → `console.warn('[migrate]: Duplicate cleanup / index build skipped:', ...)`.

**`dropLegacyProductSlugIndex(): Promise<void>`** (private) — 
- `Product.collection.indexes()`; find index named `'slug_1'`; if present, `Product.collection.dropIndex('slug_1')` and log. WHY: slugs are now unique per owner (compound `{ ownerId, slug }` created by Mongoose); the old global unique index must go.
- try/catch → warns (collection may not exist on a fresh DB).

**`ensureRootAdmin(): Promise<UserDoc | null>`** (private) — 
- `User.findOne({ isRoot: true })`; if found, return it.
- Else read `ROOT_ADMIN_EMAIL`, `ROOT_ADMIN_PASSWORD`, `ROOT_ADMIN_NAME` (default `'Root Admin'`).
- If email or password missing → warn and return `null` (skips creation + back-fill).
- Else `hashPassword(password)`, `User.create({ name, email: email.toLowerCase().trim(), passwordHash, role: 'admin', status: 'active', isRoot: true })`, log, return the created doc.

## Interfaces / Types / Constants / Enums / Global variables
- None (module-level constants are all local to functions).

## Important logic & design patterns
- Fully idempotent — safe to run every boot; back-fill and dedupe become no-ops once data is clean.
- Order dependency: dedupe before unique-index creation.
- ObjectId natural ordering exploited to deterministically pick the oldest row as the keeper.
- Referential repair: version merges repoint dependent activities before deleting duplicate versions.
- Defensive try/catch around index operations so a fresh/empty DB doesn't fail boot.

## Relationships (who this depends on / who likely consumes it)
- Depends on models: User (+ `hashPassword`), Product, Activity, Version, ProductMarketing.
- Consumed by `app.ts` `bootstrap()` (`await seedAndMigrate().catch(...)` — failures logged, not fatal).

## Lifecycle (when it runs / is instantiated)
- Runs once per successful `bootstrap()` (startup / serverless cold start), after `connectDB` and `loadAppConfigCache`.

## Environment variables
- `ROOT_ADMIN_EMAIL` (required to create root admin), `ROOT_ADMIN_PASSWORD` (required), `ROOT_ADMIN_NAME` (optional; default `'Root Admin'`).
