import { ProductRepository } from '../repositories/ProductRepository';
import { IProduct } from '../models/Product';
import slugify from 'slugify';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async createProduct(data: any): Promise<IProduct> {
    const slug = slugify(data.name, { lower: true, strict: true });
    return await this.repository.create({ ...data, slug });
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
    return await this.repository.update(id, data);
  }

  async deleteProduct(id: string): Promise<IProduct | null> {
    return await this.repository.delete(id);
  }
}
