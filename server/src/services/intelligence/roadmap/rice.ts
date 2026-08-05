import type { RiceScore, RoadmapCategory } from '../../../models/RoadmapItem';
import type { ISignal } from '../../../models/Signal';
import type { IIssue } from '../../../models/Issue';
import { fmtInt } from '../signals/types';

/**
 * RICE scoring, derived from measured data rather than asserted by a model.
 *
 * RICE = (Reach × Impact × Confidence) / Effort. The framework is only as good as
 * its inputs, and the failure mode in AI product tools is inventing all four. Here:
 *
 *  - **Reach** is computed from the product's real active-install count and a
 *    documented affected-fraction per work type. When install count is unknown we
 *    say so in `reachBasis` and fall back to a countable proxy rather than guessing
 *    a number that looks authoritative.
 *  - **Impact** is a table lookup on category and severity, not a judgement call.
 *  - **Confidence** is the mean `dataQuality` of the supporting signals — the same
 *    number that already governs how much we trust the observation.
 *  - **Effort** uses logged `estimatedHours` when the team has entered them, and
 *    otherwise a per-category default that is stated as a default.
 */

/** Standard RICE impact multipliers. */
export const IMPACT = {
  massive: 3,
  high: 2,
  medium: 1,
  low: 0.5,
  minimal: 0.25,
} as const;

/**
 * Share of the install base a given kind of work touches.
 *
 * These are the load-bearing assumptions in the whole score, so they are stated
 * explicitly and reported to the user in `reachBasis` rather than buried.
 *
 * - Security advisories and directory-visible warnings affect everyone.
 * - A critical bug reaches most but not all users: severity describes blast
 *   radius when hit, not the probability of hitting it.
 * - Discoverability work affects prospective rather than current users, so its
 *   reach is expressed against the install base as a growth proxy.
 * - Feature gaps are the least certain: without usage telemetry we cannot know
 *   demand, so the fraction stays deliberately low.
 */
export const AFFECTED_FRACTION: Record<string, { fraction: number; note: string }> = {
  security: { fraction: 1.0, note: 'security advisories put every installation at risk' },
  compliance: { fraction: 1.0, note: 'directory compatibility warnings are shown to every prospective installer' },
  stability_critical: { fraction: 0.6, note: 'critical defects affect most but not all configurations' },
  stability_high: { fraction: 0.3, note: 'high-severity defects typically affect a subset of configurations' },
  stability_medium: { fraction: 0.12, note: 'medium-severity defects affect a narrow set of configurations' },
  reputation: { fraction: 0.5, note: 'rating and review perception affects roughly half of install decisions' },
  traction: { fraction: 0.4, note: 'retention work affects the segment at risk of churning' },
  discoverability: { fraction: 0.25, note: 'listing improvements affect prospective installers, scaled against current base' },
  support: { fraction: 0.15, note: 'support responsiveness affects users who hit a problem and speak up' },
  feature: { fraction: 0.1, note: 'without usage telemetry, feature demand is estimated conservatively' },
  tech_debt: { fraction: 0.05, note: 'internal work affects users only indirectly, via future delivery speed' },
  process: { fraction: 0.05, note: 'process work affects users indirectly, via future delivery speed' },
};

/**
 * Multiplier applied to support-derived reach.
 *
 * A long-standing support-industry heuristic holds that for each user who opens
 * a ticket, roughly 25 more hit the same problem silently. Applied only to
 * support-thread counts, and named in the basis string so the assumption is
 * visible rather than smuggled in.
 */
const SILENT_USER_MULTIPLIER = 26;

/** Person-week defaults per category, used only when no hours are logged. */
const DEFAULT_EFFORT_WEEKS: Record<RoadmapCategory, number> = {
  security: 0.5,
  stability: 1,
  compliance: 0.25,
  discoverability: 0.5,
  reputation: 0.75,
  support: 0.5,
  growth: 1.5,
  feature: 3,
  tech_debt: 2,
  process: 0.5,
};

/** Impact by category, before severity adjustment. */
const BASE_IMPACT: Record<RoadmapCategory, number> = {
  security: IMPACT.massive,
  stability: IMPACT.high,
  compliance: IMPACT.high,
  reputation: IMPACT.high,
  growth: IMPACT.high,
  discoverability: IMPACT.medium,
  support: IMPACT.medium,
  feature: IMPACT.medium,
  tech_debt: IMPACT.low,
  process: IMPACT.low,
};

export interface RiceInput {
  category: RoadmapCategory;
  /** Signals that generated the item; drives confidence and severity. */
  signals: Pick<ISignal, 'dataQuality' | 'severity' | 'code'>[];
  /** Real active installs, when the product is on WP.org. */
  activeInstalls: number | null;
  /** Issues the item would close, for effort from logged hours. */
  issues?: Pick<IIssue, 'estimatedHours' | 'severity'>[];
  /**
   * A countable quantity to use as reach when install count is unknown, e.g. the
   * number of unresolved support threads or affected issues.
   */
  fallbackReachCount?: number;
  fallbackReachLabel?: string;
  /** Overrides the affected-fraction key when the category alone is too coarse. */
  fractionKey?: string;
  /** Explicit effort in person-weeks, when the caller knows better. */
  effortWeeks?: number;
}

/** Peak severity across the contributing signals. */
function peakSeverity(signals: RiceInput['signals']): string {
  const order = ['info', 'low', 'medium', 'high', 'critical'];
  return signals.reduce((worst, s) => (order.indexOf(s.severity) > order.indexOf(worst) ? s.severity : worst), 'info');
}

export function computeRice(input: RiceInput): RiceScore {
  const severity = peakSeverity(input.signals);

  // --- Reach -----------------------------------------------------------------
  const fractionKey =
    input.fractionKey ??
    (input.category === 'stability' ? `stability_${severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium'}` : input.category);
  const fraction = AFFECTED_FRACTION[fractionKey] ?? AFFECTED_FRACTION[input.category] ?? { fraction: 0.1, note: 'conservative default' };

  let reach: number;
  let reachBasis: string;

  if (input.activeInstalls !== null && input.activeInstalls > 0) {
    reach = Math.round(input.activeInstalls * fraction.fraction);
    reachBasis =
      `${fmtInt(input.activeInstalls)} active installs × ${Math.round(fraction.fraction * 100)}% ` +
      `(${fraction.note}) = ${fmtInt(reach)} users per quarter.`;
  } else if (input.fallbackReachCount !== undefined && input.fallbackReachCount > 0) {
    // Support threads stand in for a much larger silent population; other
    // fallbacks are taken at face value.
    const isSupport = input.category === 'support';
    reach = isSupport ? input.fallbackReachCount * SILENT_USER_MULTIPLIER : input.fallbackReachCount;
    reachBasis = isSupport
      ? `Active install count unavailable. ${input.fallbackReachCount} ${input.fallbackReachLabel ?? 'reports'} ` +
        `× ${SILENT_USER_MULTIPLIER} (industry heuristic for users who hit a problem without reporting it) = ${fmtInt(reach)}.`
      : `Active install count unavailable. Using ${input.fallbackReachCount} ${input.fallbackReachLabel ?? 'affected records'} as reach.`;
  } else {
    // No install count and nothing countable: reach is genuinely unknown. A
    // nominal 1 keeps the item comparable on impact and effort without inventing
    // a population figure.
    reach = 1;
    reachBasis =
      'Reach could not be measured — no active install count and no countable affected records. ' +
      'Scored on impact and effort only; link a WordPress.org slug to enable reach.';
  }

  // --- Impact ---------------------------------------------------------------
  let impact = BASE_IMPACT[input.category];
  let impactNote = `${input.category} work carries a baseline impact of ${impact}`;
  if (severity === 'critical' && impact < IMPACT.massive) {
    impact = IMPACT.massive;
    impactNote = `raised to ${IMPACT.massive} (massive) because a contributing signal is critical severity`;
  } else if (severity === 'low' || severity === 'info') {
    impact = Math.max(IMPACT.minimal, impact / 2);
    impactNote = `reduced to ${impact} because the contributing signals are ${severity} severity`;
  }
  const impactBasis = `RICE impact ${impact}: ${impactNote}.`;

  // --- Confidence -----------------------------------------------------------
  const confidence =
    input.signals.length > 0
      ? Math.round((input.signals.reduce((sum, s) => sum + s.dataQuality, 0) / input.signals.length) * 100) / 100
      : 0.5;
  const confidenceBasis =
    input.signals.length > 0
      ? `Mean data quality of ${input.signals.length} supporting signal${input.signals.length === 1 ? '' : 's'} ` +
        `(${input.signals.map((s) => s.code).join(', ')}).`
      : 'No supporting signals; scored at the neutral default.';

  // --- Effort ---------------------------------------------------------------
  let effort: number;
  let effortBasis: string;

  const loggedHours = (input.issues ?? []).reduce((sum, i) => sum + (i.estimatedHours ?? 0), 0);
  if (input.effortWeeks !== undefined) {
    effort = Math.max(0.1, input.effortWeeks);
    effortBasis = `Effort supplied as ${effort} person-week${effort === 1 ? '' : 's'}.`;
  } else if (loggedHours > 0) {
    // 40h to a person-week.
    effort = Math.max(0.1, Math.round((loggedHours / 40) * 100) / 100);
    effortBasis = `${loggedHours} estimated hours logged across ${input.issues?.length ?? 0} issue(s) = ${effort} person-weeks.`;
  } else {
    effort = DEFAULT_EFFORT_WEEKS[input.category];
    effortBasis =
      `No estimated hours logged; using the ${effort}-person-week default for ${input.category} work. ` +
      `Add hour estimates to the linked issues for a sharper score.`;
  }

  const score = Math.round(((reach * impact * confidence) / effort) * 100) / 100;

  return { reach, impact, confidence, effort, score, reachBasis, impactBasis, confidenceBasis, effortBasis };
}
