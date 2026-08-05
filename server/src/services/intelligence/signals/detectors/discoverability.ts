import type { SignalContext } from '../context';
import { type DetectedSignal, type SignalSeverity, fmtInt, signalFingerprint } from '../types';
import type { AuditCheck } from '../../ReadmeAuditor';

/**
 * Discoverability detectors, derived from the deterministic listing audit.
 *
 * The audit already decided what's wrong and why; these detectors only decide
 * what's worth *telling the user about now*. Grouping the asset gaps into one
 * signal matters: five separate "missing screenshot" cards would bury the
 * genuinely urgent stability signals in the feed.
 */

const wpLink = (slug: string) => `https://wordpress.org/plugins/${slug}/`;

/** Turns audit checks into evidence rows, quoting the finding verbatim. */
function evidenceFrom(checks: AuditCheck[], slug: string) {
  return checks.map((c) => ({
    label: c.label,
    value: c.finding,
    source: 'atrs.aso',
    ref: wpLink(slug),
  }));
}

/**
 * Missing listing assets — banner, icon, screenshots.
 *
 * These three are grouped because they share one fix (add files to /assets) and
 * one effect (the listing looks unfinished).
 */
export function detectListingIncomplete(ctx: SignalContext): DetectedSignal | null {
  const audit = ctx.listingAudit;
  if (!audit || !ctx.wpInfo) return null;

  const assetIds = ['banner', 'icon', 'screenshots'];
  const failing = audit.checks.filter((c) => assetIds.includes(c.id) && (c.status === 'fail' || c.status === 'warn'));
  if (failing.length === 0) return null;

  const missing = failing.filter((c) => c.status === 'fail').map((c) => c.label.toLowerCase());
  const severity: SignalSeverity = failing.filter((c) => c.status === 'fail').length >= 2 ? 'high' : 'medium';

  return {
    code: 'aso.listing_incomplete',
    category: 'discoverability',
    direction: 'negative',
    severity,
    title: `Listing assets incomplete (${audit.score}/100 listing score)`,
    detail:
      `${failing.length} of the visual assets that sell the plugin in the directory are missing or thin` +
      `${missing.length ? `: ${missing.join(', ')}` : ''}. ` +
      `These render on every search result and on the listing page itself, so they gate install conversion ` +
      `before a user reads a single word about features.`,
    metric: { name: 'listingScore', value: audit.score, unit: '/100', threshold: 80 },
    evidence: [
      { label: 'Listing quality score', value: `${audit.score}/100`, source: 'atrs.aso', ref: wpLink(ctx.wpInfo.slug) },
      ...evidenceFrom(failing, ctx.wpInfo.slug),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'aso.listing_incomplete'),
    detectedAt: ctx.now,
  };
}

/** Fewer than 4 of the 5 indexable directory tags in use. */
export function detectTagsUnderused(ctx: SignalContext): DetectedSignal | null {
  const check = ctx.listingAudit?.checks.find((c) => c.id === 'tags');
  if (!check || check.status === 'pass' || check.status === 'unknown' || !ctx.wpInfo) return null;

  const used = ctx.wpInfo.tags.length;
  // Competitor tags are the closest thing to a keyword research tool WP.org offers.
  const competitorTags = [
    ...new Set(ctx.competitors.flatMap((c) => c.info?.tags ?? []).filter((t) => !ctx.wpInfo!.tags.includes(t))),
  ].slice(0, 8);

  return {
    code: 'aso.tags_underused',
    category: 'discoverability',
    direction: 'negative',
    severity: used === 0 ? 'medium' : 'low',
    title: `Using ${used} of 5 indexable tags`,
    detail:
      `${check.finding} WordPress.org indexes up to five tags and they drive tag-browse and search ` +
      `placement, so unused slots are free discoverability left on the table.` +
      (competitorTags.length
        ? ` Tracked competitors rank under tags you don't use: ${competitorTags.join(', ')}.`
        : ''),
    metric: { name: 'tagsUsed', value: used, unit: 'tags', threshold: 4 },
    evidence: [
      { label: 'Tags in use', value: used ? ctx.wpInfo.tags.join(', ') : 'none', source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      { label: 'Indexable slots', value: '5', source: 'wp.org' },
      ...(competitorTags.length
        ? [{ label: 'Competitor tags not used', value: competitorTags.join(', '), source: 'wp.org' }]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'aso.tags_underused'),
    detectedAt: ctx.now,
  };
}

/** Short description outside the 90–150 character window WP.org actually displays. */
export function detectShortDescriptionWeak(ctx: SignalContext): DetectedSignal | null {
  const check = ctx.listingAudit?.checks.find((c) => c.id === 'shortDescription');
  if (!check || check.status === 'pass' || check.status === 'unknown' || !ctx.wpInfo) return null;

  const len = ctx.wpInfo.shortDescription.length;

  return {
    code: 'aso.short_description_weak',
    category: 'discoverability',
    direction: 'negative',
    severity: len === 0 ? 'medium' : 'low',
    title: 'Short description not optimised',
    detail:
      `${check.finding} This single line is what appears under your plugin name in every search result — ` +
      `it does more conversion work than any other text on the listing.`,
    metric: { name: 'shortDescriptionLength', value: len, unit: 'characters', threshold: 150 },
    evidence: [
      { label: 'Current length', value: `${len} characters`, source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      { label: 'Visible limit', value: '150 characters', source: 'wp.org' },
      { label: 'Current text', value: ctx.wpInfo.shortDescription || '(empty)', source: 'wp.org' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'aso.short_description_weak'),
    detectedAt: ctx.now,
  };
}

/**
 * Missing FAQ section.
 *
 * Framed as a support-cost signal rather than a documentation nicety, because
 * that's the effect: FAQ entries deflect the threads that would otherwise
 * consume reply time and drag the resolution rate down.
 */
export function detectNoFaq(ctx: SignalContext): DetectedSignal | null {
  const check = ctx.listingAudit?.checks.find((c) => c.id === 'faq');
  if (!check || check.status === 'pass' || check.status === 'unknown' || !ctx.wpInfo) return null;

  const unresolved =
    ctx.wpInfo.supportThreads !== null && ctx.wpInfo.supportThreadsResolved !== null
      ? ctx.wpInfo.supportThreads - ctx.wpInfo.supportThreadsResolved
      : null;

  return {
    code: 'aso.no_faq',
    category: 'discoverability',
    direction: 'negative',
    // Only meaningful when there's actual support load to deflect.
    severity: unresolved !== null && unresolved >= 5 ? 'medium' : 'low',
    title: 'No FAQ section on the listing',
    detail:
      `${check.finding} FAQ entries answer questions before they become support threads` +
      (unresolved !== null ? `, and ${unresolved} thread${unresolved === 1 ? '' : 's'} are currently unresolved` : '') +
      `. The fastest version of this is to publish answers to the five questions you already answer most.`,
    evidence: [
      { label: 'FAQ entries', value: check.finding, source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      ...(unresolved !== null
        ? [{ label: 'Unresolved support threads', value: fmtInt(unresolved), source: 'wp.org' }]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'aso.no_faq'),
    detectedAt: ctx.now,
  };
}

/** Zero screenshots — called out separately because it's the single largest listing gap. */
export function detectNoScreenshots(ctx: SignalContext): DetectedSignal | null {
  if (!ctx.wpInfo || ctx.wpInfo.screenshotCount > 0) return null;

  const competitorAvg = (() => {
    const counts = ctx.competitors.map((c) => c.info?.screenshotCount).filter((n): n is number => typeof n === 'number');
    if (counts.length === 0) return null;
    return Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10;
  })();

  return {
    code: 'aso.no_screenshots',
    category: 'discoverability',
    direction: 'negative',
    severity: 'high',
    title: 'No screenshots published',
    detail:
      `The listing has no screenshots at all. For a UI-facing plugin this is the largest single conversion ` +
      `gap available to fix` +
      (competitorAvg !== null ? ` — tracked competitors average ${competitorAvg}` : '') +
      `. Users decide whether a plugin looks maintained and capable from the screenshots before reading anything.`,
    metric: { name: 'screenshotCount', value: 0, unit: 'screenshots', threshold: 3 },
    evidence: [
      { label: 'Screenshots', value: '0', source: 'wp.org', ref: wpLink(ctx.wpInfo.slug) },
      ...(competitorAvg !== null
        ? [{ label: 'Competitor average', value: String(competitorAvg), source: 'wp.org' }]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'aso.no_screenshots'),
    detectedAt: ctx.now,
  };
}

export const discoverabilityDetectors = [
  detectListingIncomplete,
  detectNoScreenshots,
  detectTagsUnderused,
  detectShortDescriptionWeak,
  detectNoFaq,
];
