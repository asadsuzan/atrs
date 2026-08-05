import type { SignalContext } from '../context';
import { type DetectedSignal, fmtInt, fmtPct, signalFingerprint } from '../types';
import type { IIssue } from '../../../../models/Issue';

/**
 * Stability detectors — read the issue tracker and report on defect load.
 *
 * These run entirely on ATRS-internal data, so they work for standalone products
 * with no WP.org presence. Every threshold is stated in the emitted metric so the
 * rule that fired stays visible to the user.
 */

const DAY = 86_400_000;

const isOpen = (i: IIssue) => i.status === 'open' || i.status === 'in-progress';

/** Any open bug at critical severity — the top of the "should we ship?" question. */
export function detectCriticalOpen(ctx: SignalContext): DetectedSignal | null {
  const criticals = ctx.issues.filter((i) => isOpen(i) && i.severity === 'critical');
  if (criticals.length === 0) return null;

  const oldest = criticals.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
  const ageDays = Math.floor((ctx.now.getTime() - new Date(oldest.createdAt).getTime()) / DAY);

  return {
    code: 'bug.critical_open',
    category: 'stability',
    direction: 'negative',
    // A single critical is already release-blocking; several means the product is on fire.
    severity: criticals.length >= 3 ? 'critical' : 'high',
    title: `${criticals.length} critical bug${criticals.length === 1 ? '' : 's'} open`,
    detail:
      `${criticals.length} critical-severity issue${criticals.length === 1 ? ' is' : 's are'} unresolved. ` +
      `The oldest, "${oldest.title}", has been open for ${ageDays} day${ageDays === 1 ? '' : 's'}.`,
    metric: { name: 'openCriticalIssues', value: criticals.length, unit: 'issues', threshold: 1 },
    evidence: [
      { label: 'Open critical issues', value: fmtInt(criticals.length), source: 'atrs.issues' },
      { label: 'Oldest open critical', value: `${oldest.title} (${ageDays}d)`, source: 'atrs.issues', ref: String(oldest._id) },
      {
        label: 'Open high-severity issues',
        value: fmtInt(ctx.issues.filter((i) => isOpen(i) && i.severity === 'high').length),
        source: 'atrs.issues',
      },
    ],
    // Counting rows in our own database is as certain as data gets.
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'bug.critical_open'),
    detectedAt: ctx.now,
  };
}

/**
 * Bugs arriving faster than they're closed over 30 days.
 *
 * Uses a ratio rather than a raw difference so the rule scales: 12 in / 6 out is
 * the same structural problem as 2 in / 1 out, but only the former warrants
 * raised severity.
 */
export function detectInflowExceedsOutflow(ctx: SignalContext): DetectedSignal | null {
  const from = new Date(ctx.now.getTime() - 30 * DAY);
  const created = ctx.issues.filter((i) => new Date(i.createdAt) >= from).length;
  const resolved = ctx.issues.filter((i) => i.resolvedAt && new Date(i.resolvedAt) >= from).length;

  // Below 4 new bugs a month the ratio is noise, not a trend.
  if (created < 4 || created <= resolved) return null;

  const ratio = resolved === 0 ? Infinity : created / resolved;
  const netGrowth = created - resolved;

  return {
    code: 'bug.inflow_exceeds_outflow',
    category: 'stability',
    direction: 'negative',
    severity: ratio >= 2 ? 'high' : 'medium',
    title: 'Bug backlog is growing',
    detail:
      `Over the last 30 days ${created} issues were reported and ${resolved} resolved, ` +
      `a net increase of ${netGrowth}. At this rate the backlog doubles roughly every ` +
      `${netGrowth > 0 ? Math.max(1, Math.round(ctx.issues.filter(isOpen).length / netGrowth)) : 0} months.`,
    metric: {
      name: 'bugNetGrowth30d',
      value: netGrowth,
      unit: 'issues',
      window: '30d',
      threshold: 0,
    },
    evidence: [
      { label: 'Reported (30d)', value: fmtInt(created), source: 'atrs.issues' },
      { label: 'Resolved (30d)', value: fmtInt(resolved), source: 'atrs.issues' },
      {
        label: 'Resolution rate',
        value: created > 0 ? fmtPct((resolved / created) * 100) : 'unknown',
        source: 'atrs.issues',
      },
      { label: 'Total open', value: fmtInt(ctx.issues.filter(isOpen).length), source: 'atrs.issues' },
    ],
    dataQuality: created >= 10 ? 1 : 0.75,
    fingerprint: signalFingerprint(ctx.productId, 'bug.inflow_exceeds_outflow'),
    detectedAt: ctx.now,
  };
}

/** The mirror case: backlog shrinking. Worth saying so — trust needs good news to be credible. */
export function detectBacklogClearing(ctx: SignalContext): DetectedSignal | null {
  const from = new Date(ctx.now.getTime() - 30 * DAY);
  const created = ctx.issues.filter((i) => new Date(i.createdAt) >= from).length;
  const resolved = ctx.issues.filter((i) => i.resolvedAt && new Date(i.resolvedAt) >= from).length;

  if (resolved < 3 || resolved <= created) return null;

  return {
    code: 'bug.backlog_clearing',
    category: 'stability',
    direction: 'positive',
    severity: 'info',
    title: 'Bug backlog is shrinking',
    detail:
      `${resolved} issues were resolved against ${created} reported in the last 30 days — ` +
      `a net reduction of ${resolved - created}.`,
    metric: { name: 'bugNetGrowth30d', value: created - resolved, unit: 'issues', window: '30d', threshold: 0 },
    evidence: [
      { label: 'Resolved (30d)', value: fmtInt(resolved), source: 'atrs.issues' },
      { label: 'Reported (30d)', value: fmtInt(created), source: 'atrs.issues' },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'bug.backlog_clearing'),
    detectedAt: ctx.now,
  };
}

/**
 * High-severity issues left open past 30 days.
 *
 * Aging matters independently of count: one high-severity bug ignored for four
 * months says something about triage that "3 open bugs" does not.
 */
export function detectAgingBacklog(ctx: SignalContext): DetectedSignal | null {
  const threshold = 30;
  const stale = ctx.issues.filter(
    (i) =>
      isOpen(i) &&
      (i.severity === 'critical' || i.severity === 'high') &&
      (ctx.now.getTime() - new Date(i.createdAt).getTime()) / DAY > threshold,
  );
  if (stale.length === 0) return null;

  const ages = stale.map((i) => Math.floor((ctx.now.getTime() - new Date(i.createdAt).getTime()) / DAY));
  const maxAge = Math.max(...ages);
  const medianAge = ages.sort((a, b) => a - b)[Math.floor(ages.length / 2)];

  return {
    code: 'bug.aging_backlog',
    category: 'stability',
    direction: 'negative',
    severity: maxAge > 120 ? 'high' : 'medium',
    title: `${stale.length} high-severity issue${stale.length === 1 ? '' : 's'} aging`,
    detail:
      `${stale.length} critical or high-severity issue${stale.length === 1 ? ' has' : 's have'} been open ` +
      `longer than ${threshold} days (median ${medianAge}d, oldest ${maxAge}d). ` +
      `Long-lived severe bugs are the most common source of 1-star reviews.`,
    metric: { name: 'agingSevereIssues', value: stale.length, unit: 'issues', threshold },
    evidence: [
      { label: `Severe issues older than ${threshold}d`, value: fmtInt(stale.length), source: 'atrs.issues' },
      { label: 'Median age', value: `${medianAge} days`, source: 'atrs.issues' },
      {
        label: 'Oldest',
        value: `${stale.find((i) => (ctx.now.getTime() - new Date(i.createdAt).getTime()) / DAY === maxAge)?.title ?? 'unknown'} (${maxAge}d)`,
        source: 'atrs.issues',
      },
    ],
    dataQuality: 1,
    fingerprint: signalFingerprint(ctx.productId, 'bug.aging_backlog'),
    detectedAt: ctx.now,
  };
}

/**
 * A sudden burst of new issues versus the product's own baseline.
 *
 * Compares the last 7 days against the mean weekly rate over the preceding 90,
 * so a plugin that normally gets 10 bugs a week isn't flagged for getting 11,
 * while a normally-quiet plugin getting 6 in a week is.
 */
export function detectBugSpike(ctx: SignalContext): DetectedSignal | null {
  const recentFrom = new Date(ctx.now.getTime() - 7 * DAY);
  const baselineFrom = new Date(ctx.now.getTime() - 97 * DAY);

  const recent = ctx.issues.filter((i) => new Date(i.createdAt) >= recentFrom).length;
  const baselineIssues = ctx.issues.filter(
    (i) => new Date(i.createdAt) >= baselineFrom && new Date(i.createdAt) < recentFrom,
  ).length;
  const baselineWeekly = baselineIssues / (90 / 7);

  // Need a real baseline and a real burst; 3 issues is the floor for "burst".
  if (baselineIssues < 4 || recent < 3) return null;
  if (recent < baselineWeekly * 2) return null;

  const multiple = baselineWeekly > 0 ? Math.round((recent / baselineWeekly) * 10) / 10 : null;

  return {
    code: 'bug.spike',
    category: 'stability',
    direction: 'negative',
    severity: multiple !== null && multiple >= 3 ? 'high' : 'medium',
    title: 'Issue reports spiking',
    detail:
      `${recent} issues were reported in the last 7 days against a 90-day average of ` +
      `${Math.round(baselineWeekly * 10) / 10} per week` +
      `${multiple ? ` — ${multiple}× the normal rate` : ''}. ` +
      `A spike this sharp usually follows a release regression.`,
    metric: {
      name: 'issuesLast7d',
      value: recent,
      unit: 'issues',
      window: '7d',
      threshold: Math.round(baselineWeekly * 2 * 10) / 10,
    },
    evidence: [
      { label: 'Reported (7d)', value: fmtInt(recent), source: 'atrs.issues' },
      { label: '90-day weekly average', value: String(Math.round(baselineWeekly * 10) / 10), source: 'atrs.issues' },
      {
        label: 'Most recent release',
        value: latestReleaseLabel(ctx),
        source: 'atrs.versions',
      },
    ],
    dataQuality: baselineIssues >= 12 ? 0.9 : 0.7,
    fingerprint: signalFingerprint(ctx.productId, 'bug.spike'),
    detectedAt: ctx.now,
  };
}

function latestReleaseLabel(ctx: SignalContext): string {
  const released = ctx.versions
    .filter((v) => v.status === 'released' && v.releasedAt)
    .sort((a, b) => new Date(b.releasedAt!).getTime() - new Date(a.releasedAt!).getTime());
  if (released.length === 0) return 'none recorded';
  const v = released[0];
  const days = Math.floor((ctx.now.getTime() - new Date(v.releasedAt!).getTime()) / DAY);
  return `${v.label} (${days}d ago)`;
}

export const stabilityDetectors = [
  detectCriticalOpen,
  detectInflowExceedsOutflow,
  detectBacklogClearing,
  detectAgingBacklog,
  detectBugSpike,
];
