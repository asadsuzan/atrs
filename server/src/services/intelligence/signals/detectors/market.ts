import type { SignalContext } from '../context';
import { type DetectedSignal, fmtDelta, fmtInt, fmtPct, signalFingerprint } from '../types';
import { MarketDataService } from '../../MarketDataService';
import { negativeReviewShare } from '../../wporg/readme';

/**
 * Market-facing detectors: traction, reputation, support load and platform
 * hygiene, all sourced from WordPress.org.
 *
 * Trend detectors here depend on the snapshot series, which starts empty for a
 * newly tracked product. Rather than inventing a trend from one data point they
 * stay silent, and `detectInsufficientHistory` explains the silence so the UI
 * never looks broken.
 */

const DAY = 86_400_000;

/** WP.org's public link for a slug, so every claim is one click from verification. */
const wpLink = (slug: string) => `https://wordpress.org/plugins/${slug}/`;

/** No WP.org slug configured — the single biggest cause of thin analysis. */
export function detectNoMarketLink(ctx: SignalContext): DetectedSignal | null {
  if (ctx.product.wpOrgSlug) return null;
  // Standalone products legitimately have no directory listing.
  if (ctx.product.category === 'standalone') return null;

  return {
    code: 'data.no_market_link',
    category: 'coverage',
    direction: 'neutral',
    severity: 'medium',
    title: 'No WordPress.org slug linked',
    detail:
      `This product has no WordPress.org slug, so installs, ratings, support-thread resolution, ` +
      `directory ranking and competitor comparison cannot be measured. Analysis is limited to ` +
      `internal issue and release data until a slug is set.`,
    evidence: [
      { label: 'Product category', value: ctx.product.category, source: 'atrs.products' },
      { label: 'WP.org slug', value: 'not set', source: 'atrs.products' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'data.no_market_link'),
    detectedAt: ctx.now,
  };
}

/** Explains why trend-based signals are absent, instead of leaving a silent gap. */
export function detectInsufficientHistory(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.product.wpOrgSlug) return null;
  if (ctx.productSeries.length >= 2) return null;

  return {
    code: 'data.insufficient_history',
    category: 'coverage',
    direction: 'neutral',
    severity: 'info',
    title: 'Market trends need more history',
    detail:
      `Only ${ctx.productSeries.length} market snapshot${ctx.productSeries.length === 1 ? ' has' : 's have'} been ` +
      `captured so far. Install, rating and support trends appear once at least two readings exist — ` +
      `snapshots are taken automatically on each analysis run.`,
    metric: { name: 'marketSnapshots', value: ctx.productSeries.length, unit: 'snapshots', threshold: 2 },
    evidence: [
      { label: 'Snapshots captured', value: fmtInt(ctx.productSeries.length), source: 'atrs.market' },
      ...(ctx.wpInfo
        ? [
            {
              label: 'Current active installs',
              value: fmtInt(ctx.wpInfo.activeInstalls),
              source: 'wp.org',
              ref: wpLink(ctx.wpInfo.slug),
            },
          ]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'data.insufficient_history'),
    detectedAt: ctx.now,
  };
}

/**
 * Active installs falling.
 *
 * WP.org buckets active installs coarsely (10, 20, …, 100, 200, …, 10 000+), so
 * a change only appears when a whole bucket boundary is crossed. That makes any
 * observed decline meaningful rather than noisy, but it also means we must not
 * treat "no change" as stagnation — hence the separate stalled detector requiring
 * a long flat window.
 */
export function detectInstallsDeclining(ctx: SignalContext): DetectedSignal | null {
  const trend = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 30);
  if (trend.previous === null || trend.delta === null || trend.delta >= 0) return null;

  const pct = trend.pctChange ?? 0;
  return {
    code: 'traction.installs_declining',
    category: 'traction',
    direction: 'negative',
    // A single WP.org bucket step down is notable; >10% is a genuine bleed.
    severity: Math.abs(pct) >= 10 ? 'high' : 'medium',
    title: 'Active installs declining',
    detail:
      `Active installs moved from ${fmtInt(trend.previous)} to ${fmtInt(trend.current)} over ` +
      `${trend.spanDays} days (${fmtPct(pct)}). WordPress.org reports installs in coarse buckets, so a ` +
      `visible drop means a meaningful number of sites deactivated or removed the plugin.`,
    metric: {
      name: 'activeInstalls',
      value: trend.current ?? 0,
      unit: 'installs',
      delta: trend.delta,
      window: trend.window,
    },
    evidence: [
      { label: 'Active installs now', value: fmtInt(trend.current), source: 'wp.org', ref: wpLink(ctx.product.wpOrgSlug || '') },
      { label: `Active installs ${trend.spanDays}d ago`, value: fmtInt(trend.previous), source: 'atrs.market' },
      { label: 'Change', value: `${fmtDelta(trend.delta)} (${fmtPct(pct)})`, source: 'atrs.market' },
      { label: 'Snapshots compared', value: fmtInt(trend.dataPoints), source: 'atrs.market' },
    ],
    dataQuality: MarketDataService.trendQuality(trend, 30),
    fingerprint: signalFingerprint(ctx.productId, 'traction.installs_declining'),
    detectedAt: ctx.now,
  };
}

/** Active installs rising — credited so growth is visible, not just problems. */
export function detectInstallsGrowing(ctx: SignalContext): DetectedSignal | null {
  const trend = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 30);
  if (trend.previous === null || trend.delta === null || trend.delta <= 0) return null;

  return {
    code: 'traction.installs_growing',
    category: 'traction',
    direction: 'positive',
    severity: 'info',
    title: 'Active installs growing',
    detail:
      `Active installs rose from ${fmtInt(trend.previous)} to ${fmtInt(trend.current)} over ` +
      `${trend.spanDays} days (${fmtPct(trend.pctChange ?? 0)}).`,
    metric: {
      name: 'activeInstalls',
      value: trend.current ?? 0,
      unit: 'installs',
      delta: trend.delta,
      window: trend.window,
    },
    evidence: [
      { label: 'Active installs now', value: fmtInt(trend.current), source: 'wp.org', ref: wpLink(ctx.product.wpOrgSlug || '') },
      { label: `Active installs ${trend.spanDays}d ago`, value: fmtInt(trend.previous), source: 'atrs.market' },
      { label: 'Change', value: fmtDelta(trend.delta), source: 'atrs.market' },
    ],
    dataQuality: MarketDataService.trendQuality(trend, 30),
    fingerprint: signalFingerprint(ctx.productId, 'traction.installs_growing'),
    detectedAt: ctx.now,
  };
}

/**
 * Installs flat across a long window while downloads keep accruing.
 *
 * Flat installs alone could just be bucket coarseness. Flat installs *plus*
 * continued downloads is the real finding: new users keep arriving and keep
 * leaving, so acquisition is working and retention isn't.
 */
export function detectChurnGap(ctx: SignalContext): DetectedSignal | null {
  const installs = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 90);
  const downloads = MarketDataService.computeTrend(ctx.productSeries, 'downloaded', 90);

  if (installs.previous === null || downloads.previous === null) return null;
  if (installs.delta === null || downloads.delta === null) return null;
  // Needs a real download volume and genuinely non-growing installs.
  if (downloads.delta < 200 || installs.delta > 0) return null;
  if (installs.spanDays < 21) return null;

  return {
    code: 'traction.churn_gap',
    category: 'traction',
    direction: 'negative',
    severity: 'high',
    title: 'New downloads are not converting to installs',
    detail:
      `Downloads grew by ${fmtInt(downloads.delta)} over ${downloads.spanDays} days while active installs ` +
      `moved by ${fmtDelta(installs.delta)}. People are finding and trying the plugin, then not keeping it — ` +
      `which points at first-run experience or an unmet expectation set by the listing, not at discoverability.`,
    metric: {
      name: 'downloadsWithoutInstallGrowth',
      value: downloads.delta,
      unit: 'downloads',
      delta: installs.delta,
      window: downloads.window,
    },
    evidence: [
      { label: `Downloads gained (${downloads.spanDays}d)`, value: fmtDelta(downloads.delta), source: 'atrs.market' },
      { label: `Active install change (${installs.spanDays}d)`, value: fmtDelta(installs.delta), source: 'atrs.market' },
      { label: 'Current active installs', value: fmtInt(installs.current), source: 'wp.org', ref: wpLink(ctx.product.wpOrgSlug || '') },
      ...(ctx.listingAudit
        ? [{ label: 'Listing quality score', value: `${ctx.listingAudit.score}/100`, source: 'atrs.aso' }]
        : []),
    ],
    dataQuality: Math.min(
      MarketDataService.trendQuality(installs, 90),
      MarketDataService.trendQuality(downloads, 90),
    ),
    fingerprint: signalFingerprint(ctx.productId, 'traction.churn_gap'),
    detectedAt: ctx.now,
  };
}

/** Low absolute rating. Below 4.0 stars, the directory listing actively deters installs. */
export function detectRatingLow(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo?.ratings) return null;
  const stars = ctx.productSeries[0]?.meanStars ?? null;
  const mean = stars ?? (ctx.wpInfo.rating !== null ? ctx.wpInfo.rating / 20 : null);
  if (mean === null) return null;
  // Under 5 reviews, one unhappy user swings the average; not yet a reputation problem.
  if (ctx.wpInfo.numRatings < 5) return null;
  if (mean >= 4.0) return null;

  const negShare = negativeReviewShare(ctx.wpInfo.ratings);

  return {
    code: 'reputation.rating_low',
    category: 'reputation',
    direction: 'negative',
    severity: mean < 3.0 ? 'critical' : mean < 3.5 ? 'high' : 'medium',
    title: `Rating is ${mean.toFixed(1)} stars`,
    detail:
      `The plugin averages ${mean.toFixed(1)} stars across ${ctx.wpInfo.numRatings} reviews` +
      `${negShare !== null ? `, with ${fmtPct(negShare)} of reviews at 1–2 stars` : ''}. ` +
      `Below 4 stars the directory listing works against you — the rating is shown beside every search result.`,
    metric: { name: 'meanStars', value: Math.round(mean * 100) / 100, unit: 'stars', threshold: 4.0 },
    evidence: [
      { label: 'Mean rating', value: `${mean.toFixed(2)} stars`, source: 'wp.org', ref: `${wpLink(ctx.wpInfo.slug)}reviews/` },
      { label: 'Total reviews', value: fmtInt(ctx.wpInfo.numRatings), source: 'wp.org' },
      { label: '1-star reviews', value: fmtInt(ctx.wpInfo.ratings[1]), source: 'wp.org' },
      { label: '2-star reviews', value: fmtInt(ctx.wpInfo.ratings[2]), source: 'wp.org' },
      { label: '5-star reviews', value: fmtInt(ctx.wpInfo.ratings[5]), source: 'wp.org' },
    ],
    dataQuality: ctx.wpInfo.numRatings >= 20 ? 1 : 0.7,
    fingerprint: signalFingerprint(ctx.productId, 'reputation.rating_low'),
    detectedAt: ctx.now,
  };
}

/** Rating trending down over 90 days, regardless of its absolute level. */
export function detectRatingDeclining(ctx: SignalContext): DetectedSignal | null {
  const trend = MarketDataService.computeTrend(ctx.productSeries, 'meanStars', 90);
  if (trend.previous === null || trend.current === null || trend.delta === null) return null;
  // Star averages move slowly; 0.15 is the smallest drop worth reporting.
  if (trend.delta > -0.15) return null;

  return {
    code: 'reputation.rating_declining',
    category: 'reputation',
    direction: 'negative',
    severity: trend.delta <= -0.5 ? 'high' : 'medium',
    title: 'Rating is trending down',
    detail:
      `Mean rating fell from ${trend.previous.toFixed(2)} to ${trend.current.toFixed(2)} stars over ` +
      `${trend.spanDays} days. Recent reviews are landing below the historical average, which usually ` +
      `traces to a specific regression or an unanswered support gap.`,
    metric: {
      name: 'meanStars',
      value: Math.round(trend.current * 100) / 100,
      unit: 'stars',
      delta: Math.round(trend.delta * 100) / 100,
      window: trend.window,
    },
    evidence: [
      { label: 'Rating now', value: `${trend.current.toFixed(2)} stars`, source: 'wp.org' },
      { label: `Rating ${trend.spanDays}d ago`, value: `${trend.previous.toFixed(2)} stars`, source: 'atrs.market' },
      { label: 'Change', value: `${trend.delta.toFixed(2)} stars`, source: 'atrs.market' },
      ...(ctx.wpInfo ? [{ label: 'Total reviews', value: fmtInt(ctx.wpInfo.numRatings), source: 'wp.org' }] : []),
    ],
    dataQuality: MarketDataService.trendQuality(trend, 90),
    fingerprint: signalFingerprint(ctx.productId, 'reputation.rating_declining'),
    detectedAt: ctx.now,
  };
}

/** A heavy tail of 1–2 star reviews even when the mean looks acceptable. */
export function detectNegativeShareHigh(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo?.ratings || ctx.wpInfo.numRatings < 10) return null;
  const share = negativeReviewShare(ctx.wpInfo.ratings);
  if (share === null || share < 15) return null;

  return {
    code: 'reputation.negative_share_high',
    category: 'reputation',
    direction: 'negative',
    severity: share >= 30 ? 'high' : 'medium',
    title: `${fmtPct(share)} of reviews are 1–2 stars`,
    detail:
      `${ctx.wpInfo.ratings[1] + ctx.wpInfo.ratings[2]} of ${ctx.wpInfo.numRatings} reviews sit at 1–2 stars. ` +
      `A polarised distribution points at a reproducible failure hitting a specific segment — ` +
      `a host, a theme, or a configuration — rather than general dissatisfaction.`,
    metric: { name: 'negativeReviewShare', value: share, unit: '%', threshold: 15 },
    evidence: [
      { label: '1-star reviews', value: fmtInt(ctx.wpInfo.ratings[1]), source: 'wp.org', ref: `${wpLink(ctx.wpInfo.slug)}reviews/` },
      { label: '2-star reviews', value: fmtInt(ctx.wpInfo.ratings[2]), source: 'wp.org' },
      { label: 'Total reviews', value: fmtInt(ctx.wpInfo.numRatings), source: 'wp.org' },
      { label: 'Negative share', value: fmtPct(share), source: 'wp.org' },
    ],
    dataQuality: ctx.wpInfo.numRatings >= 25 ? 1 : 0.75,
    fingerprint: signalFingerprint(ctx.productId, 'reputation.negative_share_high'),
    detectedAt: ctx.now,
  };
}

/**
 * Too few reviews relative to install base.
 *
 * Social proof is a conversion lever independent of quality: at 5 000 installs
 * and 4 reviews, prospective users have nothing to reassure them.
 */
export function detectThinSocialProof(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo) return null;
  const installs = ctx.wpInfo.activeInstalls;
  if (installs === null || installs < 200) return null;

  // Healthy WP.org plugins land around 1 review per 100–300 active installs.
  const expected = Math.max(3, Math.floor(installs / 300));
  if (ctx.wpInfo.numRatings >= expected) return null;

  return {
    code: 'reputation.thin_social_proof',
    category: 'reputation',
    direction: 'negative',
    severity: ctx.wpInfo.numRatings < expected / 3 ? 'medium' : 'low',
    title: 'Review count is low for the install base',
    detail:
      `${fmtInt(installs)} active installs have produced only ${ctx.wpInfo.numRatings} reviews, against a ` +
      `typical ${expected}+ at this size. Reviews are shown next to every search result, so the shortfall ` +
      `costs installs that quality alone would have won.`,
    metric: { name: 'reviewCount', value: ctx.wpInfo.numRatings, unit: 'reviews', threshold: expected },
    evidence: [
      { label: 'Active installs', value: fmtInt(installs), source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      { label: 'Reviews', value: fmtInt(ctx.wpInfo.numRatings), source: 'wp.org' },
      { label: 'Typical at this size', value: `${expected}+`, source: 'atrs.benchmark' },
    ],
    dataQuality: 0.8,
    fingerprint: signalFingerprint(ctx.productId, 'reputation.thin_social_proof'),
    detectedAt: ctx.now,
  };
}

/** Strong rating, stated so the scorecard has something to build on. */
export function detectRatingStrong(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo?.ratings || ctx.wpInfo.numRatings < 10) return null;
  const mean = ctx.productSeries[0]?.meanStars ?? (ctx.wpInfo.rating !== null ? ctx.wpInfo.rating / 20 : null);
  if (mean === null || mean < 4.6) return null;

  return {
    code: 'reputation.rating_strong',
    category: 'reputation',
    direction: 'positive',
    severity: 'info',
    title: `Rating is ${mean.toFixed(1)} stars`,
    detail:
      `${mean.toFixed(2)} stars across ${ctx.wpInfo.numRatings} reviews. This is a genuine asset — ` +
      `worth quoting on the listing page and in launch material.`,
    metric: { name: 'meanStars', value: Math.round(mean * 100) / 100, unit: 'stars', threshold: 4.6 },
    evidence: [
      { label: 'Mean rating', value: `${mean.toFixed(2)} stars`, source: 'wp.org', ref: `${wpLink(ctx.wpInfo.slug)}reviews/` },
      { label: 'Total reviews', value: fmtInt(ctx.wpInfo.numRatings), source: 'wp.org' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'reputation.rating_strong'),
    detectedAt: ctx.now,
  };
}

/**
 * Low support-thread resolution rate.
 *
 * WP.org publishes resolved-vs-total for the last two months of forum threads,
 * and it's displayed on the listing page. It is simultaneously a reputation
 * metric and the leading indicator of the next batch of 1-star reviews.
 */
export function detectSupportResolutionLow(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo) return null;
  const total = ctx.wpInfo.supportThreads;
  const resolved = ctx.wpInfo.supportThreadsResolved;
  if (total === null || resolved === null || total < 5) return null;

  const rate = (resolved / total) * 100;
  if (rate >= 60) return null;

  return {
    code: 'support.resolution_low',
    category: 'support',
    direction: 'negative',
    severity: rate < 30 ? 'high' : 'medium',
    title: `Only ${fmtPct(rate)} of support threads resolved`,
    detail:
      `${resolved} of ${total} recent support threads are marked resolved. WordPress.org shows this ratio ` +
      `on your listing page, and unresolved threads are the most reliable predictor of incoming 1-star ` +
      `reviews. ${total - resolved} thread${total - resolved === 1 ? '' : 's'} currently need a reply.`,
    metric: { name: 'supportResolutionRate', value: Math.round(rate), unit: '%', threshold: 60 },
    evidence: [
      { label: 'Threads resolved', value: `${resolved} of ${total}`, source: 'wp.org', ref: `${wpLink(ctx.wpInfo.slug)}#support` },
      { label: 'Resolution rate', value: fmtPct(rate), source: 'wp.org' },
      { label: 'Unresolved', value: fmtInt(total - resolved), source: 'wp.org' },
    ],
    dataQuality: total >= 15 ? 1 : 0.75,
    fingerprint: signalFingerprint(ctx.productId, 'support.resolution_low'),
    detectedAt: ctx.now,
  };
}

/** Unresolved support threads accumulating over time. */
export function detectSupportBacklogGrowing(ctx: SignalContext): DetectedSignal | null {
  const threads = MarketDataService.computeTrend(ctx.productSeries, 'supportThreads', 60);
  const resolved = MarketDataService.computeTrend(ctx.productSeries, 'supportThreadsResolved', 60);
  if (threads.current === null || resolved.current === null) return null;
  if (threads.previous === null || resolved.previous === null) return null;

  const unresolvedNow = threads.current - resolved.current;
  const unresolvedBefore = threads.previous - resolved.previous;
  const growth = unresolvedNow - unresolvedBefore;
  if (growth < 3) return null;

  return {
    code: 'support.backlog_growing',
    category: 'support',
    direction: 'negative',
    severity: growth >= 10 ? 'high' : 'medium',
    title: 'Unresolved support threads accumulating',
    detail:
      `Unresolved support threads grew from ${fmtInt(unresolvedBefore)} to ${fmtInt(unresolvedNow)} over ` +
      `${threads.spanDays} days. Reply latency compounds: each unanswered thread also discourages the ` +
      `next user from asking rather than uninstalling.`,
    metric: {
      name: 'unresolvedSupportThreads',
      value: unresolvedNow,
      unit: 'threads',
      delta: growth,
      window: threads.window,
    },
    evidence: [
      { label: 'Unresolved now', value: fmtInt(unresolvedNow), source: 'wp.org', ref: ctx.wpInfo ? `${wpLink(ctx.wpInfo.slug)}#support` : undefined },
      { label: `Unresolved ${threads.spanDays}d ago`, value: fmtInt(unresolvedBefore), source: 'atrs.market' },
      { label: 'Growth', value: fmtDelta(growth), source: 'atrs.market' },
    ],
    dataQuality: MarketDataService.trendQuality(threads, 60),
    fingerprint: signalFingerprint(ctx.productId, 'support.backlog_growing'),
    detectedAt: ctx.now,
  };
}

/** "Tested up to" trailing the current WordPress release. */
export function detectWpTestedStale(ctx: SignalContext): DetectedSignal | null {
  const snapshot = ctx.productSeries[0];
  const lag = snapshot?.wpVersionLag ?? null;
  if (lag === null || lag < 1) return null;

  return {
    code: 'compat.wp_tested_stale',
    category: 'compliance',
    direction: 'negative',
    // At 2+ minors behind, WP.org shows the compatibility warning that suppresses installs.
    severity: lag >= 3 ? 'high' : lag >= 2 ? 'medium' : 'low',
    title: `"Tested up to" is ${lag} release${lag === 1 ? '' : 's'} behind`,
    detail:
      `The plugin declares compatibility up to WordPress ${ctx.wpInfo?.testedUpTo ?? 'unknown'} while ` +
      `${ctx.currentWp ?? 'the current release'} is live. The directory warns visitors that the plugin is ` +
      `untested with their version, which suppresses installs regardless of whether it actually works. ` +
      `This is usually a one-line readme change.`,
    metric: { name: 'wpVersionLag', value: lag, unit: 'releases', threshold: 0 },
    evidence: [
      { label: 'Tested up to', value: ctx.wpInfo?.testedUpTo ?? 'unknown', source: 'wp.org', ref: ctx.wpInfo ? wpLink(ctx.wpInfo.slug) : undefined },
      { label: 'Current WordPress', value: ctx.currentWp ?? 'unknown', source: 'wp.org' },
      { label: 'Releases behind', value: fmtInt(lag), source: 'atrs.market' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'compat.wp_tested_stale'),
    detectedAt: ctx.now,
  };
}

/** A "Requires PHP" floor old enough to be a security liability. */
export function detectPhpRequirementDated(ctx: SignalContext): DetectedSignal | null {
  const requires = ctx.wpInfo?.requiresPhp;
  if (!requires) return null;
  const major = parseFloat(requires);
  if (!Number.isFinite(major) || major >= 7.4) return null;

  return {
    code: 'compat.php_requirement_dated',
    category: 'compliance',
    direction: 'negative',
    severity: 'low',
    title: `Still supporting PHP ${requires}`,
    detail:
      `The plugin declares support for PHP ${requires}, which is past end-of-life and receives no security ` +
      `patches. Raising the floor to 7.4 or above removes compatibility shims and lets you use modern ` +
      `language features, at the cost of the shrinking share of sites still on old PHP.`,
    metric: { name: 'requiresPhp', value: major, unit: 'version', threshold: 7.4 },
    evidence: [
      { label: 'Requires PHP', value: requires, source: 'wp.org', ref: ctx.wpInfo ? wpLink(ctx.wpInfo.slug) : undefined },
      { label: 'Recommended floor', value: '7.4+', source: 'atrs.benchmark' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'compat.php_requirement_dated'),
    detectedAt: ctx.now,
  };
}

/** Unpatched vulnerabilities recorded against the plugin. */
export function detectVulnerability(ctx: SignalContext): DetectedSignal | null {
  const snapshot = ctx.productSeries[0];
  const present = snapshot?.vulnerabilitiesPresent ?? null;
  if (present === null || present <= 0) return null;

  const patched = snapshot?.vulnerabilitiesPatched ?? 0;

  return {
    code: 'security.vulnerability_present',
    category: 'compliance',
    direction: 'negative',
    severity: 'critical',
    title: `${present} unpatched vulnerabilit${present === 1 ? 'y' : 'ies'} on record`,
    detail:
      `Patchstack lists ${present} unpatched vulnerabilit${present === 1 ? 'y' : 'ies'} for this plugin ` +
      `(${patched} previously patched). Security advisories propagate to every WordPress security scanner ` +
      `and firewall, so this outranks all other work until resolved.`,
    metric: { name: 'unpatchedVulnerabilities', value: present, unit: 'advisories', threshold: 0 },
    evidence: [
      {
        label: 'Unpatched advisories',
        value: fmtInt(present),
        source: 'patchstack.com',
        ref: `https://patchstack.com/database/wordpress/plugin/${ctx.product.wpOrgSlug}/`,
      },
      { label: 'Previously patched', value: fmtInt(patched), source: 'patchstack.com' },
    ],
    dataQuality: 0.9,
    fingerprint: signalFingerprint(ctx.productId, 'security.vulnerability_present'),
    detectedAt: ctx.now,
  };
}

/** Memory footprint heavy enough to show up in performance comparisons. */
export function detectHeavyMemory(ctx: SignalContext): DetectedSignal | null {
  const snapshot = ctx.productSeries[0];
  const memory = snapshot?.memoryUsage ?? null;
  const speed = snapshot?.speedSeconds ?? null;
  if (!memory && speed === null) return null;

  const mb = memory ? parseMemoryMb(memory) : null;
  // WP Hive's own threshold for flagging a plugin as memory-heavy.
  const heavyMemory = mb !== null && mb >= 3;
  const slowLoad = speed !== null && speed >= 0.5;
  if (!heavyMemory && !slowLoad) return null;

  return {
    code: 'perf.heavy_memory',
    category: 'compliance',
    direction: 'negative',
    severity: (heavyMemory && slowLoad) || (mb !== null && mb >= 8) ? 'medium' : 'low',
    title: 'Measurable performance impact',
    detail:
      `Independent testing reports ${memory ?? 'unknown'} average memory use` +
      `${speed !== null ? ` and a ${speed}s page-load increase` : ''}. ` +
      `Performance is a stated buying criterion for agencies and a common theme in comparison articles.`,
    metric: mb !== null ? { name: 'memoryMb', value: mb, unit: 'MB', threshold: 3 } : undefined,
    evidence: [
      ...(memory
        ? [{ label: 'Average memory', value: memory, source: 'wphive.com', ref: `https://wphive.com/plugins/${ctx.product.wpOrgSlug}/` }]
        : []),
      ...(speed !== null ? [{ label: 'Page-load impact', value: `${speed}s`, source: 'wphive.com' }] : []),
    ],
    dataQuality: 0.7,
    fingerprint: signalFingerprint(ctx.productId, 'perf.heavy_memory'),
    detectedAt: ctx.now,
  };
}

/** Parses WP Hive's "2.4 MB" / "980 KB" strings into megabytes. */
function parseMemoryMb(text: string): number | null {
  const m = text.match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  const unit = m[2].toUpperCase();
  if (unit === 'KB') return Math.round((value / 1024) * 100) / 100;
  if (unit === 'GB') return value * 1024;
  return value;
}

/** Installs flat for a long stretch despite the product being maintained. */
export function detectInstallsStalled(ctx: SignalContext): DetectedSignal | null {
  const trend = MarketDataService.computeTrend(ctx.productSeries, 'activeInstalls', 90);
  if (trend.previous === null || trend.delta === null) return null;
  if (trend.delta !== 0) return null;
  // WP.org buckets are coarse, so only a long flat window means anything.
  if (trend.spanDays < 45 || trend.dataPoints < 4) return null;

  return {
    code: 'traction.installs_stalled',
    category: 'traction',
    direction: 'negative',
    severity: 'medium',
    title: 'Active installs flat for months',
    detail:
      `Active installs have held at ${fmtInt(trend.current)} across ${trend.spanDays} days and ` +
      `${trend.dataPoints} readings. WordPress.org reports installs in buckets, so this means growth has not ` +
      `been enough to cross a bucket boundary — a discoverability problem rather than a product one.`,
    metric: { name: 'activeInstalls', value: trend.current ?? 0, unit: 'installs', delta: 0, window: trend.window },
    evidence: [
      { label: 'Active installs', value: fmtInt(trend.current), source: 'wp.org', ref: wpLink(ctx.product.wpOrgSlug || '') },
      { label: 'Flat for', value: `${trend.spanDays} days`, source: 'atrs.market' },
      { label: 'Readings compared', value: fmtInt(trend.dataPoints), source: 'atrs.market' },
      ...(ctx.listingAudit
        ? [{ label: 'Listing quality score', value: `${ctx.listingAudit.score}/100`, source: 'atrs.aso' }]
        : []),
    ],
    dataQuality: MarketDataService.trendQuality(trend, 90),
    fingerprint: signalFingerprint(ctx.productId, 'traction.installs_stalled'),
    detectedAt: ctx.now,
  };
}

export const marketDetectors = [
  detectNoMarketLink,
  detectInsufficientHistory,
  detectInstallsDeclining,
  detectInstallsGrowing,
  detectInstallsStalled,
  detectChurnGap,
  detectRatingLow,
  detectRatingDeclining,
  detectNegativeShareHigh,
  detectThinSocialProof,
  detectRatingStrong,
  detectSupportResolutionLow,
  detectSupportBacklogGrowing,
  detectWpTestedStale,
  detectPhpRequirementDated,
  detectVulnerability,
  detectHeavyMemory,
];
