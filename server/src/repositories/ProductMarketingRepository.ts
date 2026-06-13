import { ProductMarketing, IProductMarketing } from '../models/ProductMarketing';

export class ProductMarketingRepository {
  async findByProductId(productId: string): Promise<IProductMarketing | null> {
    return await ProductMarketing.findOne({ productId });
  }

  async upsertByProductId(productId: string, data: Partial<IProductMarketing>): Promise<IProductMarketing> {
    return await ProductMarketing.findOneAndUpdate(
      { productId },
      { ...data, productId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async deleteByProductId(productId: string): Promise<boolean> {
    const result = await ProductMarketing.deleteOne({ productId });
    return result.deletedCount > 0;
  }
}
