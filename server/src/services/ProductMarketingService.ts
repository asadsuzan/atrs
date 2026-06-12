import { ProductMarketingRepository } from '../repositories/ProductMarketingRepository';
import { IProductMarketing } from '../models/ProductMarketing';
import { deleteMediaFiles } from '../utils/fileUtils';

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
    const data = await this.repository.findByProductId(productId);
    if (data) {
      const mediaUrls: (string | undefined)[] = [
        data.trailerVideo,
        data.tutorialVideo,
        data.thumbnailImage,
      ];
      data.keyFeatures?.forEach((kf: any) => mediaUrls.push(kf.mediaUrl));
      data.screenshots?.forEach((ss: any) => mediaUrls.push(ss.url));
      data.demos?.forEach((demo: any) => mediaUrls.push(demo.icon));
      
      deleteMediaFiles(mediaUrls.filter(Boolean) as string[]);
    }
    return await this.repository.deleteByProductId(productId);
  }
}
