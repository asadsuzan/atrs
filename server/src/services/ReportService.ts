import { Activity } from '../models/Activity';
import mongoose from 'mongoose';
import { scopeFilter } from '../utils/ownership';
import type { AuthUser } from '../types/auth';

export class ReportService {
  async getMonthlyReport(month: number, year: number, user: AuthUser, productId?: string, startDate?: string, endDate?: string, ownerId?: string) {
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
    // Admins may scope a report to a specific owner; non-admins are already
    // restricted to their own data by scopeFilter.
    if (ownerId && user.role === 'admin') matchStage.ownerId = new mongoose.Types.ObjectId(ownerId);

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

  /**
   * Buckets activities by calendar year+month+type within [start, end] using a
   * single $group aggregation. The $year/$month operators run in the server's
   * local timezone (timezone: undefined) to match the JS Date math used by the
   * callers below. Returns a lookup keyed by `${year}-${month}` -> per-type counts.
   */
  private async groupByMonthAndType(
    start: Date,
    end: Date,
    user: AuthUser,
    productId?: string,
    ownerId?: string
  ): Promise<Map<string, { features: number; improvements: number; bugFixes: number }>> {
    const match: any = scopeFilter(user, { activityDate: { $gte: start, $lte: end } });
    if (productId) match.productId = new mongoose.Types.ObjectId(productId);
    if (ownerId && user.role === 'admin') match.ownerId = new mongoose.Types.ObjectId(ownerId);

    const rows = await Activity.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $year: '$activityDate' }, month: { $month: '$activityDate' }, type: '$type' },
          count: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, { features: number; improvements: number; bugFixes: number }>();
    for (const row of rows) {
      const key = `${row._id.year}-${row._id.month}`;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { features: 0, improvements: 0, bugFixes: 0 };
        map.set(key, bucket);
      }
      if (row._id.type === 'feature') bucket.features += row.count;
      else if (row._id.type === 'improvement') bucket.improvements += row.count;
      else if (row._id.type === 'bug-fix') bucket.bugFixes += row.count;
    }
    return map;
  }

  async getTrendData(months: number = 6, user: AuthUser, productId?: string) {
    const results = [];
    const now = new Date();

    // Overall range spans the earliest month start through the latest month end.
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const counts = await this.groupByMonthAndType(rangeStart, rangeEnd, user, productId);

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      // $month is 1-based; getMonth() is 0-based.
      const bucket = counts.get(`${start.getFullYear()}-${start.getMonth() + 1}`) || { features: 0, improvements: 0, bugFixes: 0 };
      const { features, improvements, bugFixes } = bucket;

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

  async getAnnualReport(year: number, user: AuthUser, productId?: string, ownerId?: string) {
    const months = [];
    let totalFeatures = 0, totalImprovements = 0, totalBugFixes = 0;

    const rangeStart = new Date(year, 0, 1);
    const rangeEnd = new Date(year, 12, 0, 23, 59, 59, 999);
    const counts = await this.groupByMonthAndType(rangeStart, rangeEnd, user, productId, ownerId);

    for (let m = 1; m <= 12; m++) {
      const bucket = counts.get(`${year}-${m}`) || { features: 0, improvements: 0, bugFixes: 0 };
      const { features, improvements, bugFixes } = bucket;

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
