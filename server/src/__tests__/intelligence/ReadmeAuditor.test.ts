import { describe, it, expect } from 'vitest';
import { ReadmeAuditor, type AuditCheck } from '../../services/intelligence/ReadmeAuditor';
import type { WpPluginInfo } from '../../services/intelligence/wporg/WpOrgClient';

/**
 * Tests for the deterministic listing audit.
 *
 * Everything this class judges is objectively checkable from the published
 * listing, so the tests assert the exact rules. The load-bearing behaviour is the
 * `unknown` status: when upstream data is missing we must neither guess nor
 * penalise, because a listing scored 60 for reasons the user cannot act on is
 * worse than no score at all.
 */

/** An empty listing; every check should fail or be unknown. */
function emptyInfo(overrides: Partial<WpPluginInfo> = {}): WpPluginInfo {
  return {
    slug: 'demo-plugin',
    name: 'Demo Plugin',
    version: '1.0.0',
    author: 'Demo Author',
    authorProfile: null,
    homepage: null,
    shortDescription: '',
    sections: {},
    tags: [],
    rating: null,
    numRatings: 0,
    ratings: null,
    activeInstalls: null,
    downloaded: null,
    supportThreads: null,
    supportThreadsResolved: null,
    lastUpdated: null,
    added: null,
    requires: null,
    requiresPhp: null,
    testedUpTo: null,
    versions: {},
    screenshotCount: 0,
    hasBanner: false,
    hasIcon: false,
    donateLink: null,
    contributorCount: 0,
    fetchedAt: new Date('2026-07-30T00:00:00.000Z'),
    ...overrides,
  };
}

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

/** A listing that passes every check, for the "near 100" baseline. */
function completeInfo(overrides: Partial<WpPluginInfo> = {}): WpPluginInfo {
  return emptyInfo({
    // 100 characters — inside the 90–150 visible window.
    shortDescription: 'A'.repeat(100),
    sections: {
      description: `<p>${words(320)}</p>`,
      faq: '<h4>Does it work?</h4><p>Yes.</p><h4>Is it free?</h4><p>Yes.</p><h4>Does it scale?</h4><p>Yes.</p>',
      changelog: `<p>${words(80)}</p>`,
      installation: `<p>${words(40)}</p>`,
    },
    tags: ['gallery', 'lightbox', 'slider', 'images'],
    screenshotCount: 4,
    hasBanner: true,
    hasIcon: true,
    requiresPhp: '7.4',
    testedUpTo: '6.9',
    ...overrides,
  });
}

const check = (checks: AuditCheck[], id: string): AuditCheck => {
  const found = checks.find((c) => c.id === id);
  if (!found) throw new Error(`no check with id ${id}`);
  return found;
};

describe('ReadmeAuditor.audit', () => {
  it('scores a complete listing at 100', () => {
    expect(ReadmeAuditor.audit(completeInfo(), '6.9').score).toBe(100);
  });

  it('scores an empty listing at 0', () => {
    expect(ReadmeAuditor.audit(emptyInfo(), '6.9').score).toBe(0);
  });

  it('returns the audited slug and a timestamp', () => {
    const audit = ReadmeAuditor.audit(completeInfo(), '6.9');
    expect(audit.slug).toBe('demo-plugin');
    expect(audit.auditedAt).toBeInstanceOf(Date);
  });

  it('gives every check a rule so the score is arguable', () => {
    for (const c of ReadmeAuditor.audit(emptyInfo(), '6.9').checks) {
      expect(c.rule.length).toBeGreaterThan(0);
      expect(c.finding.length).toBeGreaterThan(0);
      expect(c.points).toBeLessThanOrEqual(c.weight);
    }
  });

  it('attaches a concrete fix to every non-passing check', () => {
    for (const c of ReadmeAuditor.audit(emptyInfo(), '6.9').checks) {
      if (c.status === 'fail' || c.status === 'warn') expect(c.fix).toBeTruthy();
      if (c.status === 'pass') expect(c.fix).toBeUndefined();
    }
  });
});

describe('ReadmeAuditor.audit — unknown checks are excluded from the denominator', () => {
  it('keeps a perfect listing at 100 when the current WP version is unavailable', () => {
    const audit = ReadmeAuditor.audit(completeInfo(), null);
    // Missing upstream data is our problem, not the plugin author's. Scoring the
    // testedUpTo check as 0/14 here would report an otherwise perfect listing at
    // 86 and send the user chasing a non-existent defect.
    expect(check(audit.checks, 'testedUpTo').status).toBe('unknown');
    expect(audit.score).toBe(100);
  });

  it('marks testedUpTo unknown when the plugin publishes no value', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ testedUpTo: null }), '6.9');
    expect(check(audit.checks, 'testedUpTo').status).toBe('unknown');
    expect(audit.score).toBe(100);
  });

  it('excludes unknown checks from topOpportunities too', () => {
    const audit = ReadmeAuditor.audit(completeInfo(), null);
    expect(audit.topOpportunities.map((c) => c.id)).not.toContain('testedUpTo');
  });
});

describe('ReadmeAuditor.audit — short description', () => {
  it('passes between 90 and 150 characters inclusive', () => {
    for (const len of [90, 120, 150]) {
      const audit = ReadmeAuditor.audit(completeInfo({ shortDescription: 'A'.repeat(len) }), '6.9');
      expect(check(audit.checks, 'shortDescription').status).toBe('pass');
    }
  });

  it('warns above 150 characters because WP.org truncates there', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ shortDescription: 'A'.repeat(200) }), '6.9');
    const c = check(audit.checks, 'shortDescription');
    expect(c.status).toBe('warn');
    // The finding must state the truncation limit — the author cannot see the
    // cut-off in their own readme, only in search results.
    expect(c.finding).toContain('truncates at 150');
  });

  it('warns below 90 characters for wasting the visible line', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ shortDescription: 'Short and sweet.' }), '6.9');
    const c = check(audit.checks, 'shortDescription');
    expect(c.status).toBe('warn');
    expect(c.finding).toContain('under-using');
  });

  it('fails outright when there is no short description', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ shortDescription: '' }), '6.9');
    expect(check(audit.checks, 'shortDescription').status).toBe('fail');
    expect(check(audit.checks, 'shortDescription').points).toBe(0);
  });

  it('awards half weight for a warn', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ shortDescription: 'A'.repeat(200) }), '6.9');
    const c = check(audit.checks, 'shortDescription');
    expect(c.points).toBe(Math.round(c.weight * 0.5));
  });
});

describe('ReadmeAuditor.audit — tags', () => {
  it('passes with 4 or 5 tags', () => {
    for (const tags of [['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd', 'e']]) {
      const audit = ReadmeAuditor.audit(completeInfo({ tags }), '6.9');
      expect(check(audit.checks, 'tags').status).toBe('pass');
    }
  });

  it('fails with no tags', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ tags: [] }), '6.9');
    const c = check(audit.checks, 'tags');
    expect(c.status).toBe('fail');
    expect(c.points).toBe(0);
    expect(c.finding).toContain('No tags set');
  });

  it('warns when under-using the 5 indexable slots', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ tags: ['gallery', 'lightbox'] }), '6.9');
    expect(check(audit.checks, 'tags').status).toBe('warn');
  });

  it('warns when exceeding 5, since WP.org only indexes the first 5', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }), '6.9');
    const c = check(audit.checks, 'tags');
    expect(c.status).toBe('warn');
    expect(c.finding).toContain('only indexes the first 5');
  });
});

describe('ReadmeAuditor.audit — tested up to freshness', () => {
  it('passes when it matches the current release', () => {
    const audit = ReadmeAuditor.audit(completeInfo({ testedUpTo: '6.9' }), '6.9');
    expect(check(audit.checks, 'testedUpTo').status).toBe('pass');
  });

  it('warns one minor behind and fails at two or more', () => {
    // WP.org shows a compatibility warning from the first minor behind and
    // visibly suppresses installs at two.
    expect(check(ReadmeAuditor.audit(completeInfo({ testedUpTo: '6.8' }), '6.9').checks, 'testedUpTo').status).toBe('warn');
    expect(check(ReadmeAuditor.audit(completeInfo({ testedUpTo: '6.7' }), '6.9').checks, 'testedUpTo').status).toBe('fail');
  });
});

describe('ReadmeAuditor.audit — screenshots, description and FAQ', () => {
  it('needs 3 screenshots to pass, warns at 1–2, fails at 0', () => {
    expect(check(ReadmeAuditor.audit(completeInfo({ screenshotCount: 3 }), '6.9').checks, 'screenshots').status).toBe('pass');
    expect(check(ReadmeAuditor.audit(completeInfo({ screenshotCount: 2 }), '6.9').checks, 'screenshots').status).toBe('warn');
    expect(check(ReadmeAuditor.audit(completeInfo({ screenshotCount: 0 }), '6.9').checks, 'screenshots').status).toBe('fail');
  });

  it('measures description depth in words after stripping HTML', () => {
    const shallow = completeInfo({
      sections: { ...completeInfo().sections, description: `<p><strong>${words(150)}</strong></p>` },
    });
    const c = check(ReadmeAuditor.audit(shallow, '6.9').checks, 'descriptionDepth');
    // Tag names must not be counted as words, or markup alone would pass the check.
    expect(c.status).toBe('warn');
    expect(c.finding).toContain('150 words');
  });

  it('counts FAQ entries by heading', () => {
    const twoQuestions = completeInfo({
      sections: { ...completeInfo().sections, faq: '<h4>One?</h4><p>a</p><h4>Two?</h4><p>b</p>' },
    });
    const c = check(ReadmeAuditor.audit(twoQuestions, '6.9').checks, 'faq');
    expect(c.status).toBe('warn');
    expect(c.finding).toContain('2 FAQ entries');
  });
});

describe('ReadmeAuditor.audit — topOpportunities', () => {
  it('orders failing checks by recoverable points', () => {
    const audit = ReadmeAuditor.audit(emptyInfo(), '6.9');
    const recoverable = audit.topOpportunities.map((c) => c.weight - c.points);
    // Ordering by what the user gets back is the only ranking that tells them
    // where to spend the next hour.
    expect(recoverable).toEqual([...recoverable].sort((a, b) => b - a));
    expect(audit.topOpportunities[0].id).toBe('screenshots');
  });

  it('caps the list at five', () => {
    expect(ReadmeAuditor.audit(emptyInfo(), '6.9').topOpportunities).toHaveLength(5);
  });

  it('lists only failing and warning checks', () => {
    for (const c of ReadmeAuditor.audit(emptyInfo(), '6.9').topOpportunities) {
      expect(['fail', 'warn']).toContain(c.status);
    }
  });

  it('is empty for a complete listing', () => {
    expect(ReadmeAuditor.audit(completeInfo(), '6.9').topOpportunities).toEqual([]);
  });
});
