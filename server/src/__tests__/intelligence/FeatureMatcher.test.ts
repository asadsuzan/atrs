import { describe, it, expect } from 'vitest';
import {
  buildDocumentFrequency,
  compareFeatures,
  findCommonGaps,
  similarity,
  tokenize,
} from '../../services/intelligence/FeatureMatcher';

/**
 * Tests for the deterministic feature matcher.
 *
 * A feature gap is a factual claim about a competitor's readme, so it has to be
 * computed rather than asked of a model. The behaviours pinned here are the ones
 * that stop the gap matrix lying: a capability we demonstrably have must never
 * surface as missing, and a gap we are unsure about must be labelled unsure
 * rather than asserted.
 */

describe('tokenize', () => {
  it('strips stopwords and generic plugin vocabulary', () => {
    // Every WP.org readme says "WordPress", "plugin", "easy" and "supports";
    // matching on those would make unrelated features look similar.
    expect(tokenize('This is a WordPress plugin feature that easily supports the gallery')).toEqual(
      new Set(['gallery']),
    );
  });

  it('collapses inflected forms of the same word', () => {
    expect(tokenize('customizable')).toEqual(tokenize('customization'));
  });

  it('drops single characters and punctuation', () => {
    expect(tokenize('Drag & drop, a builder!')).toEqual(new Set(['drag', 'drop', 'build']));
  });

  it('keeps technical tokens containing + and #', () => {
    expect(tokenize('C# and C++ highlighting')).toEqual(new Set(['c#', 'c++', 'highlight']));
  });
});

describe('similarity', () => {
  it('scores paraphrases high', () => {
    expect(similarity('drag and drop builder', 'drag & drop page builder')).toBeGreaterThanOrEqual(0.9);
  });

  it('scores unrelated phrases at zero', () => {
    expect(similarity('drag and drop page builder', 'multilingual RTL translation ready')).toBe(0);
  });

  it('matches a verbose phrase against a terse one describing the same thing', () => {
    // Overlap against the *smaller* token set, not Jaccard. Jaccard would score
    // this pair around 0.3 and report a gap we do not have.
    const terse = 'Gutenberg block support';
    const verbose = 'Full support for the Gutenberg block editor with 40+ pre-built patterns';
    expect(similarity(terse, verbose)).toBeGreaterThanOrEqual(0.9);
  });

  it('is symmetric', () => {
    const a = 'Gutenberg block support';
    const b = 'Full support for the Gutenberg block editor with 40+ patterns';
    expect(similarity(a, b)).toBe(similarity(b, a));
  });

  it('is zero when either side tokenizes to nothing', () => {
    expect(similarity('the plugin', 'a WordPress feature')).toBe(0);
  });

  it('weights rare shared terms above common ones when a corpus is supplied', () => {
    const corpus = [
      'Gallery lightbox layout',
      'Gallery grid layout',
      'Gallery masonry layout',
      'Gutenberg block editor',
    ];
    const { df, size } = buildDocumentFrequency(corpus);
    // "gutenberg" appears once in the corpus, "gallery"/"layout" in three, so a
    // gutenberg agreement is much stronger evidence of the same capability.
    const rare = similarity('Gutenberg block editor', 'Gutenberg block editor support', df, size);
    const common = similarity('Gallery lightbox layout', 'Gallery masonry layout', df, size);
    expect(rare).toBeGreaterThan(common);
  });
});

describe('buildDocumentFrequency', () => {
  it('counts the features each token appears in', () => {
    const { df, size } = buildDocumentFrequency(['Gallery lightbox', 'Gallery grid', 'Video embed']);
    expect(size).toBe(3);
    // "gallery" is left intact: the stemmer deliberately stops short of a full
    // Porter implementation, which would over-stem short technical nouns.
    expect(df.get('gallery')).toBe(2);
    expect(df.get('video')).toBe(1);
  });
});

describe('compareFeatures', () => {
  const own = ['Drag and drop gallery builder', 'Responsive lightbox with captions', 'Gutenberg block support'];
  const competitor = [
    'Drag & drop page builder',
    'Full REST API',
    'Multilingual and RTL ready',
    'Gutenberg block editor support',
  ];

  it('does not list a capability we clearly have as a gap', () => {
    const result = compareFeatures(own, competitor);
    // The original LLM-driven implementation routinely reported these as missing.
    // That single failure mode is what this module exists to prevent.
    expect(result.gaps.map((g) => g.feature)).not.toContain('Drag & drop page builder');
    expect(result.gaps.map((g) => g.feature)).not.toContain('Gutenberg block editor support');
    expect(result.shared.map((s) => s.competitor)).toEqual(
      expect.arrayContaining(['Drag & drop page builder', 'Gutenberg block editor support']),
    );
  });

  it('reports genuinely absent capabilities as gaps', () => {
    const result = compareFeatures(own, competitor);
    expect(result.gaps.map((g) => g.feature)).toEqual(['Full REST API', 'Multilingual and RTL ready']);
  });

  it('labels every gap with a certainty', () => {
    const result = compareFeatures(own, competitor);
    for (const gap of result.gaps) {
      expect(['high', 'medium', 'low']).toContain(gap.certainty);
    }
  });

  it('marks a gap with no lexical overlap at all as high certainty', () => {
    const result = compareFeatures(own, ['Full REST API']);
    expect(result.gaps[0]).toMatchObject({ certainty: 'high', closestOwn: null, closestScore: 0 });
  });

  it('downgrades certainty when we have something partially similar', () => {
    // Lexical matching genuinely cannot tell "we lack this" from "we word it
    // differently", so a partial match must not be asserted as a hard gap —
    // only high-certainty gaps are allowed to drive roadmap items downstream.
    const result = compareFeatures(['Responsive lightbox with captions'], ['Lightbox popup for videos']);
    expect(result.gaps[0].certainty).toBe('medium');
    expect(result.gaps[0].closestOwn).toBe('Responsive lightbox with captions');
    expect(result.gaps[0].closestScore).toBeGreaterThan(0);
  });

  it('reports advantages as ours that they do not mention', () => {
    const result = compareFeatures(own, competitor);
    expect(result.advantages.map((a) => a.feature)).toEqual(['Responsive lightbox with captions']);
  });

  it('computes coverage of the competitor as a percentage', () => {
    // 2 of the competitor's 4 bullets are matched.
    expect(compareFeatures(own, competitor).coverageOfCompetitor).toBe(50);
  });

  it('reports zero coverage rather than dividing by zero for an empty competitor list', () => {
    const result = compareFeatures(own, []);
    expect(result.coverageOfCompetitor).toBe(0);
    expect(result.gaps).toEqual([]);
    expect(result.advantages).toHaveLength(3);
  });

  it('treats every competitor feature as a gap when we list nothing', () => {
    const result = compareFeatures([], competitor);
    expect(result.gaps).toHaveLength(4);
    expect(result.gaps.every((g) => g.certainty === 'high')).toBe(true);
    expect(result.coverageOfCompetitor).toBe(0);
  });
});

describe('findCommonGaps', () => {
  const own = ['Drag and drop gallery builder'];

  it('clusters near-identical gap phrasings across competitors', () => {
    const gaps = findCommonGaps([
      { name: 'Alpha', comparison: compareFeatures(own, ['REST API support']) },
      { name: 'Beta', comparison: compareFeatures(own, ['Full REST API']) },
    ]);
    // "REST API support" and "Full REST API" are one shared category expectation,
    // not two independent ones, so they must not be double-counted.
    expect(gaps).toHaveLength(1);
    expect(gaps[0].competitors.sort()).toEqual(['Alpha', 'Beta']);
  });

  it('sorts by how many competitors advertise the capability', () => {
    const gaps = findCommonGaps([
      { name: 'Alpha', comparison: compareFeatures(own, ['Full REST API', 'Elementor widgets included']) },
      { name: 'Beta', comparison: compareFeatures(own, ['REST API support']) },
      { name: 'Gamma', comparison: compareFeatures(own, ['REST API endpoints']) },
    ]);
    // A capability three rivals ship is table stakes; one rival's is their niche.
    expect(gaps[0].competitors).toHaveLength(3);
    expect(gaps[gaps.length - 1].competitors).toEqual(['Alpha']);
    expect(gaps[0].competitorCount).toBe(3);
  });

  it('is only high certainty when every contributing gap was high', () => {
    const clear = compareFeatures(['Drag and drop gallery builder'], ['Full REST API']);
    const fuzzy = compareFeatures(['Responsive lightbox with captions'], ['Lightbox popup for videos']);
    expect(clear.gaps[0].certainty).toBe('high');
    expect(fuzzy.gaps[0].certainty).toBe('medium');

    expect(findCommonGaps([{ name: 'Alpha', comparison: clear }])[0].certainty).toBe('high');
    // One uncertain contributor is enough to demote the cluster: the cluster can
    // be no more certain than its weakest member.
    expect(findCommonGaps([{ name: 'Alpha', comparison: fuzzy }])[0].certainty).toBe('medium');
  });

  it('excludes low-certainty gaps entirely', () => {
    const comparison = compareFeatures(own, ['Full REST API']);
    comparison.gaps[0].certainty = 'low';
    // A low-certainty gap is more likely a wording difference than an absence, so
    // it must never reach the "competitors all have this" list.
    expect(findCommonGaps([{ name: 'Alpha', comparison }])).toEqual([]);
  });

  it('returns nothing when there are no competitors', () => {
    expect(findCommonGaps([])).toEqual([]);
  });
});
