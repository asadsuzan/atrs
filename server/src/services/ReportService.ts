import { Activity } from '../models/Activity';
import mongoose from 'mongoose';
import { scopeFilter } from '../utils/ownership';
import type { AuthUser } from '../types/auth';

export class ReportService {
  async getMonthlyReport(month: number, year: number, user: AuthUser, productId?: string, startDate?: string, endDate?: string) {
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const matchStage: any = scopeFilter(user, { activityDate: { $gte: start, $lte: end } });
    if (productId) matchStage.productId = new mongoose.Types.ObjectId(productId);

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
      if (!act.productId) return; // product was removed; skip orphaned activity
      const pId = act.productId._id.toString();
      if (!productsMap.has(pId)) {
        productsMap.set(pId, { product: act.productId, activities: [], counts: { features: 0, improvements: 0, bugFixes: 0 } });
      }
      const pData = productsMap.get(pId);
      pData.activities.push(act);
      if (act.type === 'feature') { summary.features++; pData.counts.features++; }
      else if (act.type === 'improvement') { summary.improvements++; pData.counts.improvements++; }
      else if (act.type === 'bug-fix') { summary.bugFixes++; pData.counts.bugFixes++; }
    });

    summary.products = productsMap.size;
    return { summary, products: Array.from(productsMap.values()) };
  }

  async getTrendData(months: number = 6, user: AuthUser, productId?: string) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const filter: any = scopeFilter(user, { activityDate: { $gte: start, $lte: end } });
      if (productId) filter.productId = new mongoose.Types.ObjectId(productId);

      const [features, improvements, bugFixes] = await Promise.all([
        Activity.countDocuments({ ...filter, type: 'feature' }),
        Activity.countDocuments({ ...filter, type: 'improvement' }),
        Activity.countDocuments({ ...filter, type: 'bug-fix' }),
      ]);

      results.push({
        month: start.toLocaleString('default', { month: 'short' }),
        year: start.getFullYear(),
        label: `${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()}`,
        features,
        improvements,
        bugFixes,
        total: features + improvements + bugFixes,
      });
    }

    return results;
  }

  async getAnnualReport(year: number, user: AuthUser, productId?: string) {
    const months = [];
    let totalFeatures = 0, totalImprovements = 0, totalBugFixes = 0;

    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      const filter: any = scopeFilter(user, { activityDate: { $gte: start, $lte: end } });
      if (productId) filter.productId = new mongoose.Types.ObjectId(productId);

      const [features, improvements, bugFixes] = await Promise.all([
        Activity.countDocuments({ ...filter, type: 'feature' }),
        Activity.countDocuments({ ...filter, type: 'improvement' }),
        Activity.countDocuments({ ...filter, type: 'bug-fix' }),
      ]);

      totalFeatures += features;
      totalImprovements += improvements;
      totalBugFixes += bugFixes;

      months.push({
        month: m,
        label: new Date(year, m - 1, 1).toLocaleString('default', { month: 'long' }),
        features, improvements, bugFixes,
        total: features + improvements + bugFixes,
      });
    }

    return {
      year,
      summary: { features: totalFeatures, improvements: totalImprovements, bugFixes: totalBugFixes, total: totalFeatures + totalImprovements + totalBugFixes },
      months,
    };
  }
}
