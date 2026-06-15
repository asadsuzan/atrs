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
    await auditLogService.logEvent('CREATE', 'PRODUCT', product._id.toString(), product.name, 'Added a new product', { id: user.id });
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
      await auditLogService.logEvent('UPDATE', 'PRODUCT', product._id.toString(), product.name, 'Updated product details', { id: user.id });
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
      `&request[fields][tags]=1&request[fields][short_description]=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from WordPress.org API');
    const data: any = await response.json();
    return data.plugins || [];
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

  async importFromWpOrg(username: string, slugs: string[], user: AuthUser): Promise<any> {
    const plugins = await this.fetchWpOrgPlugins(username);
    const toImport = plugins.filter((p: any) => slugs.includes(p.slug));

    const created: any[] = [];
    const updated: any[] = [];
    const errors: string[] = [];

    for (const plugin of toImport) {
      const tags: string[] = Object.keys(plugin.tags || {});
      const isBlock = tags.some(t =>
        ['block', 'blocks', 'gutenberg', 'gutenberg-blocks', 'gutenberg-block'].includes(t.toLowerCase())
      );
      const wpData = {
        name: plugin.name,
        description: plugin.short_description || '',
        category: (isBlock ? 'block' : 'plugin') as IProduct['category'],
        wpOrgSlug: plugin.slug,
        icon: plugin.icons?.['2x'] || plugin.icons?.['1x'] || '',
        banner: plugin.banners?.high || plugin.banners?.low || '',
      };

      try {
        const existing = await Product.findOne({ ownerId: user.id, wpOrgSlug: plugin.slug });
        if (existing) {
          const product = await this.repository.update(existing._id.toString(), wpData);
          if (product) {
            await auditLogService.logEvent('UPDATE', 'PRODUCT', product._id.toString(), product.name, 'Updated product from WordPress.org import', { id: user.id });
            updated.push(product);
          }
        } else {
          const product = await this.createProduct({
            ...wpData,
            githubUrl: `https://wordpress.org/plugins/${plugin.slug}`,
          }, user);
          created.push(product);
        }
      } catch (err: any) {
        errors.push(`${plugin.slug}: ${err.message}`);
      }
    }

    return { created, updated, errors };
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
      await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product', { id: user.id });
      deleteMediaFiles([product.icon, product.banner]);
    }
    return product;
  }

  /** Audit log + product media cleanup after a transactional cascade commit. */
  private async afterDeleteCleanup(id: string, product: IProduct, user: AuthUser): Promise<void> {
    await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product', { id: user.id });
    // Product icon/banner files.
    deleteMediaFiles([product.icon, product.banner]);
    // Best-effort cleanup of media referenced by the now-deleted marketing doc
    // is skipped here because the doc is already removed in the transaction;
    // file orphans are tolerable and never block the delete.
  }
}
