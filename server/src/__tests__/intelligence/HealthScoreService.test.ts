import { describe, it, expect } from 'vitest';
import { HealthScoreService } from '../../services/intelligence/HealthScoreService';

/**
 * Tests for the health-score normalisers.
 *
 * Several expectations here changed deliberately when the normalisers were
 * rewritten. The originals encoded behaviour that was measuring nothing —
 * `releaseHealth` returned only 100 or 50, `featureVelocity` awarded a free 50 for
 * shipping nothing at all, and period length was ignored so a monthly score reached
 * 100 far more easily than a daily one. Each test below states the curve it is
 * pinning so an accidental change to a threshold fails loudly.
 */
describe('HealthScoreService normalisers', () => {
  describe('normalizeBugHealth', () => {
    it('is 100 with no open defects', () => {
      expect(HealthScoreService.normalizeBugHealth({ openCritical: 0, openHigh: 0 })).toBe(100);
    });

    it('weights criticals far more heavily than highs', () => {
      // 1 critical (-20) + 2 high (-14) = 66. Criticals dominate because any one of
      // them is release-blocking on its own.
      expect(HealthScoreService.normalizeBugHealth({ openCritical: 1, openHigh: 2 })).toBe(66);
    });

    it('counts medium-severity defects at a small weight', () => {
      expect(HealthScoreService.normalizeBugHealth({ openCritical: 0, openHigh: 0, openMedium: 5 })).toBe(90);
    });

    it('deducts additionally for a severe defect left open a long time', () => {
      const fresh = HealthScoreService.normalizeBugHealth({
        openCritical: 0,
        openHigh: 1,
        oldestOpenSevereDays: 5,
      });
      const stale = HealthScoreService.normalizeBugHealth({
        openCritical: 0,
        openHigh: 1,
        oldestOpenSevereDays: 200,
      });
      // Age is a distinct signal from count: the same one bug, ignored for months,
      // says something about triage that the count alone cannot.
      expect(stale).toBeLessThan(fresh);
      expect(fresh).toBe(93);
      expect(stale).toBe(78);
    });

    it('floors at 0', () => {
      expect(HealthScoreService.normalizeBugHealth({ openCritical: 10, openHigh: 0 })).toBe(0);
    });
  });

  describe('normalizeReleaseHealth', () => {
    it('is neutral when there is no release history to judge', () => {
      // A product that has never shipped is an unknown, not a failure.
      expect(HealthScoreService.normalizeReleaseHealth({ releasesInPeriod: 0, daysSinceLastRelease: null })).toBe(50);
    });

    it('rewards a recent release with an established cadence', () => {
      expect(
        HealthScoreService.normalizeReleaseHealth({
          releasesInPeriod: 1,
          totalReleases: 8,
          daysSinceLastRelease: 5,
        }),
      ).toBe(100);
    });

    it('degrades as the last release recedes', () => {
      const scores = [10, 60, 120, 200, 400].map((days) =>
        HealthScoreService.normalizeReleaseHealth({
          releasesInPeriod: 0,
          totalReleases: 8,
          daysSinceLastRelease: days,
        }),
      );
      // Strictly decreasing — the old binary version could not express this at all.
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThan(scores[i - 1]);
      }
      // A year dormant scores 0 rather than the old 50: WordPress.org treats a plugin
      // untouched for a year as potentially abandoned.
      expect(scores[scores.length - 1]).toBe(0);
    });

    it('penalises completed work left unreleased', () => {
      const withBacklog = HealthScoreService.normalizeReleaseHealth({
        releasesInPeriod: 1,
        totalReleases: 8,
        daysSinceLastRelease: 5,
        unreleasedVersions: 2,
      });
      expect(withBacklog).toBe(90);
    });
  });

  describe('normalizeFeatureVelocity', () => {
    it('is 0 when nothing shipped', () => {
      // The original returned 50 here, awarding half marks for no delivery at all.
      expect(HealthScoreService.normalizeFeatureVelocity({ newFeatures: 0, improvements: 0 })).toBe(0);
    });

    it('normalises by period length so periods are comparable', () => {
      // The same volume over a week is a much stronger pace than over a month, and
      // the score has to reflect that. The original ignored period length entirely.
      const weekly = HealthScoreService.normalizeFeatureVelocity({ newFeatures: 1, improvements: 0 }, 7);
      const monthly = HealthScoreService.normalizeFeatureVelocity({ newFeatures: 1, improvements: 0 }, 30);
      expect(weekly).toBeGreaterThan(monthly);
      expect(monthly).toBe(25); // 2 weighted units against the 8-per-month target
    });

    it('weights features above improvements', () => {
      const features = HealthScoreService.normalizeFeatureVelocity({ newFeatures: 2, improvements: 0 }, 30);
      const improvements = HealthScoreService.normalizeFeatureVelocity({ newFeatures: 0, improvements: 2 }, 30);
      expect(features).toBe(improvements * 2);
    });

    it('caps at 100', () => {
      expect(HealthScoreService.normalizeFeatureVelocity({ newFeatures: 5, improvements: 5 }, 7)).toBe(100);
    });
  });

  describe('normalizeIssueResolution', () => {
    it('is 100 when nothing was reported', () => {
      expect(HealthScoreService.normalizeIssueResolution({ resolvedInPeriod: 0, createdInPeriod: 0 })).toBe(100);
      expect(HealthScoreService.normalizeIssueResolution({ resolvedInPeriod: 5, createdInPeriod: 0 })).toBe(100);
    });

    it('is the resolved-to-reported ratio', () => {
      expect(HealthScoreService.normalizeIssueResolution({ resolvedInPeriod: 5, createdInPeriod: 10 })).toBe(50);
    });

    it('caps at 100 when clearing backlog faster than it arrives', () => {
      expect(HealthScoreService.normalizeIssueResolution({ resolvedInPeriod: 15, createdInPeriod: 10 })).toBe(100);
    });
  });

  describe('normalizeProductActivity', () => {
    it('measures activity independently of feature velocity', () => {
      // This component used to be assigned `featureVelocity` verbatim, so it carried
      // no information of its own while still consuming its configured weight. It now
      // counts bug-fix work, which feature velocity deliberately excludes.
      const fixesOnly = HealthScoreService.normalizeProductActivity(
        { total: 6, bugFixes: 6 },
        { releasesInPeriod: 1 },
        30,
      );
      const velocityForSameWork = HealthScoreService.normalizeFeatureVelocity(
        { newFeatures: 0, improvements: 0 },
        30,
      );
      expect(velocityForSameWork).toBe(0);
      expect(fixesOnly).toBeGreaterThan(0);
    });

    it('credits shipping most heavily', () => {
      const shipped = HealthScoreService.normalizeProductActivity({ total: 4, bugFixes: 2 }, { releasesInPeriod: 1 }, 30);
      const notShipped = HealthScoreService.normalizeProductActivity({ total: 4, bugFixes: 2 }, { releasesInPeriod: 0 }, 30);
      expect(shipped).toBeGreaterThan(notShipped);
    });
  });

  describe('normalizeChangelogQuality', () => {
    it('is neutral before anything has been released', () => {
      expect(
        HealthScoreService.normalizeChangelogQuality({
          releasedVersions: 0,
          coveragePercent: null,
          descriptionRate: null,
        }),
      ).toBe(50);
    });

    it('is driven mainly by how many releases are documented at all', () => {
      // This replaces a hardcoded constant 80, which meant the component reported the
      // same value for a meticulously documented product and an undocumented one.
      const fullyDocumented = HealthScoreService.normalizeChangelogQuality({
        releasedVersions: 10,
        coveragePercent: 100,
        descriptionRate: 100,
      });
      const undocumented = HealthScoreService.normalizeChangelogQuality({
        releasedVersions: 10,
        coveragePercent: 0,
        descriptionRate: 0,
      });
      expect(fullyDocumented).toBe(100);
      expect(undocumented).toBe(0);
    });

    it('weights coverage above description depth', () => {
      const coveredButTerse = HealthScoreService.normalizeChangelogQuality({
        releasedVersions: 10,
        coveragePercent: 100,
        descriptionRate: 0,
      });
      const describedButPatchy = HealthScoreService.normalizeChangelogQuality({
        releasedVersions: 10,
        coveragePercent: 0,
        descriptionRate: 100,
      });
      // An undescribed entry still tells a user something changed; a missing entry
      // tells them nothing.
      expect(coveredButTerse).toBeGreaterThan(describedButPatchy);
    });
  });
});
