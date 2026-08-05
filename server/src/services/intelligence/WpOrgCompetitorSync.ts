import { Competitor, type ICompetitor } from '../../models/Competitor';
import { MarketDataService } from './MarketDataService';

/**
 * Syncs WordPress.org metrics for tracked competitors.
 *
 * Two problems with the original are fixed here. It imported `axios`, which is not
 * a dependency of the server package — it only resolved at all by accident, hoisted
 * from the client's node_modules, and would have thrown `MODULE_NOT_FOUND` on any
 * clean or production install. And it wrote to an ad-hoc `CompetitorSnapshot` shape
 * that nothing ever read, so the data it collected was inert.
 *
 * Both concerns now belong to `MarketDataService`, which writes typed
 * `MarketSnapshot` rows that the trend detectors and the competitive matrix
 * actually consume. This file remains as the scheduler's entry point.
 */
export class WpOrgCompetitorSync {
  /** Captures a market snapshot for one competitor. */
  static async syncCompetitor(competitor: ICompetitor): Promise<boolean> {
    if (!competitor.wpOrgSlug) return false;
    try {
      const snapshot = await MarketDataService.captureCompetitor(competitor);
      return snapshot !== null;
    } catch (error) {
      console.error(`[WpOrgCompetitorSync] Failed to sync ${competitor.name}:`, error);
      return false;
    }
  }

  /** Captures snapshots for every active competitor with a WordPress.org slug. */
  static async syncAll(): Promise<{ checked: number; synced: number }> {
    try {
      const competitors = await Competitor.find({
        status: 'active',
        wpOrgSlug: { $exists: true, $ne: '' },
      });

      let synced = 0;
      for (const competitor of competitors) {
        if (await this.syncCompetitor(competitor)) synced++;
        // WordPress.org is a free public service; stay well inside polite limits.
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      return { checked: competitors.length, synced };
    } catch (error) {
      console.error('[WpOrgCompetitorSync] Error in syncAll:', error);
      return { checked: 0, synced: 0 };
    }
  }
}
