import { User, hashPassword } from '../models/User';
import { Product } from '../models/Product';
import { Activity } from '../models/Activity';
import { Version } from '../models/Version';
import { ProductMarketing } from '../models/ProductMarketing';

/**
 * Idempotent startup task:
 *  1. Ensure a single root admin exists (created from ROOT_ADMIN_* env vars).
 *  2. Back-fill ownerId = rootAdminId on any pre-existing ownerless records.
 *
 * Safe to run on every boot; once everything is owned, step 2 is a no-op.
 */
export async function seedAndMigrate(): Promise<void> {
  await dropLegacyProductSlugIndex();
  // Clean up any duplicate imported entries left by earlier concurrent imports,
  // THEN (re)build the unique index that prevents them recurring. Order matters:
  // the unique index can't build while duplicates still exist.
  await dedupeImportedData();

  const rootAdmin = await ensureRootAdmin();
  if (!rootAdmin) return;

  const ownerId = rootAdmin._id;
  const filter = { ownerId: { $exists: false } };
  const update = { $set: { ownerId } };

  const [products, activities, versions, marketing] = await Promise.all([
    Product.updateMany(filter, update),
    Activity.updateMany(filter, update),
    Version.updateMany(filter, update),
    ProductMarketing.updateMany(filter, update),
  ]);

  const total =
    products.modifiedCount + activities.modifiedCount + versions.modifiedCount + marketing.modifiedCount;
  if (total > 0) {
    console.log(
      `[migrate]: Assigned root admin as owner of ${products.modifiedCount} products, ` +
        `${activities.modifiedCount} activities, ${versions.modifiedCount} versions, ` +
        `${marketing.modifiedCount} marketing records.`
    );
  }
}

/**
 * Removes duplicate rows created by earlier concurrent/overlapping imports and
 * ensures the unique indexes that prevent them from coming back:
 *   - Activities sharing the same (productId, importSourceKey): keep the oldest,
 *     delete the rest.
 *   - Versions sharing the same (productId, label): keep the oldest, repoint any
 *     activities to the survivor, delete the rest.
 * Idempotent — a no-op once the data is clean.
 */
async function dedupeImportedData(): Promise<void> {
  try {
    // --- Duplicate imported activities ---
    const actDups = await Activity.aggregate([
      { $match: { importSourceKey: { $exists: true, $ne: null } } },
      { $group: { _id: { p: '$productId', k: '$importSourceKey' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    let removedActs = 0;
    for (const g of actDups) {
      // ObjectIds sort by creation time, so [0] is the oldest — the keeper.
      const ids = (g.ids as any[]).map((x) => x.toString()).sort();
      const drop = ids.slice(1);
      if (drop.length) {
        await Activity.deleteMany({ _id: { $in: drop } });
        removedActs += drop.length;
      }
    }
    if (removedActs > 0) {
      console.log(`[migrate]: Removed ${removedActs} duplicate imported changelog entr${removedActs === 1 ? 'y' : 'ies'}.`);
    }

    // --- Duplicate versions (repoint activities before deleting) ---
    const verDups = await Version.aggregate([
      { $group: { _id: { p: '$productId', l: '$label' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    let mergedVers = 0;
    for (const g of verDups) {
      const ids = (g.ids as any[]).map((x) => x.toString()).sort();
      const keep = ids[0];
      const drop = ids.slice(1);
      if (drop.length) {
        await Activity.updateMany({ versionId: { $in: drop } }, { $set: { versionId: keep } });
        await Version.deleteMany({ _id: { $in: drop } });
        mergedVers += drop.length;
      }
    }
    if (mergedVers > 0) {
      console.log(`[migrate]: Merged ${mergedVers} duplicate version row(s).`);
    }

    // Now that duplicates are gone, ensure the schema indexes (incl. the new
    // unique { productId, importSourceKey }) are built.
    await Activity.createIndexes();
  } catch (err: any) {
    console.warn('[migrate]: Duplicate cleanup / index build skipped:', err?.message || err);
  }
}

/**
 * Older builds declared Product.slug as globally unique (index `slug_1`).
 * Slugs are now unique per owner, so drop the legacy global index if present;
 * the new compound index `{ ownerId, slug }` is created automatically by Mongoose.
 */
async function dropLegacyProductSlugIndex(): Promise<void> {
  try {
    const indexes = await Product.collection.indexes();
    const legacy = indexes.find((idx) => idx.name === 'slug_1');
    if (legacy) {
      await Product.collection.dropIndex('slug_1');
      console.log('[migrate]: Dropped legacy global Product.slug index (now unique per owner).');
    }
  } catch (err: any) {
    // Collection may not exist yet on a fresh DB — nothing to drop.
    console.warn('[migrate]: Could not check/drop legacy slug index:', err?.message || err);
  }
}

async function ensureRootAdmin() {
  const existing = await User.findOne({ isRoot: true });
  if (existing) return existing;

  const email = process.env.ROOT_ADMIN_EMAIL;
  const password = process.env.ROOT_ADMIN_PASSWORD;
  const name = process.env.ROOT_ADMIN_NAME || 'Root Admin';

  if (!email || !password) {
    console.warn(
      '[migrate]: No root admin found and ROOT_ADMIN_EMAIL / ROOT_ADMIN_PASSWORD are not set. ' +
        'Skipping root admin creation and ownership back-fill.'
    );
    return null;
  }

  const passwordHash = await hashPassword(password);
  const rootAdmin = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    status: 'active',
    isRoot: true,
  });
  console.log(`[migrate]: Created root admin account (${rootAdmin.email}).`);
  return rootAdmin;
}
