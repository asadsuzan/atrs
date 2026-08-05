import mongoose from 'mongoose';
import type { ISignal } from '../../models/Signal';
import { SignalEngine } from './SignalEngine';
import { RoadmapEngine } from './RoadmapEngine';
import { CompetitorIntelService, type CompetitiveMatrix } from './CompetitorIntelService';
import { MarketDataService } from './MarketDataService';
import type { SignalContext } from './signals/context';
import { fmtInt, fmtPct } from './signals/types';
import type { IRoadmapItem } from '../../models/RoadmapItem';

/**
 * The market standout scorecard.
 *
 * A product standing out on WordPress.org is not one thing. It requires being
 * *found* (discoverability), being *chosen* once found (reputation and
 * positioning), *working* once installed (product health), being *kept*
 * (traction), being *trusted over time* (release discipline), and being *better
 * than the alternative* (competitive position). A single "health score" collapses
 * all six into one number that tells you nothing about which to fix.
 *
 * So each pillar is scored from its own real sub-metrics, each with a documented
 * normalisation curve. Scores are computed from measurements rather than by
 * deducting points for signals — signals *explain* a score, they don't define it.
 * A pillar with no data reports `null` rather than a misleading zero.
 */

export type PillarKey =
  | 'productHealth'
  | 'discoverability'
  | 'reputation'
  | 'marketTraction'
  | 'releaseDiscipline'
  | 'competitivePosition';

/** One measured input to a pillar. */
export interface SubMetric {
  key: string;
  label: string;
  /** Raw measured value, formatted for display. */
  value: string;
  /** Normalised 0–100, or null when unmeasurable. */
  score: number | null;
  weight: number;
  /** The normalisation rule applied, so the score is auditable. */
  basis: string;
}

export interface Pillar {
  key: PillarKey;
  label: string;
  /** Why this pillar matters commercially. */
  premise: string;
  /** 0–100, or null when nothing in it could be measured. */
  score: number | null;
  weight: number;
  subMetrics: SubMetric[];
  /** Active signals attributable to this pillar. */
  signalCodes: string[];
  /** Count of unmeasurable sub-metrics, so thin coverage is visible. */
  unmeasuredCount: number;
}

/** The single highest-value action available, with its justification. */
export interface Lever {
  rank: number;
  title: string;
  pillar: PillarKey;
  /** Points the weakest pillar could recover. */
  potentialGain: number;
  /** RICE score of the roadmap item, when one exists. */
  riceScore: number | null;
  roadmapItemId: string | null;
  reasoning: string;
  effortWeeks: number | null;
}

export interface StandoutScorecard {
  productId: string;
  productName: string;
  /** Weighted composite across measurable pillars, 0–100. */
  overallScore: number;
  /** Share of the possible sub-metrics we could actually measure, 0–100. */
  dataCoverage: number;
  /** Stated plainly when coverage is low, so the score isn't over-trusted. */
  coverageCaveat?: string;
  pillars: Pillar[];
  /** Ranked highest-leverage actions. */
  levers: Lever[];
  /** Things measurably going well, for balance. */
  strengths: string[];
  generatedAt: Date;
}

/**
 * Pillar weights.
 *
 * Product health and reputation carry the most weight because they gate
 * everything else: a plugin that breaks or is badly reviewed cannot be rescued by
 * good marketing. Discoverability is weighted next because on WordPress.org it is
 * the primary growth channel. Competitive position is weighted lowest not because
 * it matters least but because it is the least reliably measurable — it depends on
 * the user having tracked the right competitors.
 */
const PILLAR_WEIGHTS: Record<PillarKey, number> = {
  productHealth: 25,
  reputation: 22,
  discoverability: 18,
  marketTraction: 15,
  releaseDiscipline: 12,
  competitivePosition: 8,
};

const PILLAR_META: Record<PillarKey, { label: string; premise: string }> = {
  productHealth: {
    label: 'Product health',
    premise:
      'Defects and security issues cap every other pillar. A plugin that breaks cannot be rescued by good positioning, ' +
      'and a bad experience converts into a permanent public review.',
  },
  discoverability: {
    label: 'Discoverability',
    premise:
      'The WordPress.org directory is the primary acquisition channel for most plugins. Listing quality and search ' +
      'placement decide how many people ever see the product at all.',
  },
  reputation: {
    label: 'Reputation',
    premise:
      'Rating, review volume and support responsiveness are shown beside every search result. They decide whether ' +
      'someone who found the plugin installs it.',
  },
  marketTraction: {
    label: 'Market traction',
    premise:
      'Install growth and retention measure whether the product delivers on what the listing promises. Downloads ' +
      'without retained installs mean acquisition works and the product does not.',
  },
  releaseDiscipline: {
    label: 'Release discipline',
    premise:
      'Shipping cadence is publicly visible through "Last updated" and is read as a proxy for whether the plugin is ' +
      'maintained. It also determines how quickly you can respond to anything else on this scorecard.',
  },
  competitivePosition: {
    label: 'Competitive position',
    premise:
      'Users choose between options. Standing on the metrics shown side by side in the directory decides comparisons ' +
      'at the point of decision.',
  },
};

export class StandoutScorecardService {
  static async generate(
    productId: string | mongoose.Types.ObjectId,
    opts?: { signals?: ISignal[]; context?: SignalContext; includeMatrix?: boolean },
  ): Promise<StandoutScorecard | null> {
    let signals = opts?.signals;
    let context = opts?.context;

    if (!signals || !context) {
      const run = await SignalEngine.run(productId);
      if (!run) return null;
      signals = run.signals;
      context = run.context;
    }

    // The competitive pillar needs the matrix; skip it on fast paths and let the
    // pillar report itself unmeasured rather than blocking on network calls.
    const matrix =
      opts?.includeMatrix === false ? null : await CompetitorIntelService.buildMatrix(productId).catch(() => null);

    const pillars: Pillar[] = [
      this.productHealth(context, signals),
      this.discoverability(context, signals),
      this.reputation(context, signals),
      this.marketTraction(context, signals),
      this.releaseDiscipline(context, signals),
      this.competitivePosition(context, signals, matrix),
    ];

    // Only measurable pillars contribute; weights are renormalised over them so a
    // product with no market link isn't punished for a pillar we couldn't read.
    const measurable = pillars.filter((p) => p.score !== null);
    const totalWeight = measurable.reduce((sum, p) => sum + p.weight, 0);
    const overallScore =
      totalWeight > 0
        ? Math.round(measurable.reduce((sum, p) => sum + (p.score as number) * p.weight, 0) / totalWeight)
        : 0;

    const allSubMetrics = pillars.flatMap((p) => p.subMetrics);
    const measuredSubMetrics = allSubMetrics.filter((m) => m.score !== null);
    const dataCoverage =
      allSubMetrics.length > 0 ? Math.round((measuredSubMetrics.length / allSubMetrics.length) * 100) : 0;

    const board = await RoadmapEngine.getBoard(productId);
    const roadmapItems = [...board.now, ...board.next, ...board.later, ...board.watch];

    return {
      productId: context.productId,
      productName: context.product.name,
      overallScore,
      dataCoverage,
      coverageCaveat:
        dataCoverage < 60
          ? `Only ${dataCoverage}% of the scorecard's inputs could be measured for this product. ` +
            (context.product.wpOrgSlug
              ? 'Scores will sharpen as market snapshot history accumulates and competitors are tracked.'
              : 'Linking a WordPress.org slug would unlock the market, reputation and discoverability inputs.')
          : undefined,
      pillars,
      levers: this.buildLevers(pillars, roadmapItems),
      strengths: this.buildStrengths(signals, pillars),
      generatedAt: context.now,
    };
  }

  // ----------------------------------------------------------------- pillars

  private static productHealth(ctx: SignalContext, signals: ISignal[]): Pillar {
    const isOpen = (s: string) => s === 'open' || s === 'in-progress';
    const openCritical = ctx.issues.filter((i) => isOpen(i.status) && i.severity === 'critical').length;
    const openHigh = ctx.issues.filter((i) => isOpen(i.status) && i.severity === 'high').length;

    const thirtyDaysAgo = ctx.now.getTime() - 30 * 86_400_000;
    const created = ctx.issues.filter((i) => new Date(i.createdAt).getTime() >= thirtyDaysAgo).length;
    const resolved = ctx.issues.filter((i) => i.resolvedAt && new Date(i.resolvedAt).getTime() >= thirtyDaysAgo).length;

    const aging = ctx.issues.filter(
      (i) =>
        isOpen(i.status) &&
        (i.severity === 'critical' || i.severity === 'high') &&
        (ctx.now.getTime() - new Date(i.createdAt).getTime()) / 86_400_000 > 30,
    ).length;

    const vulns = ctx.productSeries[0]?.vulnerabilitiesPresent ?? null;

    const subMetrics: SubMetric[] = [
      {
        key: 'openCritical',
        label: 'Open critical issues',
        value: fmtInt(openCritical),
        // Any critical bug is release-blocking, so the curve is steep: one costs
        // 40 points, three zeroes the metric.
        score: Math.max(0, 100 - openCritical * 40),
        weight: 35,
        basis: '100 points minus 40 per open critical issue. Any critical defect is release-blocking.',
      },
      {
        key: 'openHigh',
        label: 'Open high-severity issues',
        value: fmtInt(openHigh),
        score: Math.max(0, 100 - openHigh * 10),
        weight: 15,
        basis: '100 points minus 10 per open high-severity issue.',
      },
      {
        key: 'agingSevere',
        label: 'Severe issues older than 30 days',
        value: fmtInt(aging),
        score: Math.max(0, 100 - aging * 20),
        weight: 20,
        basis: '100 points minus 20 per severe issue left open beyond 30 days. Age signals triage quality independently of count.',
      },
      {
        key: 'resolutionRatio',
        label: 'Resolution rate (30 days)',
        value: created === 0 ? 'no new issues' : `${resolved} resolved / ${created} reported`,
        // No new issues is a clean bill of health, not missing data.
        score: created === 0 ? 100 : Math.min(100, Math.round((resolved / created) * 100)),
        weight: 15,
        basis:
          created === 0
            ? 'No issues reported in 30 days, scored as fully healthy.'
            : 'Issues resolved as a share of issues reported over 30 days, capped at 100.',
      },
      {
        key: 'vulnerabilities',
        label: 'Unpatched security advisories',
        value: vulns === null ? 'unknown' : fmtInt(vulns),
        // Binary by nature: an unpatched advisory is not partially acceptable.
        score: vulns === null ? null : vulns > 0 ? 0 : 100,
        weight: 15,
        basis: 'Zero unpatched advisories scores 100; any unpatched advisory scores 0.',
      },
    ];

    return this.assemble('productHealth', subMetrics, signals, ['stability', 'compliance']);
  }

  private static discoverability(ctx: SignalContext, signals: ISignal[]): Pillar {
    const audit = ctx.listingAudit;
    const ranking = ctx.productSeries[0]?.ranking ?? null;
    const tags = ctx.wpInfo?.tags.length ?? null;

    const subMetrics: SubMetric[] = [
      {
        key: 'listingQuality',
        label: 'Listing quality audit',
        value: audit ? `${audit.score}/100` : 'unknown',
        score: audit ? audit.score : null,
        weight: 60,
        basis: 'Weighted audit of banner, icon, screenshots, description, FAQ, tags, changelog and compatibility headers.',
      },
      {
        key: 'tagUsage',
        label: 'Indexable tags in use',
        value: tags === null ? 'unknown' : `${tags} of 5`,
        // WP.org indexes at most five tags; using all five is the achievable maximum.
        score: tags === null ? null : Math.min(100, Math.round((Math.min(tags, 5) / 5) * 100)),
        weight: 20,
        basis: 'Share of the five tag slots WordPress.org indexes that are in use.',
      },
      {
        key: 'directoryRank',
        label: 'Directory rank',
        value: ranking === null ? 'unknown' : `#${fmtInt(ranking)}`,
        // Rank is log-scaled: moving from #50,000 to #40,000 matters far less
        // than moving from #500 to #400.
        score: ranking === null ? null : rankToScore(ranking),
        weight: 20,
        basis: 'Log-scaled directory rank: top 100 scores 100, around #50,000 scores near 0.',
      },
    ];

    return this.assemble('discoverability', subMetrics, signals, ['discoverability']);
  }

  private static reputation(ctx: SignalContext, signals: ISignal[]): Pillar {
    const info = ctx.wpInfo;
    const snapshot = ctx.productSeries[0];
    const stars = snapshot?.meanStars ?? (info?.rating != null ? info.rating / 20 : null);
    const reviews = info?.numRatings ?? null;
    const installs = info?.activeInstalls ?? null;

    const negShare = snapshot?.ratingHistogram
      ? (() => {
          const h = snapshot.ratingHistogram!;
          const total = h[1] + h[2] + h[3] + h[4] + h[5];
          return total > 0 ? ((h[1] + h[2]) / total) * 100 : null;
        })()
      : null;

    const supportRate =
      info?.supportThreads != null && info.supportThreadsResolved != null && info.supportThreads > 0
        ? (info.supportThreadsResolved / info.supportThreads) * 100
        : null;

    // Reviews per 300 installs is the observed norm for healthy WP.org plugins.
    const expectedReviews = installs !== null && installs >= 200 ? Math.max(3, Math.floor(installs / 300)) : null;

    const subMetrics: SubMetric[] = [
      {
        key: 'meanStars',
        label: 'Mean rating',
        value: stars === null ? 'unknown' : `${stars.toFixed(2)} stars`,
        // Ratings run 1–5, so 1 star is the floor rather than 0.
        score:
          stars === null
            ? null
            : reviews !== null && reviews < 5
              ? null
              : Math.round(((stars - 1) / 4) * 100),
        weight: 35,
        basis:
          reviews !== null && reviews < 5
            ? 'Fewer than 5 reviews — a single rating would swing the average, so this is left unscored.'
            : 'Mean rating mapped from the 1–5 star range onto 0–100.',
      },
      {
        key: 'negativeShare',
        label: 'Share of 1–2 star reviews',
        value: negShare === null ? 'unknown' : fmtPct(negShare),
        // 0% negative scores 100; 40% or more scores 0.
        score: negShare === null ? null : Math.max(0, Math.round(100 - (negShare / 40) * 100)),
        weight: 20,
        basis: '0% negative reviews scores 100; 40% or more scores 0.',
      },
      {
        key: 'reviewVolume',
        label: 'Review volume',
        value:
          reviews === null
            ? 'unknown'
            : expectedReviews === null
              ? `${fmtInt(reviews)} reviews`
              : `${fmtInt(reviews)} of ~${expectedReviews} typical`,
        score:
          reviews === null
            ? null
            : expectedReviews === null
              ? // Under 200 installs there is no meaningful expectation to compare against.
                null
              : Math.min(100, Math.round((reviews / expectedReviews) * 100)),
        weight: 20,
        basis:
          expectedReviews === null
            ? 'Install base too small for a review-volume expectation.'
            : `Reviews against the ~1-per-300-installs norm (${expectedReviews} expected at this size).`,
      },
      {
        key: 'supportResolution',
        label: 'Support thread resolution',
        value: supportRate === null ? 'unknown' : fmtPct(supportRate),
        score: supportRate === null ? null : Math.round(supportRate),
        weight: 25,
        basis: 'Share of recent WordPress.org support threads marked resolved, taken directly as the score.',
      },
    ];

    return this.assemble('reputation', subMetrics, signals, ['reputation', 'support']);
  }

  private static marketTraction(ctx: SignalContext, signals: ISignal[]): Pillar {
    const installs = ctx.wpInfo?.activeInstalls ?? null;
    const installTrend = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 90);
    const downloadTrend = MarketDataService.computeTrend(ctx.productSeries, 'downloaded', 90);

    // Retention proxy: install growth as a share of download growth. Downloads
    // without install growth is the churn signature.
    const retention =
      downloadTrend.delta !== null && downloadTrend.delta > 0 && installTrend.delta !== null
        ? Math.max(0, Math.min(1, installTrend.delta / downloadTrend.delta))
        : null;

    const subMetrics: SubMetric[] = [
      {
        key: 'installBase',
        label: 'Active install base',
        value: fmtInt(installs),
        // Log scale: 10 installs to 100 is the same achievement as 10,000 to
        // 100,000, and a linear scale would score almost every plugin at zero.
        score: installs === null ? null : installsToScore(installs),
        weight: 30,
        basis: 'Log-scaled install base: 100 installs scores ~33, 10,000 scores ~67, 1,000,000 scores 100.',
      },
      {
        key: 'installGrowth',
        label: 'Install trend (90 days)',
        value:
          installTrend.previous === null
            ? 'needs more history'
            : `${installTrend.delta! >= 0 ? '+' : ''}${fmtInt(installTrend.delta)} (${fmtPct(installTrend.pctChange ?? 0)})`,
        // Growth is centred at 50 for flat: +20% or better scores 100, -20% scores 0.
        score:
          installTrend.previous === null || installTrend.pctChange === null
            ? null
            : Math.max(0, Math.min(100, Math.round(50 + (installTrend.pctChange / 20) * 50))),
        weight: 45,
        basis: 'Flat growth scores 50; +20% over 90 days scores 100; -20% scores 0.',
      },
      {
        key: 'retention',
        label: 'Downloads converting to installs',
        value: retention === null ? 'needs more history' : fmtPct(retention * 100),
        score: retention === null ? null : Math.round(retention * 100),
        weight: 25,
        basis: 'Install growth as a share of download growth over 90 days.',
      },
    ];

    return this.assemble('marketTraction', subMetrics, signals, ['traction']);
  }

  private static releaseDiscipline(ctx: SignalContext, signals: ISignal[]): Pillar {
    const released = ctx.versions
      .filter((v) => v.status === 'released' && v.releasedAt)
      .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());

    // WP.org's own timestamp wins when newer — a release shipped outside ATRS counts.
    const lastRelease = [
      released[0]?.releasedAt ? new Date(released[0].releasedAt) : null,
      ctx.wpInfo?.lastUpdated ?? null,
    ]
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const daysSince = lastRelease ? Math.floor((ctx.now.getTime() - lastRelease.getTime()) / 86_400_000) : null;

    const inLast180 = released.filter(
      (v) => (ctx.now.getTime() - new Date(v.releasedAt!).getTime()) / 86_400_000 <= 180,
    ).length;

    const activityByVersion = new Set(ctx.activities.filter((a) => a.versionId).map((a) => String(a.versionId)));
    const documented = released.filter(
      (v) => activityByVersion.has(String(v._id)) || (v.notes && v.notes.trim().length > 20),
    ).length;
    const coverage = released.length > 0 ? (documented / released.length) * 100 : null;

    const subMetrics: SubMetric[] = [
      {
        key: 'recency',
        label: 'Days since last release',
        value: daysSince === null ? 'no releases recorded' : `${daysSince} days`,
        // Thresholds mirror what WordPress.org itself signals to users.
        score: daysSince === null ? null : recencyToScore(daysSince),
        weight: 40,
        basis: 'Within 30 days scores 100; 90 days scores 70; 180 days scores 40; 365 days or more scores 0 — matching the points at which WordPress.org warns users.',
      },
      {
        key: 'frequency',
        label: 'Releases in the last 180 days',
        value: fmtInt(inLast180),
        // Four releases in six months is a healthy maintenance rhythm.
        score: Math.min(100, Math.round((inLast180 / 4) * 100)),
        weight: 30,
        basis: 'Four or more releases in 180 days scores 100.',
      },
      {
        key: 'changelogCoverage',
        label: 'Releases with changelog entries',
        value: coverage === null ? 'no releases recorded' : `${documented} of ${released.length} (${fmtPct(coverage)})`,
        score: coverage === null ? null : Math.round(coverage),
        weight: 30,
        basis: 'Share of released versions carrying changelog entries or release notes.',
      },
    ];

    return this.assemble('releaseDiscipline', subMetrics, signals, ['velocity']);
  }

  private static competitivePosition(
    ctx: SignalContext,
    signals: ISignal[],
    matrix: CompetitiveMatrix | null,
  ): Pillar {
    const comparable = matrix?.verdicts.filter((v) => v.standing !== 'unknown') ?? [];

    const ahead = comparable.filter((v) => v.standing === 'ahead').length;
    const level = comparable.filter((v) => v.standing === 'level').length;

    const ourRow = matrix?.rows.find((r) => r.subject === 'product');
    const rivalRows = matrix?.rows.filter((r) => r.subject === 'competitor') ?? [];

    const installRank =
      ourRow?.activeInstalls != null && rivalRows.length > 0
        ? rivalRows.filter((r) => (r.activeInstalls ?? 0) > (ourRow.activeInstalls ?? 0)).length + 1
        : null;

    const subMetrics: SubMetric[] = [
      {
        key: 'metricStanding',
        label: 'Metrics where you lead or match',
        value:
          comparable.length === 0
            ? matrix && matrix.measuredCount === 0
              ? 'no measurable competitors'
              : 'unknown'
            : `${ahead + level} of ${comparable.length}`,
        // Leading counts full, level counts half — parity is not an advantage.
        score:
          comparable.length === 0
            ? null
            : Math.round(((ahead + level * 0.5) / comparable.length) * 100),
        weight: 60,
        basis: 'Share of comparable directory metrics where you lead (full credit) or match (half credit) the best competitor.',
      },
      {
        key: 'installRank',
        label: 'Install rank within tracked set',
        value:
          installRank === null
            ? 'unknown'
            : `#${installRank} of ${rivalRows.length + 1}`,
        score:
          installRank === null
            ? null
            : Math.round(((rivalRows.length + 1 - installRank) / Math.max(1, rivalRows.length)) * 100),
        weight: 40,
        basis: 'Position by active installs among this product and its tracked competitors.',
      },
    ];

    const pillar = this.assemble('competitivePosition', subMetrics, signals, ['competitive']);

    // Distinguish "no competitors tracked" from "we couldn't measure" — the first
    // is a setup gap the user can close, the second is a data problem.
    if (pillar.score === null && matrix && matrix.measuredCount === 0) {
      pillar.subMetrics[0].basis =
        matrix.unmeasured.length > 0
          ? `No competitor could be measured: ${matrix.unmeasured.map((u) => u.reason).join(' ')}`
          : 'No competitors are tracked. Run discovery to find real WordPress.org plugins competing for the same terms.';
    }

    return pillar;
  }

  // ----------------------------------------------------------------- helpers

  /** Weighted-average assembly, renormalising over measurable sub-metrics only. */
  private static assemble(
    key: PillarKey,
    subMetrics: SubMetric[],
    signals: ISignal[],
    categories: string[],
  ): Pillar {
    const measurable = subMetrics.filter((m) => m.score !== null);
    const totalWeight = measurable.reduce((sum, m) => sum + m.weight, 0);

    return {
      key,
      label: PILLAR_META[key].label,
      premise: PILLAR_META[key].premise,
      score:
        totalWeight > 0
          ? Math.round(measurable.reduce((sum, m) => sum + (m.score as number) * m.weight, 0) / totalWeight)
          : null,
      weight: PILLAR_WEIGHTS[key],
      subMetrics,
      signalCodes: signals.filter((s) => categories.includes(s.category)).map((s) => s.code),
      unmeasuredCount: subMetrics.length - measurable.length,
    };
  }

  /**
   * Ranks the highest-leverage actions available.
   *
   * Leverage is the product of *how much a pillar could improve* and *how cheaply*
   * — a 40-point gap in a heavily weighted pillar fixable in a quarter of a week
   * beats a 60-point gap that takes three weeks. Roadmap items supply the effort
   * and RICE figures, so the two views stay consistent rather than offering
   * contradictory advice.
   */
  private static buildLevers(pillars: Pillar[], roadmapItems: IRoadmapItem[]): Lever[] {
    const pillarByCategory: Record<string, PillarKey> = {
      stability: 'productHealth',
      security: 'productHealth',
      compliance: 'productHealth',
      discoverability: 'discoverability',
      reputation: 'reputation',
      support: 'reputation',
      growth: 'marketTraction',
      process: 'releaseDiscipline',
      tech_debt: 'productHealth',
      feature: 'competitivePosition',
    };

    const gapByPillar = new Map<PillarKey, number>();
    for (const p of pillars) {
      if (p.score === null) continue;
      // Weighted shortfall: points missing, scaled by how much the pillar counts.
      gapByPillar.set(p.key, ((100 - p.score) * p.weight) / 100);
    }

    const candidates = roadmapItems
      .filter((item) => item.status === 'proposed' || item.status === 'accepted')
      .map((item) => {
        const pillar = pillarByCategory[item.category] ?? 'productHealth';
        const gain = gapByPillar.get(pillar) ?? 0;
        const effort = item.rice?.effort ?? 1;
        return {
          item,
          pillar,
          gain,
          // Leverage: recoverable weighted points per person-week.
          leverage: effort > 0 ? gain / effort : gain,
        };
      })
      .filter((c) => c.gain > 0.5)
      .sort((a, b) => b.leverage - a.leverage)
      .slice(0, 5);

    return candidates.map((c, index) => ({
      rank: index + 1,
      title: c.item.title,
      pillar: c.pillar,
      potentialGain: Math.round(c.gain * 10) / 10,
      riceScore: c.item.rice?.score ?? null,
      roadmapItemId: String(c.item._id),
      effortWeeks: c.item.rice?.effort ?? null,
      reasoning:
        `${PILLAR_META[c.pillar].label} is the pillar this addresses, currently leaving ` +
        `${Math.round(c.gain * 10) / 10} weighted points on the table. At ` +
        `${c.item.rice?.effort ?? '?'} person-week(s) of effort this is the best available ratio of ` +
        `recoverable score to work.`,
    }));
  }

  /** Measured positives, so the scorecard isn't purely a list of failings. */
  private static buildStrengths(signals: ISignal[], pillars: Pillar[]): string[] {
    const strengths = signals.filter((s) => s.direction === 'positive').map((s) => s.detail);

    for (const pillar of pillars) {
      if (pillar.score !== null && pillar.score >= 80) {
        strengths.push(`${pillar.label} scores ${pillar.score}/100 — this is a strength to build on rather than defend.`);
      }
    }

    for (const pillar of pillars) {
      const best = pillar.subMetrics.filter((m) => m.score !== null && m.score >= 95);
      for (const m of best.slice(0, 1)) {
        strengths.push(`${m.label}: ${m.value}.`);
      }
    }

    return [...new Set(strengths)].slice(0, 8);
  }
}

/**
 * Log-scaled install score.
 *
 * A linear scale would put almost every plugin near zero, since the directory
 * spans 10 installs to 5 million. Log10 makes each 10× step worth the same,
 * which matches how growth actually feels at every size.
 */
function installsToScore(installs: number): number {
  if (installs <= 0) return 0;
  // log10(1) = 0 → 0 points; log10(1,000,000) = 6 → 100 points.
  return Math.max(0, Math.min(100, Math.round((Math.log10(installs) / 6) * 100)));
}

/** Log-scaled rank score, inverted since a lower rank number is better. */
function rankToScore(rank: number): number {
  if (rank <= 100) return 100;
  // #100 → 100 points, #50,000 → ~0.
  const score = 100 - ((Math.log10(rank) - 2) / (Math.log10(50_000) - 2)) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Piecewise release-recency score anchored on WordPress.org's own warning thresholds. */
function recencyToScore(days: number): number {
  if (days <= 30) return 100;
  if (days <= 90) return Math.round(100 - ((days - 30) / 60) * 30); // 100 → 70
  if (days <= 180) return Math.round(70 - ((days - 90) / 90) * 30); // 70 → 40
  if (days <= 365) return Math.round(40 - ((days - 180) / 185) * 40); // 40 → 0
  return 0;
}
