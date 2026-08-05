import { describe, it, expect } from 'vitest';
import { computeRice, type RiceInput } from '../../services/intelligence/roadmap/rice';
import type { SignalCode, SignalSeverity } from '../../services/intelligence/signals/types';

/**
 * Tests for RICE scoring.
 *
 * RICE is trivially easy to fake: four numbers, no visible provenance. The
 * behaviour worth protecting here is not the arithmetic but the *basis strings* —
 * every input has to explain where it came from, and when a quantity genuinely
 * cannot be measured the score has to say so rather than emit an authoritative
 * looking figure.
 */

type Signal = RiceInput['signals'][number];

/** A supporting signal — only severity, dataQuality and code are read. */
function signal(severity: SignalSeverity, dataQuality: number, code: SignalCode = 'bug.critical_open'): Signal {
  return { severity, dataQuality, code };
}

type Issue = NonNullable<RiceInput['issues']>[number];

function issue(estimatedHours: number | undefined): Issue {
  return { estimatedHours, severity: 'high' };
}

describe('computeRice — reach', () => {
  it('is installs times the documented affected fraction', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 1)],
      activeInstalls: 10_000,
    });
    // stability_high is documented at 30%.
    expect(rice.reach).toBe(3_000);
  });

  it('explains the arithmetic in words', () => {
    const rice = computeRice({
      category: 'security',
      signals: [signal('critical', 1, 'security.vulnerability_present')],
      activeInstalls: 12_500,
    });
    // The basis has to carry the install count, the percentage and the reason for
    // it, so a user can disagree with the assumption rather than just the number.
    expect(rice.reachBasis).toContain('12,500 active installs');
    expect(rice.reachBasis).toContain('100%');
    expect(rice.reachBasis).toContain('security advisories put every installation at risk');
    expect(rice.reach).toBe(12_500);
  });

  it('scales the fraction with severity for stability work', () => {
    const base = { category: 'stability', activeInstalls: 10_000 } as const;
    const critical = computeRice({ ...base, signals: [signal('critical', 1)] });
    const high = computeRice({ ...base, signals: [signal('high', 1)] });
    const medium = computeRice({ ...base, signals: [signal('medium', 1)] });
    // Severity describes blast radius when hit, so the affected fraction — not
    // just the impact multiplier — moves with it.
    expect(critical.reach).toBeGreaterThan(high.reach);
    expect(high.reach).toBeGreaterThan(medium.reach);
  });

  it('falls back to fallbackReachCount and says so when installs are unknown', () => {
    const rice = computeRice({
      category: 'feature',
      signals: [signal('medium', 0.6, 'competitive.feature_gap')],
      activeInstalls: null,
      fallbackReachCount: 5,
      fallbackReachLabel: 'competitor readmes advertising it',
    });
    expect(rice.reach).toBe(5);
    // The substitution must be visible; a bare "5" would read as a measurement.
    expect(rice.reachBasis).toContain('Active install count unavailable');
    expect(rice.reachBasis).toContain('competitor readmes advertising it');
  });

  it('applies the silent-user multiplier to support-derived reach and names it', () => {
    const rice = computeRice({
      category: 'support',
      signals: [signal('medium', 0.8, 'support.resolution_low')],
      activeInstalls: null,
      fallbackReachCount: 12,
      fallbackReachLabel: 'unresolved threads',
    });
    expect(rice.reach).toBe(12 * 26);
    // The heuristic is an assumption, not data, so it is stated inline.
    expect(rice.reachBasis).toContain('× 26');
    expect(rice.reachBasis).toContain('without reporting it');
  });

  it('does not apply the silent-user multiplier outside support work', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 1)],
      activeInstalls: null,
      fallbackReachCount: 12,
    });
    expect(rice.reach).toBe(12);
  });

  it('prefers real installs over the fallback when both are available', () => {
    const rice = computeRice({
      category: 'support',
      signals: [signal('medium', 1, 'support.resolution_low')],
      activeInstalls: 4_000,
      fallbackReachCount: 12,
    });
    // support is documented at 15%.
    expect(rice.reach).toBe(600);
    expect(rice.reachBasis).toContain('4,000 active installs');
  });

  it('states that reach could not be measured when nothing is countable', () => {
    const rice = computeRice({ category: 'feature', signals: [signal('medium', 0.7)], activeInstalls: null });
    // A nominal 1 keeps the item comparable on impact and effort. What matters is
    // that the basis refuses to invent a population figure.
    expect(rice.reach).toBe(1);
    expect(rice.reachBasis).toContain('Reach could not be measured');
    expect(rice.reachBasis).toMatch(/no active install count/i);
  });

  it('treats a zero install count as unknown rather than as zero users', () => {
    const rice = computeRice({ category: 'feature', signals: [signal('medium', 0.7)], activeInstalls: 0 });
    // WP.org reports 0 for brand-new plugins; multiplying by a fraction would
    // give every item a score of 0 and make the roadmap unorderable.
    expect(rice.reach).toBe(1);
    expect(rice.reachBasis).toContain('Reach could not be measured');
  });

  it('honours an explicit fractionKey over the category default', () => {
    const rice = computeRice({
      category: 'discoverability',
      signals: [signal('medium', 1, 'aso.listing_incomplete')],
      activeInstalls: 10_000,
      fractionKey: 'compliance',
    });
    expect(rice.reach).toBe(10_000);
  });
});

describe('computeRice — impact', () => {
  it('rises to 3 (massive) when a contributing signal is critical severity', () => {
    const rice = computeRice({ category: 'stability', signals: [signal('critical', 1)], activeInstalls: 1_000 });
    expect(rice.impact).toBe(3);
    expect(rice.impactBasis).toContain('critical severity');
  });

  it('takes the peak severity across signals, not the first or the mean', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('low', 1), signal('critical', 1), signal('medium', 1)],
      activeInstalls: 1_000,
    });
    // One critical observation is release-blocking regardless of how much calmer
    // its companions are, so averaging severity would hide it.
    expect(rice.impact).toBe(3);
  });

  it('halves impact for low and info severity', () => {
    const low = computeRice({ category: 'stability', signals: [signal('low', 1)], activeInstalls: 1_000 });
    const info = computeRice({ category: 'stability', signals: [signal('info', 1)], activeInstalls: 1_000 });
    expect(low.impact).toBe(1);
    expect(info.impact).toBe(1);
    expect(low.impactBasis).toContain('reduced');
  });

  it('never falls below the minimal multiplier', () => {
    const rice = computeRice({ category: 'process', signals: [signal('info', 1)], activeInstalls: 1_000 });
    expect(rice.impact).toBe(0.25);
  });

  it('uses the category baseline when severity is neither critical nor low', () => {
    const rice = computeRice({ category: 'stability', signals: [signal('high', 1)], activeInstalls: 1_000 });
    expect(rice.impact).toBe(2);
    expect(rice.impactBasis).toContain('baseline impact');
  });
});

describe('computeRice — confidence', () => {
  it('is the mean dataQuality of the supplied signals', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 0.6, 'bug.aging_backlog'), signal('high', 1, 'bug.spike')],
      activeInstalls: 1_000,
    });
    // Confidence reuses the same data-sufficiency number that governs how much we
    // trust the observation, rather than being a separate judgement call.
    expect(rice.confidence).toBe(0.8);
    expect(rice.confidenceBasis).toContain('Mean data quality of 2 supporting signals');
  });

  it('names the contributing signal codes', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 1, 'bug.aging_backlog')],
      activeInstalls: 1_000,
    });
    expect(rice.confidenceBasis).toContain('bug.aging_backlog');
  });

  it('falls back to a neutral 0.5 with no signals, and says so', () => {
    const rice = computeRice({ category: 'feature', signals: [], activeInstalls: 1_000 });
    expect(rice.confidence).toBe(0.5);
    expect(rice.confidenceBasis).toContain('No supporting signals');
  });
});

describe('computeRice — effort', () => {
  it('sums logged estimatedHours and divides by a 40-hour week', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 1)],
      activeInstalls: 1_000,
      issues: [issue(40), issue(20)],
    });
    expect(rice.effort).toBe(1.5);
    expect(rice.effortBasis).toContain('60 estimated hours logged across 2 issue(s)');
  });

  it('uses the category default when no hours are logged, and labels it a default', () => {
    const rice = computeRice({
      category: 'feature',
      signals: [signal('medium', 1)],
      activeInstalls: 1_000,
      issues: [issue(undefined)],
    });
    // The two effort sources have very different authority, so the basis has to
    // distinguish a real estimate from a category guess.
    expect(rice.effort).toBe(3);
    expect(rice.effortBasis).toContain('No estimated hours logged');
    expect(rice.effortBasis).toContain('default for feature work');
  });

  it('lets an explicit effortWeeks override both', () => {
    const rice = computeRice({
      category: 'feature',
      signals: [signal('medium', 1)],
      activeInstalls: 1_000,
      issues: [issue(40)],
      effortWeeks: 0.25,
    });
    expect(rice.effort).toBe(0.25);
    expect(rice.effortBasis).toContain('supplied as 0.25');
  });

  it('floors effort so the score can never divide by zero', () => {
    const rice = computeRice({
      category: 'feature',
      signals: [signal('medium', 1)],
      activeInstalls: 1_000,
      effortWeeks: 0,
    });
    expect(rice.effort).toBe(0.1);
    expect(Number.isFinite(rice.score)).toBe(true);
  });
});

describe('computeRice — score', () => {
  it('is (reach × impact × confidence) / effort', () => {
    const rice = computeRice({
      category: 'stability',
      signals: [signal('high', 0.8)],
      activeInstalls: 10_000,
      issues: [issue(60)],
    });
    // 3,000 × 2 × 0.8 / 1.5 = 3,200.
    expect(rice.reach).toBe(3_000);
    expect(rice.impact).toBe(2);
    expect(rice.confidence).toBe(0.8);
    expect(rice.effort).toBe(1.5);
    expect(rice.score).toBe(3_200);
  });

  it('is reproducible for identical input', () => {
    const input: RiceInput = {
      category: 'compliance',
      signals: [signal('high', 0.9, 'compat.wp_tested_stale')],
      activeInstalls: 5_000,
    };
    expect(computeRice(input)).toEqual(computeRice(input));
  });
});
