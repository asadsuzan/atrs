import { ProductMarketingRepository } from '../repositories/ProductMarketingRepository';
import { IProductMarketing } from '../models/ProductMarketing';

export class ProductMarketingService {
  private repository: ProductMarketingRepository;

  constructor() {
    this.repository = new ProductMarketingRepository();
  }

  async getMarketingData(productId: string): Promise<IProductMarketing | null> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return await this.repository.findByProductId(productId);
  }

  async upsertMarketingData(productId: string, data: Partial<IProductMarketing>): Promise<IProductMarketing> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return await this.repository.upsertByProductId(productId, data);
  }

  async deleteMarketingData(productId: string): Promise<boolean> {
    if (!productId) {
      throw new Error('Product ID is required');
    }
    return await this.repository.deleteByProductId(productId);
  }
}
