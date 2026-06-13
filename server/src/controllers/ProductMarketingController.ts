import { Request, Response, NextFunction } from 'express';
import { ProductMarketingService } from '../services/ProductMarketingService';

export class ProductMarketingController {
  private service: ProductMarketingService;

  constructor() {
    this.service = new ProductMarketingService();
  }

  getMarketingData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id as string;
      const data = await this.service.getMarketingData(productId, req.user!);
      
      if (!data) {
        // Return an empty template rather than a 404 to make frontend state easier
        return res.json({
          status: 'success',
          data: {
            productId,
            pluginName: '',
            trailerVideo: '',
            tutorialVideo: '',
            wpOrgUrl: '',
            docsUrl: '',
            heroDescription: '',
            thumbnailImage: '',
            problemList: [],
            smarterWayList: [],
            keyFeatures: [],
            allFeatures: [],
            proFeaturesDesc: '',
            demos: [],
            topRatingLink: '',
            screenshots: [],
            faqs: []
          }
        });
      }

      res.status(200).json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  };

  upsertMarketingData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id as string;
      const marketingData = req.body;

      const data = await this.service.upsertMarketingData(productId, marketingData, req.user!);

      res.status(200).json({
        status: 'success',
        data
      });
    } catch (error) {
      next(error);
    }
  };

  deleteMarketingData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const productId = req.params.id as string;
      const success = await this.service.deleteMarketingData(productId, req.user!);

      if (!success) {
        return res.status(404).json({
          status: 'error',
          message: 'Marketing data not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Marketing data deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}
