import { ProductRepository } from '../repositories/ProductRepository';
import { IProduct, Product } from '../models/Product';
import { baseSlug, disambiguateSlug } from '../utils/slug';
import { AuditLogService } from './AuditLogService';

const auditLogService = new AuditLogService();

import { ActivityService } from './ActivityService';
import { ProductMarketingService } from './ProductMarketingService';
import { Activity } from '../models/Activity';
import { Version } from '../models/Version';
import { ProductMarketing } from '../models/ProductMarketing';
import { deleteMediaFiles } from '../utils/fileUtils';
import { scopeFilter, assertOwner } from '../utils/ownership';
import { escapeRegex } from '../utils/sanitize';
import type { AuthUser } from '../types/auth';

export type ImportProgress = {
  type: 'info' | 'success' | 'warn' | 'error';
  slug?: string;
  step: string;
  message: string;
  pluginIndex?: number;
  totalPlugins?: number;
};

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Builds a slug for `name` that is unique within `ownerId`'s products.
   * `excludeId` skips the product being updated so it doesn't collide with itself.
   */
  private async uniqueSlugForOwner(name: string, ownerId: string, excludeId?: string): Promise<string> {
    const base = baseSlug(name);
    const filter: any = { ownerId, slug: { $regex: `^${base}(-\\d+)?$` } };
    if (excludeId) filter._id = { $ne: excludeId };
    const taken = new Set<string>(await Product.find(filter).distinct('slug'));
    return disambiguateSlug(base, taken);
  }

  async createProduct(data: any, user: AuthUser): Promise<IProduct> {
    const slug = await this.uniqueSlugForOwner(data.name, user.id);
    const product = await this.repository.create({ ...data, slug, ownerId: user.id });
    await auditLogService.logEvent('CREATE', 'PRODUCT', product._id.toString(), product.name, 'Added a new product', { id: user.id, name: user.name });
    return product;
  }

  async getProducts(query: any, user: AuthUser): Promise<any> {
    const filter: any = scopeFilter(user);
    if (query.search) {
      filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.ownerId && user.role === 'admin') {
      filter.ownerId = query.ownerId;
    }
    const options = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10
    };
    return await this.repository.findAll(filter, options);
  }

  async getProductById(id: string, user: AuthUser): Promise<IProduct | null> {
    const product = await this.repository.findById(id);
    assertOwner(product, user);
    return product;
  }

  async updateProduct(id: string, data: any, user: AuthUser): Promise<IProduct | null> {
    const existing = await this.repository.findById(id);
    assertOwner(existing, user);
    delete data.ownerId; // ownership is not editable through this path
    if (data.name) {
      data.slug = await this.uniqueSlugForOwner(data.name, existing!.ownerId.toString(), id);
    }
    const product = await this.repository.update(id, data);
    if (product) {
      await auditLogService.logEvent('UPDATE', 'PRODUCT', product._id.toString(), product.name, 'Updated product details', { id: user.id, name: user.name });
    }
    return product;
  }

  async bulkDeleteProducts(ids: string[], user: AuthUser): Promise<{ deleted: number; errors: string[] }> {
    let deleted = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await this.deleteProduct(id, user);
        deleted++;
      } catch (err: any) {
        errors.push(`${id}: ${err.message}`);
      }
    }
    return { deleted, errors };
  }

  async fetchWpOrgPlugins(username: string): Promise<any[]> {
    const url =
      `https://api.wordpress.org/plugins/info/1.2/?action=query_plugins` +
      `&request[author]=${encodeURIComponent(username)}` +
      `&request[per_page]=100` +
      `&request[fields][icons]=1&request[fields][banners]=1` +
      `&request[fields][tags]=1&request[fields][short_description]=1` +
      `&request[fields][versions]=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from WordPress.org API');
    const data: any = await response.json();
    return data.plugins || [];
  }

  /**
   * Fetch version tags and their metadata (release date, author, release notes)
   * directly from WordPress.org's Subversion repository using WebDAV.
   * Bypasses WAF blocks that affect Trac browser and Trac RSS.
   */
  private async fetchSvnVersionData(
    slug: string
  ): Promise<{ label: string; releasedAt: Date | null; author: string; notes: string }[]> {
    try {
      const tagsUrl = `https://plugins.svn.wordpress.org/${encodeURIComponent(slug)}/tags/`;

      // 1. Fetch tags list with Depth: 1 to get revision, author and date of each tag folder
      const propBody = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <version-name/>
    <creator-displayname/>
    <creationdate/>
  </prop>
</propfind>`;

      const propRes = await fetch(tagsUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Content-Type': 'text/xml',
          'User-Agent': 'SVN/1.9.5 ATRS/1.0',
        },
        body: propBody,
      });

      if (!propRes.ok) {
        console.warn(`[WP Import] ${slug}: PROPFIND failed with status ${propRes.status}`);
        return [];
      }

      const propText = await propRes.text();
      const tags: { label: string; revision: number; creator: string; created: string }[] = [];
      const responseRegex = /<D:response([\s\S]*?)<\/D:response>/gi;
      let match: RegExpExecArray | null;

      while ((match = responseRegex.exec(propText)) !== null) {
        const block = match[1];
        const hrefMatch = block.match(/<D:href>([^<]+)<\/D:href>/);
        const versionMatch = block.match(/<lp1:version-name>([^<]+)<\/lp1:version-name>/);
        const creatorMatch = block.match(/<lp1:creator-displayname>([^<]+)<\/lp1:creator-displayname>/);
        const createdMatch = block.match(/<lp1:creationdate>([^<]+)<\/lp1:creationdate>/);

        const href = hrefMatch ? hrefMatch[1] : '';
        const rawRev = versionMatch ? versionMatch[1] : '';
        const creator = creatorMatch ? creatorMatch[1] : '';
        const created = createdMatch ? createdMatch[1] : '';

        // Extract label from href (e.g. "/image-viewer/tags/1.0.0/" or "/image-viewer/tags/1.0.0")
        if (href && href !== `/${slug}/tags/` && href !== `/${slug}/tags`) {
          const parts = href.replace(/\/$/, '').split('/');
          const label = parts[parts.length - 1];
          const revision = parseInt(rawRev, 10);
          if (label && label !== 'tags' && !isNaN(revision)) {
            tags.push({ label, revision, creator, created });
          }
        }
      }

      console.log(`[WP Import] ${slug}: Found ${tags.length} tags from SVN PROPFIND`);
      if (tags.length === 0) return [];

      // 2. Fetch comments for all tag revisions in parallel batches (bypasses slow range scans)
      const commentsMap = new Map<number, string>();
      try {
        const uniqueRevisions = Array.from(new Set(tags.map(t => t.revision)));
        const reportUrl = `https://plugins.svn.wordpress.org/${encodeURIComponent(slug)}/`;
        const batchSize = 10;

        for (let i = 0; i < uniqueRevisions.length; i += batchSize) {
          const batch = uniqueRevisions.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (rev) => {
              try {
                const reportBody = `<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:">
  <S:start-revision>${rev}</S:start-revision>
  <S:end-revision>${rev}</S:end-revision>
  <S:path></S:path>
</S:log-report>`;

                const reportRes = await fetch(reportUrl, {
                  method: 'REPORT',
                  headers: {
                    'Content-Type': 'text/xml',
                    'User-Agent': 'SVN/1.9.5 ATRS/1.0',
                  },
                  body: reportBody,
                });

                if (reportRes.ok) {
                  const reportText = await reportRes.text();
                  const commentMatch = reportText.match(/<D:comment>([\s\S]*?)<\/D:comment>/);
                  if (commentMatch) {
                    commentsMap.set(rev, commentMatch[1].trim());
                  }
                }
              } catch (err: any) {
                console.warn(`[WP Import] ${slug}: Failed to fetch comment for revision ${rev}: ${err.message}`);
              }
            })
          );
        }
      } catch (err: any) {
        console.warn(`[WP Import] ${slug}: Parallel SVN comment queries failed: ${err.message}`);
      }

      // 3. Map everything into the final format
      return tags.map(t => {
        const releasedAt = t.created ? new Date(t.created) : null;
        return {
          label: t.label,
          releasedAt: releasedAt && !isNaN(releasedAt.getTime()) ? releasedAt : null,
          author: t.creator || '',
          notes: commentsMap.get(t.revision) || '',
        };
      });
    } catch (err: any) {
      console.error(`[WP Import] ${slug}: fetchSvnVersionData failed:`, err);
      return [];
    }
  }

  /**
   * Fetch the raw readme.txt from the plugin's SVN trunk.
   */
  private async fetchSvnReadme(slug: string): Promise<string> {
    try {
      const res = await fetch(`https://plugins.svn.wordpress.org/${encodeURIComponent(slug)}/trunk/readme.txt`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ATRS/1.0)' },
      });
      if (!res.ok) return '';
      return await res.text();
    } catch {
      return '';
    }
  }

  async wpOrgPreview(username: string, user: AuthUser): Promise<any[]> {
    const plugins = await this.fetchWpOrgPlugins(username);
    const existingSlugs = await Product.find({
      ownerId: user.id,
      wpOrgSlug: { $in: plugins.map((p: any) => p.slug) },
    }).distinct('wpOrgSlug');

    return plugins.map((p: any) => {
      const tags: string[] = Object.keys(p.tags || {});
      const isBlock = tags.some(t =>
        ['block', 'blocks', 'gutenberg', 'gutenberg-blocks', 'gutenberg-block'].includes(t.toLowerCase())
      );
      return {
        slug: p.slug,
        name: p.name,
        shortDescription: p.short_description || '',
        icon: p.icons?.['2x'] || p.icons?.['1x'] || '',
        banner: p.banners?.high || p.banners?.low || '',
        tags,
        category: isBlock ? 'block' : 'plugin',
        alreadyImported: existingSlugs.includes(p.slug),
      };
    });
  }

  async importFromWpOrg(
    username: string,
    slugs: string[],
    user: AuthUser,
    onProgress?: (event: ImportProgress) => void,
    isCancelled?: () => boolean
  ): Promise<any> {
    const emit = (e: ImportProgress) => { if (onProgress) onProgress(e); };
    const cancelled = () => (isCancelled ? isCancelled() : false);

    emit({ type: 'info', step: 'fetch-api', message: `Fetching plugins from WordPress.org for user "${username}"...` });
    console.log(`[WP Import] importFromWpOrg called: username=${username}, slugs=${JSON.stringify(slugs)}`);
    const plugins = await this.fetchWpOrgPlugins(username);
    console.log(`[WP Import] WP API returned ${plugins.length} plugins`);
    const toImport = plugins.filter((p: any) => slugs.includes(p.slug));
    emit({ type: 'info', step: 'fetch-api', message: `WordPress.org API returned ${plugins.length} plugins, ${toImport.length} selected for import` });
    console.log(`[WP Import] ${toImport.length} plugins to import: ${toImport.map((p: any) => p.slug).join(', ')}`);

    const created: any[] = [];
    const updated: any[] = [];
    const errors: string[] = [];

    let wasCancelled = false;
    for (let idx = 0; idx < toImport.length; idx++) {
      // Cancellation is checked between plugins; the in-flight plugin (if any)
      // always finishes so we never leave a half-written product behind.
      if (cancelled()) { wasCancelled = true; break; }

      const plugin = toImport[idx];
      const pctx = { slug: plugin.slug, pluginIndex: idx + 1, totalPlugins: toImport.length };
      const tags = Object.keys(plugin.tags || {});
      const isBlock = tags.some(t =>
        ['block', 'blocks', 'gutenberg', 'gutenberg-blocks', 'gutenberg-block'].includes(t.toLowerCase())
      );

      try {
        // Build version data from SVN WebDAV, and fetch readme in parallel.
        emit({ ...pctx, type: 'info', step: 'fetch-svn', message: `Fetching SVN version tags & readme.txt...` });
        const [tracTags, readme] = await Promise.all([
          this.fetchSvnVersionData(plugin.slug),
          this.fetchSvnReadme(plugin.slug),
        ]);
        emit({ ...pctx, type: 'info', step: 'fetch-svn', message: `Found ${tracTags.length} version tags, readme ${readme ? `fetched (${(readme.length / 1024).toFixed(1)} KB)` : 'not found'}` });

        const wpData = {
          name: plugin.name,
          description: plugin.short_description || '',
          category: (isBlock ? 'block' : 'plugin') as IProduct['category'],
          wpOrgSlug: plugin.slug,
          icon: plugin.icons?.['2x'] || plugin.icons?.['1x'] || '',
          banner: plugin.banners?.high || plugin.banners?.low || '',
          wpReadme: readme,
        };

        const existing = await Product.findOne({ ownerId: user.id, wpOrgSlug: plugin.slug });
        let product: any;
        if (existing) {
          emit({ ...pctx, type: 'info', step: 'db-sync', message: `Updating existing product in database...` });
          product = await this.repository.update(existing._id.toString(), wpData);
          if (product) {
            await auditLogService.logEvent('UPDATE', 'PRODUCT', product._id.toString(), product.name, 'Updated product from WordPress.org import', { id: user.id, name: user.name });
            updated.push(product);
            emit({ ...pctx, type: 'success', step: 'db-sync', message: `Product updated successfully` });
          }
        } else {
          emit({ ...pctx, type: 'info', step: 'db-sync', message: `Creating new product in database...` });
          product = await this.createProduct({
            ...wpData,
            githubUrl: `https://wordpress.org/plugins/${plugin.slug}`,
          }, user);
          created.push(product);
          emit({ ...pctx, type: 'success', step: 'db-sync', message: `Product created successfully` });
        }

        // Sync Version records from Trac tags: create new ones, update existing
        // ones that are missing releasedAt / notes metadata.
        if (product && tracTags.length > 0) {
          emit({ ...pctx, type: 'info', step: 'version-sync', message: `Syncing ${tracTags.length} versions...` });
          const existingVersions = await Version.find({ productId: product._id }).lean();
          const existingByLabel = new Map(existingVersions.map((v: any) => [v.label, v]));
          console.log(`[WP Import] ${plugin.slug}: ${tracTags.length} trac tags, ${existingVersions.length} existing versions`);

          const toInsert: any[] = [];
          const bulkOps: any[] = [];

          for (const tag of tracTags) {
            const existing = existingByLabel.get(tag.label);
            if (!existing) {
              // Brand new version — insert.
              toInsert.push({
                productId: product._id,
                ownerId: product.ownerId,
                label: tag.label,
                notes: tag.notes,
                releasedAt: tag.releasedAt,
                author: tag.author,
              });
            } else if (!existing.releasedAt || !existing.notes || !existing.author) {
              // Existing version missing metadata — update.
              bulkOps.push({
                updateOne: {
                  filter: { _id: existing._id },
                  update: {
                    $set: {
                      ...(tag.releasedAt ? { releasedAt: tag.releasedAt } : {}),
                      ...(tag.notes ? { notes: tag.notes } : {}),
                      ...(tag.author ? { author: tag.author } : {}),
                    },
                  },
                },
              });
            }
          }

          console.log(`[WP Import] ${plugin.slug}: ${toInsert.length} to insert, ${bulkOps.length} to update`);
          if (toInsert.length > 0) {
            await Version.insertMany(toInsert, { ordered: false });
            console.log(`[WP Import] ${plugin.slug}: inserted ${toInsert.length} versions`);
          }
          if (bulkOps.length > 0) {
            await Version.bulkWrite(bulkOps);
            console.log(`[WP Import] ${plugin.slug}: updated ${bulkOps.length} versions`);
          }
          emit({ ...pctx, type: 'success', step: 'version-sync', message: `Versions synced: ${toInsert.length} inserted, ${bulkOps.length} updated` });
        } else {
          emit({ ...pctx, type: 'info', step: 'version-sync', message: `No version tags to sync` });
          console.log(`[WP Import] ${plugin.slug}: skipping version sync (product=${!!product}, tracTags=${tracTags.length})`);
        }

        emit({ ...pctx, type: 'success', step: 'done', message: `✓ Import complete` });
      } catch (err: any) {
        errors.push(`${plugin.slug}: ${err.message}`);
        emit({ ...pctx, type: 'error', step: 'error', message: `✗ Failed: ${err.message}` });
      }
    }

    // If the import was cancelled, roll back every product created in this
    // session (cascading their versions). Products that already existed and
    // were merely *updated* are left untouched — only new rows are removed.
    let rolledBack = 0;
    if (wasCancelled) {
      emit({
        type: 'warn',
        step: 'cancel',
        message: created.length
          ? `Import cancelled — rolling back ${created.length} newly created product(s)...`
          : `Import cancelled — nothing to roll back.`,
      });

      for (let i = 0; i < created.length; i++) {
        const p = created[i];
        const rctx = { slug: p.wpOrgSlug, pluginIndex: i + 1, totalPlugins: created.length };
        emit({ ...rctx, type: 'info', step: 'rollback', message: `Removing created product "${p.name}"...` });
        try {
          await this.deleteProduct(p._id.toString(), user);
          rolledBack++;
          emit({ ...rctx, type: 'success', step: 'rollback', message: `Removed "${p.name}"` });
        } catch (err: any) {
          errors.push(`rollback ${p.wpOrgSlug}: ${err.message}`);
          emit({ ...rctx, type: 'error', step: 'rollback', message: `Failed to remove "${p.name}": ${err.message}` });
        }
      }

      const cancelSummary = `Import cancelled: rolled back ${rolledBack} created, kept ${updated.length} updated, ${errors.length} error(s)`;
      emit({ type: 'warn', step: 'summary', message: cancelSummary });
      // Created rows no longer exist — report them as rolled back, not created.
      return { created: [], updated, errors, cancelled: true, rolledBack };
    }

    const summary = `Import finished: ${created.length} created, ${updated.length} updated, ${errors.length} error(s)`;
    emit({ type: errors.length > 0 ? 'warn' : 'success', step: 'summary', message: summary });

    return { created, updated, errors, cancelled: false, rolledBack: 0 };
  }

  async deleteProduct(id: string, user: AuthUser): Promise<IProduct | null> {
    const existing = await this.repository.findById(id);
    assertOwner(existing, user);

    // Try a transactional cascade first. On a standalone mongod (no replica
    // set) transactions are unsupported and Mongo throws — in that case we fall
    // back to a non-transactional sequential cascade. Either way, errors are
    // surfaced (not silently swallowed) so a half-completed delete is visible.
    try {
      return await this.deleteProductTransactional(id, existing!, user);
    } catch (err: any) {
      if (this.isTransactionUnsupported(err)) {
        console.warn('[ProductService]: transactions unsupported (standalone mongod); falling back to sequential cascade delete.');
        return await this.deleteProductSequential(id, user);
      }
      throw err;
    }
  }

  /** Returns true when the error indicates transactions aren't supported (standalone mongod). */
  private isTransactionUnsupported(err: any): boolean {
    const message: string = err?.message || '';
    const code = err?.code;
    return (
      err?.codeName === 'IllegalOperation' ||
      code === 20 ||
      code === 263 ||
      /Transaction numbers are only allowed on a replica set member or mongos/i.test(message) ||
      /transactions are not supported/i.test(message) ||
      /replica set/i.test(message) ||
      /retryable writes/i.test(message)
    );
  }

  /** Cascade delete inside a Mongoose transaction (requires a replica set). */
  private async deleteProductTransactional(id: string, product: IProduct, user: AuthUser): Promise<IProduct | null> {
    const session = await Product.startSession();
    try {
      await session.withTransaction(async () => {
        await Activity.deleteMany({ productId: id }, { session });
        await Version.deleteMany({ productId: id }, { session });
        await ProductMarketing.deleteMany({ productId: id }, { session });
        await Product.deleteOne({ _id: id }, { session });
      });
    } finally {
      await session.endSession();
    }

    // DB rows are gone and committed; now log + clean up files (best-effort,
    // outside the transaction since the filesystem can't participate in it).
    await this.afterDeleteCleanup(id, product, user);
    return product;
  }

  /**
   * Non-transactional cascade for standalone mongod. Deletes related entities
   * via their services (so media files are cleaned up) in a safe order, then
   * the product. Any failure is surfaced rather than swallowed.
   */
  private async deleteProductSequential(id: string, user: AuthUser): Promise<IProduct | null> {
    const errors: string[] = [];

    // Delete children first so a failure leaves the product (and its known
    // children) rather than orphaning children under a deleted product.
    try {
      const activities = await Activity.find({ productId: id });
      if (activities.length > 0) {
        const activityService = new ActivityService();
        await activityService.bulkDeleteActivities(activities.map(a => a._id.toString()), user);
      }
    } catch (err: any) {
      errors.push(`activities: ${err?.message || err}`);
    }

    try {
      const marketingService = new ProductMarketingService();
      await marketingService.deleteMarketingData(id, user);
    } catch (err: any) {
      errors.push(`marketing: ${err?.message || err}`);
    }

    try {
      await Version.deleteMany({ productId: id });
    } catch (err: any) {
      errors.push(`versions: ${err?.message || err}`);
    }

    if (errors.length > 0) {
      // Surface the cascade failure; the product is intentionally not deleted
      // so the operation is not left half-done silently.
      throw new Error(`Failed to delete related entities for product ${id}: ${errors.join('; ')}`);
    }

    const product = await this.repository.delete(id);
    if (product) {
      await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product', { id: user.id, name: user.name });
      deleteMediaFiles([product.icon, product.banner]);
    }
    return product;
  }

  /** Audit log + product media cleanup after a transactional cascade commit. */
  private async afterDeleteCleanup(id: string, product: IProduct, user: AuthUser): Promise<void> {
    await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product', { id: user.id, name: user.name });
    // Product icon/banner files.
    deleteMediaFiles([product.icon, product.banner]);
    // Best-effort cleanup of media referenced by the now-deleted marketing doc
    // is skipped here because the doc is already removed in the transaction;
    // file orphans are tolerable and never block the delete.
  }
}
