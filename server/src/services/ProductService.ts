import { ProductRepository } from '../repositories/ProductRepository';
import { IProduct } from '../models/Product';
import slugify from 'slugify';
import { AuditLogService } from './AuditLogService';

const auditLogService = new AuditLogService();

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async createProduct(data: any): Promise<IProduct> {
    const slug = slugify(data.name, { lower: true, strict: true });
    const product = await this.repository.create({ ...data, slug });
    await auditLogService.logEvent('CREATE', 'PRODUCT', product._id.toString(), product.name, 'Added a new product');
    return product;
  }

  async getProducts(query: any): Promise<any> {
    const filter: any = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.status) {
      filter.status = query.status;
    }
    const options = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10
    };
    return await this.repository.findAll(filter, options);
  }

  async getProductById(id: string): Promise<IProduct | null> {
    return await this.repository.findById(id);
  }

  async updateProduct(id: string, data: any): Promise<IProduct | null> {
    if (data.name) {
      data.slug = slugify(data.name, { lower: true, strict: true });
    }
    const product = await this.repository.update(id, data);
    if (product) {
      await auditLogService.logEvent('UPDATE', 'PRODUCT', product._id.toString(), product.name, 'Updated product details');
    }
    return product;
  }

  async deleteProduct(id: string): Promise<IProduct | null> {
    const product = await this.repository.delete(id);
    if (product) {
      await auditLogService.logEvent('DELETE', 'PRODUCT', product._id.toString(), product.name, 'Deleted a product');
    }
    return product;
  }
}
