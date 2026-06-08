import { Activity } from '../models/Activity';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

export class ReportService {
  async getMonthlyReport(month: number, year: number, productId?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const matchStage: any = {
      activityDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (productId) {
      matchStage.productId = new mongoose.Types.ObjectId(productId);
    }

    const activities = await Activity.find(matchStage).populate('productId').sort({ activityDate: -1 });

    const summary = {
      products: 0,
      features: 0,
      improvements: 0,
      bugFixes: 0,
      totalActivities: activities.length,
    };

    const productsMap = new Map<string, any>();

    activities.forEach((act: any) => {
      const pId = act.productId._id.toString();
      
      if (!productsMap.has(pId)) {
        productsMap.set(pId, {
          product: act.productId,
          activities: [],
          counts: {
            features: 0,
            improvements: 0,
            bugFixes: 0,
          }
        });
      }

      const pData = productsMap.get(pId);
      pData.activities.push(act);

      if (act.type === 'feature') {
        summary.features++;
        pData.counts.features++;
      } else if (act.type === 'improvement') {
        summary.improvements++;
        pData.counts.improvements++;
      } else if (act.type === 'bug-fix') {
        summary.bugFixes++;
        pData.counts.bugFixes++;
      }
    });

    summary.products = productsMap.size;

    return {
      summary,
      products: Array.from(productsMap.values()),
    };
  }
}
