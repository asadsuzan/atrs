import { ProductRepository } from '../repositories/ProductRepository';
import { IProduct } from '../models/Product';
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
