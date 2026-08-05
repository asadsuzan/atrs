import type { CompetitorContext, SignalContext } from '../context';
import { type DetectedSignal, fmtDelta, fmtInt, fmtPct, signalFingerprint } from '../types';
import { MarketDataService } from '../../MarketDataService';
import { compareFeatures, findCommonGaps } from '../../FeatureMatcher';

/**
 * Competitive detectors.
 *
 * Every claim here is a comparison of two real WP.org numbers. The old
 * implementation asked an LLM which competitor was winning and why; these
 * detectors compute it, so the answer is the same every run and can be checked
 * against the directory in one click.
 *
 * Competitive signals carry a `competitorId` and use it as their fingerprint
 * discriminator, so one signal per rival can coexist rather than overwriting
 * each other.
 */

const DAY = 86_400_000;
const wpLink = (slug: string) => `https://wordpress.org/plugins/${slug}/`;

/** Competitors we can actually measure — i.e. those resolved on WP.org. */
function measurable(ctx: SignalContext): CompetitorContext[] {
  return ctx.competitors.filter((c) => c.info !== null);
}

/** No competitors tracked at all — competitive analysis simply cannot run. */
export function detectNoCompetitors(ctx: SignalContext): DetectedSignal | null {
  if (ctx.competitors.length > 0) return null;

  return {
    code: 'competitive.no_competitors_tracked',
    category: 'competitive',
    direction: 'neutral',
    severity: 'low',
    title: 'No competitors tracked',
    detail:
      `Feature-gap analysis, install-share comparison and threat alerts all need at least one tracked ` +
      `competitor. Auto-discovery can propose real WordPress.org plugins ranking for the same terms as ` +
      `this product.`,
    evidence: [
      { label: 'Tracked competitors', value: '0', source: 'atrs.competitors' },
      ...(ctx.wpInfo?.tags.length
        ? [{ label: 'Product tags available for discovery', value: ctx.wpInfo.tags.join(', '), source: 'wp.org' }]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'competitive.no_competitors_tracked'),
    detectedAt: ctx.now,
  };
}

/**
 * A competitor growing installs faster than us.
 *
 * Both sides need snapshot history, so this stays silent until the series has
 * depth on both. Comparing our 30-day growth against theirs is more honest than
 * comparing absolute size — a rival ten times larger isn't news, but one closing
 * the gap is.
 */
export function detectInstallGapWidening(ctx: SignalContext): DetectedSignal[] {
  const ourTrend = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 30);
  if (ourTrend.current === null) return [];

  const out: DetectedSignal[] = [];

  for (const c of measurable(ctx)) {
    const theirTrend = MarketDataService.computeTrend(c.series, 'activeInstalls', 30);
    if (theirTrend.current === null) continue;
    // Growth comparison needs a baseline on both sides.
    if (ourTrend.previous === null || theirTrend.previous === null) continue;
    if (theirTrend.delta === null || ourTrend.delta === null) continue;

    // Percentage growth, so a rival of a different size is still comparable.
    const ourGrowth = ourTrend.previous > 0 ? (ourTrend.delta / ourTrend.previous) * 100 : 0;
    const theirGrowth = theirTrend.previous > 0 ? (theirTrend.delta / theirTrend.previous) * 100 : 0;
    // Require a 5-point gap so bucket-rounding noise doesn't fire this.
    if (theirGrowth - ourGrowth < 5) continue;

    out.push({
      code: 'competitive.install_gap_widening',
      category: 'competitive',
      direction: 'negative',
      severity: theirGrowth - ourGrowth >= 20 ? 'high' : 'medium',
      title: `${c.competitor.name} is growing faster`,
      detail:
        `${c.competitor.name} grew active installs ${fmtPct(theirGrowth)} over ${theirTrend.spanDays} days ` +
        `while this product grew ${fmtPct(ourGrowth)}. They now sit at ${fmtInt(theirTrend.current)} installs ` +
        `against our ${fmtInt(ourTrend.current)}.`,
      metric: {
        name: 'installGrowthGap',
        value: Math.round((theirGrowth - ourGrowth) * 10) / 10,
        unit: '%',
        window: '30d',
        threshold: 5,
      },
      evidence: [
        { label: `${c.competitor.name} installs`, value: fmtInt(theirTrend.current), source: 'wp.org', ref: wpLink(c.info!.slug) },
        { label: `${c.competitor.name} growth`, value: fmtPct(theirGrowth), source: 'atrs.market' },
        { label: 'Our installs', value: fmtInt(ourTrend.current), source: 'wp.org' },
        { label: 'Our growth', value: fmtPct(ourGrowth), source: 'atrs.market' },
      ],
      dataQuality: Math.min(
        MarketDataService.trendQuality(ourTrend, 30),
        MarketDataService.trendQuality(theirTrend, 30),
      ),
      competitorId: String(c.competitor._id),
      fingerprint: signalFingerprint(ctx.productId, 'competitive.install_gap_widening', String(c.competitor._id)),
      detectedAt: ctx.now,
    });
  }

  return out;
}

/**
 * A competitor shipping releases more often than us.
 *
 * Uses published changelog cadence on both sides so the comparison is
 * apples-to-apples — our internal version history would include work theirs
 * doesn't expose.
 */
export function detectOutshipped(ctx: SignalContext): DetectedSignal[] {
  const ourCadence = ctx.cadence;
  if (!ourCadence?.medianDaysBetween) return [];

  const out: DetectedSignal[] = [];

  for (const c of measurable(ctx)) {
    const theirs = c.cadence;
    if (!theirs?.medianDaysBetween) continue;
    // Require them to be meaningfully faster, not marginally.
    if (theirs.medianDaysBetween >= ourCadence.medianDaysBetween * 0.6) continue;

    const ratio = Math.round((ourCadence.medianDaysBetween / theirs.medianDaysBetween) * 10) / 10;

    out.push({
      code: 'competitive.outshipped',
      category: 'competitive',
      direction: 'negative',
      severity: ratio >= 3 ? 'high' : 'medium',
      title: `${c.competitor.name} ships ${ratio}× more often`,
      detail:
        `${c.competitor.name} releases every ${theirs.medianDaysBetween} days on median against our ` +
        `${ourCadence.medianDaysBetween}. Over a year that is roughly ` +
        `${Math.round(365 / theirs.medianDaysBetween)} releases to our ` +
        `${Math.round(365 / ourCadence.medianDaysBetween)} — a compounding gap in how fast each side can ` +
        `respond to what users ask for.`,
      metric: {
        name: 'medianDaysBetweenReleases',
        value: ourCadence.medianDaysBetween,
        unit: 'days',
        delta: Math.round(ourCadence.medianDaysBetween - theirs.medianDaysBetween),
        threshold: Math.round(theirs.medianDaysBetween),
      },
      evidence: [
        { label: `${c.competitor.name} median gap`, value: `${theirs.medianDaysBetween} days`, source: 'wp.org', ref: wpLink(c.info!.slug) },
        { label: 'Our median gap', value: `${ourCadence.medianDaysBetween} days`, source: 'wp.org' },
        { label: `${c.competitor.name} versions on record`, value: fmtInt(theirs.datedVersions), source: 'wp.org' },
        { label: 'Our versions on record', value: fmtInt(ourCadence.datedVersions), source: 'wp.org' },
      ],
      // Cadence read from parsed changelog dates; fewer dated versions means less certainty.
      dataQuality: Math.min(1, Math.min(theirs.datedVersions, ourCadence.datedVersions) / 8) * 0.9 + 0.1,
      competitorId: String(c.competitor._id),
      fingerprint: signalFingerprint(ctx.productId, 'competitive.outshipped', String(c.competitor._id)),
      detectedAt: ctx.now,
    });
  }

  return out;
}

/** A competitor materially better rated than us. */
export function detectRatingDeficit(ctx: SignalContext): DetectedSignal[] {
  const ourStars = ctx.productSeries[0]?.meanStars ?? (ctx.wpInfo?.rating != null ? ctx.wpInfo.rating / 20 : null);
  if (ourStars === null || !ctx.wpInfo || ctx.wpInfo.numRatings < 5) return [];

  const out: DetectedSignal[] = [];

  for (const c of measurable(ctx)) {
    const theirStars = c.series[0]?.meanStars ?? (c.info!.rating != null ? c.info!.rating / 20 : null);
    // Both sides need enough reviews for the average to mean anything.
    if (theirStars === null || c.info!.numRatings < 5) continue;
    // Half a star is the smallest gap a user would notice on the listing.
    if (theirStars - ourStars < 0.5) continue;

    out.push({
      code: 'competitive.rating_deficit',
      category: 'competitive',
      direction: 'negative',
      severity: theirStars - ourStars >= 1 ? 'high' : 'medium',
      title: `${c.competitor.name} rates ${(theirStars - ourStars).toFixed(1)} stars higher`,
      detail:
        `${c.competitor.name} averages ${theirStars.toFixed(2)} stars over ${c.info!.numRatings} reviews ` +
        `against our ${ourStars.toFixed(2)} over ${ctx.wpInfo.numRatings}. Both ratings appear side by side ` +
        `whenever a user compares options in the directory.`,
      metric: {
        name: 'ratingGap',
        value: Math.round((theirStars - ourStars) * 100) / 100,
        unit: 'stars',
        threshold: 0.5,
      },
      evidence: [
        { label: `${c.competitor.name} rating`, value: `${theirStars.toFixed(2)} (${c.info!.numRatings} reviews)`, source: 'wp.org', ref: `${wpLink(c.info!.slug)}reviews/` },
        { label: 'Our rating', value: `${ourStars.toFixed(2)} (${ctx.wpInfo.numRatings} reviews)`, source: 'wp.org' },
        { label: 'Gap', value: `${(theirStars - ourStars).toFixed(2)} stars`, source: 'atrs.market' },
      ],
      dataQuality: Math.min(c.info!.numRatings, ctx.wpInfo.numRatings) >= 20 ? 1 : 0.7,
      competitorId: String(c.competitor._id),
      fingerprint: signalFingerprint(ctx.productId, 'competitive.rating_deficit', String(c.competitor._id)),
      detectedAt: ctx.now,
    });
  }

  return out;
}

/**
 * Capabilities that multiple competitors advertise and we don't.
 *
 * Only fires on gaps shared by two or more rivals, and only on high-certainty
 * lexical gaps. A single competitor's unique feature is their differentiation,
 * not our deficiency; something two of them ship is a category expectation.
 */
export function detectFeatureGap(ctx: SignalContext): DetectedSignal | null {
  const withFeatures = ctx.competitors.filter((c) => c.features.length >= 3);
  if (withFeatures.length === 0 || ctx.ownFeatures.length < 3) return null;

  const perCompetitor = withFeatures.map((c) => ({
    name: c.competitor.name,
    comparison: compareFeatures(ctx.ownFeatures, c.features),
  }));

  const common = findCommonGaps(perCompetitor)
    .filter((g) => g.certainty === 'high')
    .filter((g) => (withFeatures.length === 1 ? false : g.competitors.length >= 2));

  if (common.length === 0) return null;

  const top = common.slice(0, 6);

  return {
    code: 'competitive.feature_gap',
    category: 'competitive',
    direction: 'negative',
    severity: common.length >= 5 ? 'high' : 'medium',
    title: `${common.length} capability gap${common.length === 1 ? '' : 's'} shared by competitors`,
    detail:
      `${common.length} capabilit${common.length === 1 ? 'y is' : 'ies are'} advertised by at least two ` +
      `tracked competitors with no counterpart in this product's readme. Features multiple rivals ship are ` +
      `category expectations rather than differentiation — the most notable is "${top[0].feature}" ` +
      `(${top[0].competitors.length} of ${top[0].competitorCount} competitors).`,
    metric: { name: 'sharedFeatureGaps', value: common.length, unit: 'features', threshold: 1 },
    evidence: top.map((g) => ({
      label: `${g.competitors.length}/${g.competitorCount} competitors`,
      value: g.feature,
      source: 'wp.org.readme',
    })),
    // Lexical matching against readme prose: good, not perfect. Readme-sourced
    // feature lists are more trustworthy than hand-typed ones.
    dataQuality: withFeatures.every((c) => c.featureSource === 'readme') ? 0.75 : 0.55,
    fingerprint: signalFingerprint(ctx.productId, 'competitive.feature_gap'),
    detectedAt: ctx.now,
  };
}

/**
 * A competitor released recently.
 *
 * Handles both tracking modes: WordPress.org competitors via their `last_updated`
 * timestamp, and off-directory competitors via captured RSS changelog items. The
 * RSS path is what the old `ChangelogMonitor` alert was trying to be before its
 * invalid `Insight` write made it throw on every detection.
 */
export function detectCompetitorReleased(ctx: SignalContext): DetectedSignal[] {
  const out: DetectedSignal[] = [];

  for (const c of ctx.competitors) {
    const wpLastUpdated = c.info?.lastUpdated ?? null;
    // Only items with a real publication date can be aged; a captured-but-undated
    // item tells us nothing about when the competitor actually shipped.
    const newestRss = c.rssItems.filter((i) => i.pubDate !== null).sort((a, b) => b.pubDate!.getTime() - a.pubDate!.getTime())[0] ?? null;

    // Prefer whichever source reports the more recent release.
    const usingRss =
      newestRss !== null && (wpLastUpdated === null || newestRss.pubDate!.getTime() > wpLastUpdated.getTime());
    const releasedAt = usingRss ? newestRss!.pubDate! : wpLastUpdated;
    if (!releasedAt) continue;

    const days = Math.floor((ctx.now.getTime() - releasedAt.getTime()) / DAY);
    if (days > 14 || days < 0) continue;

    const label = usingRss ? (newestRss!.title ?? 'an update') : (c.info?.version ?? 'an update');
    const when = days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`;

    out.push({
      code: 'competitive.competitor_released',
      category: 'competitive',
      direction: 'neutral',
      severity: 'low',
      title: `${c.competitor.name} released ${label}`,
      detail:
        `${c.competitor.name} shipped ${label} ${when}. ` +
        `Their changelog is the cheapest available read on where the category is moving.`,
      metric: { name: 'daysSinceCompetitorRelease', value: days, unit: 'days', threshold: 14 },
      evidence: usingRss
        ? [
            { label: 'Release', value: label, source: 'competitor.rss', ref: newestRss!.link ?? c.competitor.url },
            { label: 'Published', value: releasedAt.toISOString().slice(0, 10), source: 'competitor.rss' },
          ]
        : [
            {
              label: 'Version',
              value: c.info?.version ?? 'unknown',
              source: 'wp.org',
              ref: c.info ? `${wpLink(c.info.slug)}#developers` : undefined,
            },
            { label: 'Released', value: releasedAt.toISOString().slice(0, 10), source: 'wp.org' },
            ...(c.info ? [{ label: 'Their active installs', value: fmtInt(c.info.activeInstalls), source: 'wp.org' }] : []),
          ],
      // A dated RSS item is as reliable as the feed publisher; WP.org is authoritative.
      dataQuality: usingRss ? 0.85 : 1,
      competitorId: String(c.competitor._id),
      fingerprint: signalFingerprint(ctx.productId, 'competitive.competitor_released', String(c.competitor._id)),
      detectedAt: ctx.now,
    });
  }

  return out;
}

/** We lead the tracked set on installs and rating — a position worth defending explicitly. */
export function detectCategoryLeader(ctx: SignalContext): DetectedSignal | null {
  const rivals = measurable(ctx);
  if (rivals.length < 2 || !ctx.wpInfo) return null;

  const ourInstalls = ctx.wpInfo.activeInstalls;
  const ourStars = ctx.productSeries[0]?.meanStars ?? (ctx.wpInfo.rating != null ? ctx.wpInfo.rating / 20 : null);
  if (ourInstalls === null || ourStars === null) return null;

  const leadsInstalls = rivals.every((c) => (c.info!.activeInstalls ?? 0) < ourInstalls);
  const leadsRating = rivals.every((c) => {
    const theirs = c.info!.rating != null ? c.info!.rating / 20 : 0;
    return theirs <= ourStars;
  });
  if (!leadsInstalls || !leadsRating) return null;

  const runnerUp = rivals.sort((a, b) => (b.info!.activeInstalls ?? 0) - (a.info!.activeInstalls ?? 0))[0];

  return {
    code: 'competitive.category_leader',
    category: 'competitive',
    direction: 'positive',
    severity: 'info',
    title: 'Leading the tracked competitive set',
    detail:
      `This product leads all ${rivals.length} tracked competitors on both active installs ` +
      `(${fmtInt(ourInstalls)} against ${runnerUp.competitor.name}'s ${fmtInt(runnerUp.info!.activeInstalls)}) ` +
      `and rating (${ourStars.toFixed(2)} stars). The strategic question shifts from catching up to ` +
      `defending the position.`,
    metric: {
      name: 'installLeadOverRunnerUp',
      value: ourInstalls - (runnerUp.info!.activeInstalls ?? 0),
      unit: 'installs',
    },
    evidence: [
      { label: 'Our active installs', value: fmtInt(ourInstalls), source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      { label: 'Our rating', value: `${ourStars.toFixed(2)} stars`, source: 'wp.org' },
      {
        label: `Closest competitor (${runnerUp.competitor.name})`,
        value: `${fmtInt(runnerUp.info!.activeInstalls)} installs`,
        source: 'wp.org',
        ref: wpLink(runnerUp.info!.slug),
      },
      { label: 'Lead', value: fmtDelta(ourInstalls - (runnerUp.info!.activeInstalls ?? 0)), source: 'atrs.market' },
    ],
    dataQuality: 0.9,
    fingerprint: signalFingerprint(ctx.productId, 'competitive.category_leader'),
    detectedAt: ctx.now,
  };
}

/** Single-signal detectors. */
export const competitiveDetectors = [detectNoCompetitors, detectFeatureGap, detectCategoryLeader];

/** Detectors that emit one signal per competitor. */
export const competitiveMultiDetectors = [
  detectInstallGapWidening,
  detectOutshipped,
  detectRatingDeficit,
  detectCompetitorReleased,
];
