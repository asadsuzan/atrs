import type { SignalContext } from '../context';
import { type DetectedSignal, fmtInt, fmtPct, signalFingerprint } from '../types';
import type { IVersion } from '../../../../models/Version';

/**
 * Release-discipline detectors.
 *
 * On WordPress.org the "Last updated" line is one of the few trust signals a
 * browsing user actually reads, so shipping cadence is a market metric and not
 * just an engineering one. These detectors prefer ATRS's own version history
 * (which knows about unreleased work) and fall back to the published changelog
 * when internal history is thin.
 */

const DAY = 86_400_000;

function releasedVersions(ctx: SignalContext): IVersion[] {
  return ctx.versions
    .filter((v) => v.status === 'released' && v.releasedAt)
    .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());
}

/**
 * The most recent release date, from whichever source knows it.
 *
 * WP.org's `last_updated` is authoritative for what users see, so it wins when
 * it's newer than anything recorded internally — a release shipped outside ATRS
 * still counts as a release.
 */
function lastReleaseDate(ctx: SignalContext): { date: Date; source: string } | null {
  const internal = releasedVersions(ctx)[0];
  const candidates: Array<{ date: Date; source: string }> = [];
  if (internal?.releasedAt) candidates.push({ date: new Date(internal.releasedAt), source: 'atrs.versions' });
  if (ctx.wpInfo?.lastUpdated) candidates.push({ date: ctx.wpInfo.lastUpdated, source: 'wp.org' });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

/**
 * No release for an extended period.
 *
 * 180 days is where WP.org itself starts warning users that a plugin may be
 * abandoned, and 365 is where it becomes eligible for closure, so those are the
 * thresholds that carry real consequences.
 */
export function detectDormant(ctx: SignalContext): DetectedSignal | null {
  const last = lastReleaseDate(ctx);
  if (!last) return null;

  const days = Math.floor((ctx.now.getTime() - last.date.getTime()) / DAY);
  if (days < 90) return null;

  const severity = days >= 365 ? 'critical' : days >= 180 ? 'high' : 'medium';
  const consequence =
    days >= 365
      ? 'WordPress.org flags plugins untouched for a year as potentially abandoned, and they become eligible for closure.'
      : days >= 180
        ? 'WordPress.org shows an "untested with recent versions" warning at this age, which measurably suppresses installs.'
        : 'Prospective users read the "Last updated" date as a proxy for whether the plugin is maintained.';

  return {
    code: 'release.dormant',
    category: 'velocity',
    direction: 'negative',
    severity,
    title: `No release in ${days} days`,
    detail: `The last release shipped ${days} days ago. ${consequence}`,
    metric: { name: 'daysSinceLastRelease', value: days, unit: 'days', threshold: 90 },
    evidence: [
      { label: 'Days since last release', value: fmtInt(days), source: last.source },
      {
        label: 'Last released version',
        value: releasedVersions(ctx)[0]?.label ?? ctx.wpInfo?.version ?? 'unknown',
        source: last.source,
      },
      ...(ctx.wpInfo
        ? [
            {
              label: 'WP.org last updated',
              value: ctx.wpInfo.lastUpdated ? ctx.wpInfo.lastUpdated.toISOString().slice(0, 10) : 'unknown',
              source: 'wp.org',
              ref: `https://wordpress.org/plugins/${ctx.wpInfo.slug}/`,
            },
          ]
        : []),
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'release.dormant'),
    detectedAt: ctx.now,
  };
}

/**
 * Shipping cadence decelerating against the product's own history.
 *
 * Compares the mean gap across the last 3 releases with the mean across the 6
 * before them. Self-relative by design: a quarterly-release plugin isn't
 * "slowing" simply because it isn't weekly.
 */
export function detectCadenceSlowing(ctx: SignalContext): DetectedSignal | null {
  const released = releasedVersions(ctx);
  // Need 3 recent + 4 prior gaps to compare two means meaningfully.
  if (released.length < 8) return null;

  const gaps: number[] = [];
  for (let i = 0; i < released.length - 1; i++) {
    gaps.push((new Date(released[i].releasedAt!).getTime() - new Date(released[i + 1].releasedAt!).getTime()) / DAY);
  }

  const recent = gaps.slice(0, 3);
  const prior = gaps.slice(3, 9);
  if (prior.length < 3) return null;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recentMean = mean(recent);
  const priorMean = mean(prior);
  if (priorMean <= 0 || recentMean < priorMean * 1.5) return null;

  const slowdown = Math.round((recentMean / priorMean) * 10) / 10;

  return {
    code: 'release.cadence_slowing',
    category: 'velocity',
    direction: 'negative',
    severity: slowdown >= 3 ? 'high' : 'medium',
    title: 'Release cadence slowing',
    detail:
      `Recent releases are ${Math.round(recentMean)} days apart versus ${Math.round(priorMean)} days ` +
      `historically — ${slowdown}× slower. Sustained deceleration is the earliest visible sign of a ` +
      `product losing maintenance attention.`,
    metric: {
      name: 'meanDaysBetweenReleases',
      value: Math.round(recentMean),
      unit: 'days',
      delta: Math.round(recentMean - priorMean),
      window: 'last 3 releases',
      threshold: Math.round(priorMean * 1.5),
    },
    evidence: [
      { label: 'Recent gap (last 3 releases)', value: `${Math.round(recentMean)} days`, source: 'atrs.versions' },
      { label: 'Historical gap (prior 6)', value: `${Math.round(priorMean)} days`, source: 'atrs.versions' },
      { label: 'Releases on record', value: fmtInt(released.length), source: 'atrs.versions' },
    ],
    dataQuality: released.length >= 12 ? 0.95 : 0.8,
    fingerprint: signalFingerprint(ctx.productId, 'release.cadence_slowing'),
    detectedAt: ctx.now,
  };
}

/** Healthy cadence, stated positively so the scorecard can credit it. */
export function detectCadenceHealthy(ctx: SignalContext): DetectedSignal | null {
  const released = releasedVersions(ctx);
  if (released.length < 3) return null;

  const last = lastReleaseDate(ctx);
  if (!last) return null;
  const daysSince = (ctx.now.getTime() - last.date.getTime()) / DAY;

  const inLast180 = released.filter(
    (v) => (ctx.now.getTime() - new Date(v.releasedAt!).getTime()) / DAY <= 180,
  ).length;

  // Three-plus releases in six months, most recent within 60 days.
  if (inLast180 < 3 || daysSince > 60) return null;

  return {
    code: 'release.cadence_healthy',
    category: 'velocity',
    direction: 'positive',
    severity: 'info',
    title: 'Release cadence is healthy',
    detail:
      `${inLast180} releases shipped in the last 180 days, most recently ${Math.floor(daysSince)} days ago. ` +
      `Consistent shipping is what keeps the directory's "Last updated" signal working in your favour.`,
    metric: { name: 'releasesLast180d', value: inLast180, unit: 'releases', window: '180d', threshold: 3 },
    evidence: [
      { label: 'Releases (180d)', value: fmtInt(inLast180), source: 'atrs.versions' },
      { label: 'Days since last release', value: fmtInt(Math.floor(daysSince)), source: last.source },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'release.cadence_healthy'),
    detectedAt: ctx.now,
  };
}

/**
 * Completed work sitting in unreleased versions.
 *
 * Value that has been built but not shipped earns nothing, and the pile is
 * invisible on any dashboard that only counts releases.
 */
export function detectUnreleasedBacklog(ctx: SignalContext): DetectedSignal | null {
  const unreleased = ctx.versions.filter((v) => v.status === 'unreleased');
  if (unreleased.length === 0) return null;

  const unreleasedIds = new Set(unreleased.map((v) => String(v._id)));
  const pendingActivities = ctx.activities.filter(
    (a) => a.versionId && unreleasedIds.has(String(a.versionId)),
  );

  // One empty unreleased version is just a placeholder, not a backlog.
  if (pendingActivities.length === 0 && unreleased.length < 2) return null;

  const features = pendingActivities.filter((a) => a.type === 'feature').length;
  const fixes = pendingActivities.filter((a) => a.type === 'bug-fix').length;

  return {
    code: 'release.unreleased_backlog',
    category: 'velocity',
    direction: 'negative',
    severity: pendingActivities.length >= 10 ? 'medium' : 'low',
    title: `${pendingActivities.length} changes awaiting release`,
    detail:
      `${unreleased.length} unreleased version${unreleased.length === 1 ? '' : 's'} hold ` +
      `${pendingActivities.length} logged change${pendingActivities.length === 1 ? '' : 's'} ` +
      `(${features} feature${features === 1 ? '' : 's'}, ${fixes} fix${fixes === 1 ? '' : 'es'}). ` +
      `Shipping smaller increments gets that value to users sooner and shortens the feedback loop.`,
    metric: { name: 'unreleasedChanges', value: pendingActivities.length, unit: 'changes', threshold: 1 },
    evidence: [
      { label: 'Unreleased versions', value: unreleased.map((v) => v.label).join(', ') || fmtInt(unreleased.length), source: 'atrs.versions' },
      { label: 'Pending features', value: fmtInt(features), source: 'atrs.activities' },
      { label: 'Pending fixes', value: fmtInt(fixes), source: 'atrs.activities' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'release.unreleased_backlog'),
    detectedAt: ctx.now,
  };
}

/**
 * Released versions with no changelog content.
 *
 * This replaces the old hardcoded `changelogQuality: 80` placeholder with the
 * real figure: the share of shipped versions that actually tell users what
 * changed.
 */
export function detectIncompleteChangelog(ctx: SignalContext): DetectedSignal | null {
  const released = releasedVersions(ctx);
  if (released.length < 3) return null;

  const activityByVersion = new Set(ctx.activities.filter((a) => a.versionId).map((a) => String(a.versionId)));
  const undocumented = released.filter(
    (v) => !activityByVersion.has(String(v._id)) && !(v.notes && v.notes.trim().length > 20),
  );

  const coverage = ((released.length - undocumented.length) / released.length) * 100;
  if (coverage >= 80) return null;

  return {
    code: 'changelog.incomplete',
    category: 'velocity',
    direction: 'negative',
    severity: coverage < 50 ? 'medium' : 'low',
    title: `${Math.round(100 - coverage)}% of releases undocumented`,
    detail:
      `${undocumented.length} of ${released.length} released versions have neither changelog entries nor ` +
      `release notes (${fmtPct(coverage)} documented). Undocumented releases erode the upgrade confidence ` +
      `that drives users to update promptly.`,
    metric: {
      name: 'changelogCoverage',
      value: Math.round(coverage),
      unit: '%',
      threshold: 80,
    },
    evidence: [
      { label: 'Documented releases', value: `${released.length - undocumented.length} of ${released.length}`, source: 'atrs.versions' },
      { label: 'Coverage', value: fmtPct(coverage), source: 'atrs.versions' },
      {
        label: 'Undocumented versions',
        value: undocumented.slice(0, 6).map((v) => v.label).join(', ') + (undocumented.length > 6 ? ', …' : ''),
        source: 'atrs.versions',
      },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'changelog.incomplete'),
    detectedAt: ctx.now,
  };
}

/** No logged development activity at all — the product record has gone quiet. */
export function detectNoRecentActivity(ctx: SignalContext): DetectedSignal | null {
  const from = new Date(ctx.now.getTime() - 60 * DAY);
  const recent = ctx.activities.filter((a) => new Date(a.activityDate) >= from);
  if (recent.length > 0) return null;
  // A product with no history at all is a setup gap, not a dormancy signal.
  if (ctx.activities.length === 0) return null;

  const newest = ctx.activities[0];
  const days = Math.floor((ctx.now.getTime() - new Date(newest.activityDate).getTime()) / DAY);

  return {
    code: 'activity.no_recent',
    category: 'velocity',
    direction: 'negative',
    severity: 'low',
    title: 'No development activity logged in 60 days',
    detail:
      `The last recorded change was "${newest.title}" ${days} days ago. ` +
      `Either development has paused or work is shipping without being logged — the second case ` +
      `quietly degrades every metric on this page.`,
    metric: { name: 'daysSinceLastActivity', value: days, unit: 'days', threshold: 60 },
    evidence: [
      { label: 'Days since last logged change', value: fmtInt(days), source: 'atrs.activities' },
      { label: 'Last change', value: newest.title, source: 'atrs.activities', ref: String(newest._id) },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'activity.no_recent'),
    detectedAt: ctx.now,
  };
}

export const velocityDetectors = [
  detectDormant,
  detectCadenceSlowing,
  detectCadenceHealthy,
  detectUnreleasedBacklog,
  detectIncompleteChangelog,
  detectNoRecentActivity,
];
