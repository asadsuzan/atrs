import { ProductRepository } from '../repositories/ProductRepository';
import { IProduct, Product } from '../models/Product';
import slugify from 'slugify';
import { AuditLogService } from './AuditLogService';

const auditLogService = new AuditLogService();

import { ActivityService } from './ActivityService';
import { ProductMarketingService } from './ProductMarketingService';
import { Activity } from '../models/Activity';
import { Version } from '../models/Version';
import { deleteMediaFiles } from '../utils/fileUtils';
import { scopeFilter, assertOwner } from '../utils/ownership';
import { escapeRegex } from '../utils/sanitize';
import type { AuthUser } from '../types/auth';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async createProduct(data: any, user: AuthUser): Promise<IProduct> {
    const slug = slugify(data.name, { lower: true, strict: true });
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
      data.slug = slugify(data.name, { lower: true, strict: true });
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
        category: isBlock ? 'block' : 'plugin',
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
    const product = await this.repository.delete(id);
    if (product) {
      await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product', { id: user.id });

      deleteMediaFiles([product.icon, product.banner]);

      try {
        const activities = await Activity.find({ productId: id });
        if (activities.length > 0) {
          const activityService = new ActivityService();
          await activityService.bulkDeleteActivities(activities.map(a => a._id.toString()), user);
        }
      } catch (err) {
        console.error('Error deleting related activities', err);
      }

      try {
        const marketingService = new ProductMarketingService();
        await marketingService.deleteMarketingData(id, user).catch(() => {});
      } catch (err) {}

      try {
        await Version.deleteMany({ productId: id });
      } catch (err) {}
    }
    return product;
  }
}
