import { describe, it, expect } from 'vitest';
import {
  compareVersions,
  computeCadence,
  extractFeatures,
  meanStars,
  negativeReviewShare,
  parseChangelog,
  parseLooseDate,
  wpVersionLag,
  type ChangelogEntry,
} from '../../services/intelligence/wporg/readme';

/**
 * Tests for the deterministic readme analysers.
 *
 * The whole point of this module is that market facts come from the published
 * readme rather than from an LLM or a hand-maintained field, so the tests here
 * concentrate on two things: that real-world readme shapes actually parse, and
 * that unknowns stay `null` instead of being filled in with a plausible guess.
 * A fabricated release date silently corrupts every cadence number downstream,
 * which is far worse than reporting "we don't know".
 */

const NOW = new Date('2026-07-30T00:00:00.000Z');
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

/** A dated changelog entry, since only the date matters to cadence maths. */
function entry(version: string, date: Date | null): ChangelogEntry {
  return { version, date, body: '' };
}

describe('extractFeatures', () => {
  it('pulls list items out of the description section', () => {
    const features = extractFeatures({
      sections: {
        description:
          '<p>A gallery plugin.</p><ul><li>Drag and drop gallery builder</li>' +
          '<li>Responsive lightbox with captions</li></ul>',
      },
      shortDescription: 'Galleries for WordPress.',
    });
    expect(features).toEqual(['Drag and drop gallery builder', 'Responsive lightbox with captions']);
  });

  it('drops marketing filler that describes no capability', () => {
    const features = extractFeatures({
      sections: {
        description:
          '<ul>' +
          '<li>Drag and drop gallery builder</li>' +
          '<li>Buy now and save 50%</li>' +
          '<li>5 star rated by thousands of users</li>' +
          '<li>Follow us on Twitter for updates</li>' +
          '<li>Read more on our blog about galleries</li>' +
          '</ul>',
      },
      shortDescription: '',
    });
    // Noise bullets in a gap matrix become phantom "competitor capabilities" we
    // then appear to be missing, so filtering them is a correctness concern and
    // not merely cosmetic.
    expect(features).toEqual(['Drag and drop gallery builder']);
  });

  it('dedupes repeated bullets across sections', () => {
    const features = extractFeatures({
      sections: {
        description: '<ul><li>Responsive lightbox with captions</li></ul>',
        features: '<ul><li>Responsive Lightbox with captions.</li></ul>',
      },
      shortDescription: '',
    });
    // Dedupe is case- and punctuation-insensitive, because the same bullet is
    // routinely repeated between the Description and Features sections with only
    // trivial differences. Features is the preferred section, so its wording wins.
    expect(features).toEqual(['Responsive Lightbox with captions']);
  });

  it('ignores the changelog and FAQ sections', () => {
    const features = extractFeatures({
      sections: {
        description: '<ul><li>Responsive lightbox with captions</li></ul>',
        changelog: '<h4>1.2.0</h4><ul><li>Added a brand new slider mode</li></ul>',
        faq: '<h4>Does it work?</h4><ul><li>Yes it works with every theme</li></ul>',
        upgrade_notice: '<ul><li>Upgrade immediately for the security fix</li></ul>',
      },
      shortDescription: '',
    });
    // Changelog lines describe history and FAQ lines describe questions; neither
    // is a current capability, and both would inflate the feature list.
    expect(features).toEqual(['Responsive lightbox with captions']);
  });

  it('falls back to sentence splitting when the readme has no lists', () => {
    const features = extractFeatures({
      sections: { description: '<p>This plugin creates responsive galleries. It also embeds YouTube video.</p>' },
      shortDescription: 'unused',
    });
    expect(features).toEqual(['This plugin creates responsive galleries', 'It also embeds YouTube video']);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 10 }, (_, i) => `<li>Feature number ${i} does something</li>`).join('');
    expect(extractFeatures({ sections: { description: `<ul>${many}</ul>` }, shortDescription: '' }, 4)).toHaveLength(4);
  });
});

describe('parseChangelog', () => {
  it('parses the raw "= 1.2.3 =" heading form', () => {
    const entries = parseChangelog('= 1.2.3 =\n* Fixed a crash\n\n= 1.2.2 =\n* Tweaked spacing\n');
    expect(entries.map((e) => e.version)).toEqual(['1.2.3', '1.2.2']);
    expect(entries[0].body).toContain('Fixed a crash');
  });

  it('parses the rendered <h4> heading form', () => {
    const entries = parseChangelog('<h4>1.2.0</h4><ul><li>Added stuff</li></ul><h4>1.1.0</h4><ul><li>Fixed stuff</li></ul>');
    expect(entries.map((e) => e.version)).toEqual(['1.2.0', '1.1.0']);
    expect(entries[1].body).toContain('Fixed stuff');
  });

  it('dedupes repeated versions, keeping the first', () => {
    const entries = parseChangelog('= 2.0.0 =\n* First mention\n\n= 1.9.0 =\n* Older\n\n= 2.0.0 =\n* Duplicate block\n');
    expect(entries.map((e) => e.version)).toEqual(['2.0.0', '1.9.0']);
    expect(entries[0].body).toContain('First mention');
  });

  it('reads a date beside the version when one is published', () => {
    const entries = parseChangelog('<h4>2.0.0 - May 1, 2026</h4><p>Big release</p><h4>1.9.0 (2026-04-01)</h4><p>Small</p>');
    expect(entries[0].date?.toISOString().slice(0, 10)).toBe('2026-05-01');
    expect(entries[1].date?.toISOString().slice(0, 10)).toBe('2026-04-01');
  });

  it('leaves date null when the heading carries none', () => {
    const entries = parseChangelog('= 1.2.3 =\n* Fixed a crash\n');
    // The single most important guard in this file: defaulting an undated entry
    // to "today" would invent a release cadence out of nothing.
    expect(entries[0].date).toBeNull();
  });

  it('returns an empty list for empty input', () => {
    expect(parseChangelog('')).toEqual([]);
  });

  it('parses a realistic rendered changelog with bodies, entities and mixed dating', () => {
    // Regression guard. The parser previously stripped HTML with the shared
    // whitespace-collapsing stripper, which merged each heading into its own body
    // and made the anchored heading regex stop matching — so every real changelog
    // parsed as zero versions and every cadence figure came back empty.
    const entries = parseChangelog(
      '<h4>3.1.2 - 2026-07-14</h4>\n<ul>\n<li>Fix: fatal error on PHP 8.3</li>\n<li>Tweak: tested up to 6.9</li>\n</ul>\n' +
        '<h4>3.1.1 &#8211; 2026-06-30</h4>\n<ul><li>Fix: caption overflow in the 2 = 2 case</li></ul>\n' +
        '<h4>3.1.0</h4>\n<p>Requires WordPress 6.2 or later.</p>\n<ul><li>New: masonry layout</li></ul>',
    );
    expect(entries.map((e) => e.version)).toEqual(['3.1.2', '3.1.1', '3.1.0']);
    expect(entries.map((e) => e.date?.toISOString().slice(0, 10) ?? null)).toEqual(['2026-07-14', '2026-06-30', null]);
    expect(entries[0].body).toBe('Fix: fatal error on PHP 8.3 Tweak: tested up to 6.9');
  });

  it('is not fooled by version-like numbers in body prose', () => {
    const entries = parseChangelog('= 3.1.0 =\nRequires WordPress 6.2 or later. Works with version 1.5 of the addon.\n');
    expect(entries.map((e) => e.version)).toEqual(['3.1.0']);
  });

  it('ignores the section heading itself', () => {
    const entries = parseChangelog('== Changelog ==\n\n= 1.0.0 =\n* First release\n');
    expect(entries.map((e) => e.version)).toEqual(['1.0.0']);
  });

  it('still finds headings when the whole changelog is on one line', () => {
    // Some readmes arrive with no line structure at all; isolating the markers
    // means those degrade to a parsed list rather than to nothing.
    const entries = parseChangelog('= 1.1.0 = * fixed a thing = 1.0.0 = * first release');
    expect(entries.map((e) => e.version)).toEqual(['1.1.0', '1.0.0']);
    expect(entries[0].body).toBe('* fixed a thing');
  });
});

describe('parseLooseDate', () => {
  it.each([
    ['2026-05-01', '2026-05-01'],
    ['2026.05.01', '2026-05-01'],
    ['01-05-2026', '2026-05-01'],
    ['15.03.2026', '2026-03-15'],
    ['May 1, 2026', '2026-05-01'],
    ['1 May 2026', '2026-05-01'],
    ['May 2026', '2026-05-01'],
    ['(2026-05-01)', '2026-05-01'],
  ])('parses %s', (input, expected) => {
    expect(parseLooseDate(input)?.toISOString().slice(0, 10)).toBe(expected);
  });

  it('prefers day-first when both orderings are possible', () => {
    // WP.org readmes are overwhelmingly written by a European/international
    // author base, so 01-05-2026 means 1 May, not 5 January.
    expect(parseLooseDate('01-05-2026')?.getUTCMonth()).toBe(4);
  });

  it('disambiguates when one component exceeds 12', () => {
    expect(parseLooseDate('15.03.2026')?.getUTCDate()).toBe(15);
    expect(parseLooseDate('03.15.2026')?.getUTCDate()).toBe(15);
  });

  it('returns null for unparseable text', () => {
    expect(parseLooseDate('')).toBeNull();
    expect(parseLooseDate('latest release')).toBeNull();
    expect(parseLooseDate('version bump')).toBeNull();
  });

  it('rejects impossible calendar dates rather than rolling them over', () => {
    // Date.UTC(2026, 1, 31) silently becomes 3 March. Accepting that would put a
    // release on a day it did not happen.
    expect(parseLooseDate('2026-02-31')).toBeNull();
    expect(parseLooseDate('2026-13-01')).toBeNull();
  });

  it('rejects implausible future dates', () => {
    // A far-future date is a typo or a template placeholder, never a shipped
    // release, and it would skew every "days since last release" figure.
    expect(parseLooseDate('2099-01-01')).toBeNull();
  });
});

describe('computeCadence', () => {
  it('leaves medianDaysBetween null with fewer than two dated entries', () => {
    const facts = computeCadence([entry('1.0.0', daysAgo(10)), entry('0.9.0', null)], NOW);
    expect(facts.totalVersions).toBe(2);
    expect(facts.datedVersions).toBe(1);
    // One date defines no interval; a made-up gap here would be pure invention.
    expect(facts.medianDaysBetween).toBeNull();
  });

  it('uses the median so one dormant stretch does not dominate', () => {
    const facts = computeCadence(
      [entry('1.4.0', daysAgo(29)), entry('1.3.0', daysAgo(36)), entry('1.2.0', daysAgo(43)), entry('1.1.0', daysAgo(575))],
      NOW,
    );
    // Gaps are 7, 7 and 532 days. The mean is ~182 and would describe this
    // weekly-shipping plugin as barely-maintained; the median reports 7.
    expect(facts.medianDaysBetween).toBe(7);
  });

  it('averages the two middle gaps when the count is even', () => {
    const facts = computeCadence(
      [entry('1.3.0', daysAgo(0)), entry('1.2.0', daysAgo(10)), entry('1.1.0', daysAgo(30))],
      NOW,
    );
    expect(facts.medianDaysBetween).toBe(15);
  });

  it('keeps releasesLast90Days null when history does not span 90 days', () => {
    const facts = computeCadence([entry('1.1.0', daysAgo(5)), entry('1.0.0', daysAgo(40))], NOW);
    // A six-week-old plugin has not had 90 days in which to ship, so "2 releases
    // in 90 days" would understate it. Null means "not enough history", which is
    // the truthful answer.
    expect(facts.releasesLast90Days).toBeNull();
    expect(facts.releasesLast365Days).toBeNull();
  });

  it('reports windowed counts once history covers the window', () => {
    const facts = computeCadence(
      [entry('1.3.0', daysAgo(5)), entry('1.2.0', daysAgo(60)), entry('1.1.0', daysAgo(200)), entry('1.0.0', daysAgo(400))],
      NOW,
    );
    expect(facts.releasesLast90Days).toBe(2);
    expect(facts.releasesLast365Days).toBe(3);
  });

  it('records the newest and oldest dated release', () => {
    const facts = computeCadence([entry('1.0.0', daysAgo(400)), entry('1.3.0', daysAgo(5)), entry('1.2.0', null)], NOW);
    expect(facts.newestReleaseDate).toEqual(daysAgo(5));
    expect(facts.oldestReleaseDate).toEqual(daysAgo(400));
  });

  it('reports nothing but counts when no entry carries a date', () => {
    const facts = computeCadence([entry('1.1.0', null), entry('1.0.0', null)], NOW);
    expect(facts).toMatchObject({
      totalVersions: 2,
      datedVersions: 0,
      medianDaysBetween: null,
      releasesLast90Days: null,
      releasesLast365Days: null,
      newestReleaseDate: null,
      oldestReleaseDate: null,
    });
  });
});

describe('compareVersions', () => {
  it('compares numerically rather than lexically', () => {
    // String comparison would put 1.10.0 before 1.9.0.
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
  });

  it('treats missing trailing components as zero', () => {
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
    expect(compareVersions('2.0.1', '2.0')).toBe(1);
  });

  it('returns 0 for equal versions', () => {
    expect(compareVersions('3.4.5', '3.4.5')).toBe(0);
  });
});

describe('wpVersionLag', () => {
  it('counts each WordPress minor as one step', () => {
    expect(wpVersionLag('6.4', '6.6')).toBe(2);
    expect(wpVersionLag('6.6', '6.6')).toBe(0);
  });

  it('counts a major bump as ten steps', () => {
    // WP has historically shipped ~3 minors per major, so a major boundary has to
    // outrank any plausible minor count for the ordering to stay sane.
    expect(wpVersionLag('6.0', '7.0')).toBe(10);
    expect(wpVersionLag('6.8', '7.1')).toBe(3);
  });

  it('never reports a negative lag when tested ahead of current', () => {
    expect(wpVersionLag('6.9', '6.7')).toBe(0);
  });

  it('returns null when either side is unknown', () => {
    // Unknown lag must not be reported as zero lag — that would silently mark a
    // stale listing as fresh.
    expect(wpVersionLag(null, '6.6')).toBeNull();
    expect(wpVersionLag('6.4', null)).toBeNull();
    expect(wpVersionLag('unknown', '6.6')).toBeNull();
  });
});

describe('meanStars', () => {
  it('computes the weighted mean from the histogram', () => {
    expect(meanStars({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 })).toBe(3);
    expect(meanStars({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 })).toBe(4.75);
  });

  it('returns null when there are no reviews', () => {
    // A plugin with no reviews has no rating; reporting 0 would read as "terrible".
    expect(meanStars(null)).toBeNull();
    expect(meanStars({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBeNull();
  });
});

describe('negativeReviewShare', () => {
  it('is the 1–2 star share as a percentage', () => {
    expect(negativeReviewShare({ 1: 1, 2: 1, 3: 0, 4: 0, 5: 8 })).toBe(20);
  });

  it('returns null when there are no reviews', () => {
    expect(negativeReviewShare(null)).toBeNull();
    expect(negativeReviewShare({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBeNull();
  });
});
