import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Activity } from '../models/Activity';
import { ProductMarketing } from '../models/ProductMarketing';
import { Version } from '../models/Version';

export const exportAllData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find({});
    const activities = await Activity.find({});
    const marketing = await ProductMarketing.find({});
    const versions = await Version.find({});

    const exportData = {
      exportDate: new Date().toISOString(),
      products,
      activities,
      marketing,
      versions,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="atrs-export.json"');
    res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    next(error);
  }
};
