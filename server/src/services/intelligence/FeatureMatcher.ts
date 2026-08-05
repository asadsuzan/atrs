/**
 * Deterministic feature comparison between two readmes.
 *
 * A feature gap is a factual claim — "they advertise X, we don't" — so it is
 * computed by comparing real readme text rather than asked of an LLM. The
 * previous implementation handed a model two lists and accepted whatever gaps it
 * reported, which meant features we *did* have got listed as missing.
 *
 * The matcher is intentionally lexical. Token overlap weighted by term rarity
 * catches the paraphrases that matter ("drag and drop builder" vs "drag & drop
 * page builder") without needing embeddings, and when it's unsure it reports the
 * near-match score so the caller can decide rather than guessing.
 */

/** Words that carry no discriminating signal in plugin feature bullets. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'without', 'your', 'you',
  'is', 'are', 'be', 'can', 'will', 'it', 'its', 'this', 'that', 'these', 'those', 'as', 'at',
  'by', 'from', 'up', 'out', 'all', 'any', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'we', 'our', 'us', 'they', 'their',
  'plugin', 'wordpress', 'wp', 'feature', 'features', 'support', 'supports', 'supported',
  'easily', 'easy', 'simple', 'simply', 'fully', 'full', 'new', 'best', 'great', 'powerful',
  'use', 'using', 'used', 'allow', 'allows', 'let', 'lets', 'make', 'makes', 'get', 'gets',
  'option', 'options', 'settings', 'setting', 'available', 'includes', 'included', 'including',
]);

/**
 * Crude suffix stripping so "customizable"/"customize"/"customization" collapse.
 * Deliberately not a real stemmer — a full Porter implementation would over-stem
 * short technical terms ("gallery" → "galleri") for no gain here.
 */
function stem(word: string): string {
  let w = word;
  for (const suffix of ['ization', 'isation', 'ations', 'ation', 'izable', 'isable', 'ability', 'ingly', 'ments', 'ment', 'ions', 'ion', 'ies', 'ing', 'ers', 'er', 'ed', 'es', 's']) {
    if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

/** Reduces a feature phrase to its discriminating stems. */
export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    // Keep intra-word hyphens/ampersands as separators, drop everything else.
    .replace(/[^a-z0-9+#]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 1);
  return new Set(tokens);
}

/**
 * Similarity in 0..1 between two feature phrases.
 *
 * Uses overlap coefficient against the *smaller* token set rather than Jaccard,
 * because feature bullets vary wildly in verbosity: "Gutenberg block support"
 * and "Full support for the Gutenberg block editor with 40+ pre-built patterns"
 * describe the same capability, and Jaccard would score that pair far too low.
 * Rare-term agreement is then weighted up, since matching on "gutenberg" is much
 * stronger evidence than matching on "editor".
 */
export function similarity(a: string, b: string, documentFrequency?: Map<string, number>, corpusSize = 1): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  const shared = [...ta].filter((t) => tb.has(t));
  if (shared.length === 0) return 0;

  const smaller = Math.min(ta.size, tb.size);
  const overlap = shared.length / smaller;

  if (!documentFrequency || corpusSize <= 1) return Math.round(overlap * 100) / 100;

  // Weight the overlap by how informative the shared terms are. A term appearing
  // in most features of the corpus contributes little; a term appearing in two
  // contributes a lot.
  const idf = (t: string) => Math.log((corpusSize + 1) / ((documentFrequency.get(t) ?? 0) + 1)) + 1;
  const sharedWeight = shared.reduce((sum, t) => sum + idf(t), 0);
  const smallerSet = ta.size <= tb.size ? ta : tb;
  const totalWeight = [...smallerSet].reduce((sum, t) => sum + idf(t), 0);
  const weighted = totalWeight > 0 ? sharedWeight / totalWeight : overlap;

  // Blend so a single high-IDF match can't alone declare equivalence.
  return Math.round((0.4 * overlap + 0.6 * weighted) * 100) / 100;
}

/** Builds document frequencies across every feature phrase in the comparison. */
export function buildDocumentFrequency(allFeatures: string[]): { df: Map<string, number>; size: number } {
  const df = new Map<string, number>();
  for (const feature of allFeatures) {
    for (const token of tokenize(feature)) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return { df, size: allFeatures.length };
}

/** A competitor capability with no counterpart on our side. */
export interface FeatureGap {
  /** The competitor's phrasing, quoted verbatim so the claim is checkable. */
  feature: string;
  /** Our closest phrase, when there was a partial match. */
  closestOwn: string | null;
  /** Similarity to `closestOwn` in 0..1. */
  closestScore: number;
  /** How confident we are this is genuinely absent rather than differently worded. */
  certainty: 'high' | 'medium' | 'low';
}

/** A capability we have that a competitor's readme does not mention. */
export interface FeatureAdvantage {
  feature: string;
  closestCompetitor: string | null;
  closestScore: number;
}

export interface FeatureComparison {
  /** Phrases matched on both sides, as [own, competitor] pairs. */
  shared: Array<{ own: string; competitor: string; score: number }>;
  gaps: FeatureGap[];
  advantages: FeatureAdvantage[];
  /** Share of the competitor's features we also cover, 0..100. */
  coverageOfCompetitor: number;
}

/** Above this, two phrases describe the same capability. */
const MATCH_THRESHOLD = 0.55;
/** Below this, absence is near-certain rather than a wording difference. */
const CLEAR_GAP_THRESHOLD = 0.2;

/**
 * Compares our feature list against one competitor's.
 *
 * Gaps carry a `certainty` instead of being asserted flatly, because lexical
 * matching genuinely cannot distinguish "we don't have this" from "we describe
 * it in words that don't overlap". Downstream, only high-certainty gaps are
 * allowed to drive roadmap items; medium ones are surfaced for human review.
 */
export function compareFeatures(ownFeatures: string[], competitorFeatures: string[]): FeatureComparison {
  const { df, size } = buildDocumentFrequency([...ownFeatures, ...competitorFeatures]);

  const shared: FeatureComparison['shared'] = [];
  const gaps: FeatureGap[] = [];
  const matchedOwn = new Set<string>();

  for (const competitorFeature of competitorFeatures) {
    let best: { own: string; score: number } | null = null;
    for (const ownFeature of ownFeatures) {
      const score = similarity(ownFeature, competitorFeature, df, size);
      if (!best || score > best.score) best = { own: ownFeature, score };
    }

    if (best && best.score >= MATCH_THRESHOLD) {
      shared.push({ own: best.own, competitor: competitorFeature, score: best.score });
      matchedOwn.add(best.own);
    } else {
      gaps.push({
        feature: competitorFeature,
        closestOwn: best && best.score > 0 ? best.own : null,
        closestScore: best?.score ?? 0,
        certainty: !best || best.score < CLEAR_GAP_THRESHOLD ? 'high' : best.score < 0.4 ? 'medium' : 'low',
      });
    }
  }

  const advantages: FeatureAdvantage[] = [];
  for (const ownFeature of ownFeatures) {
    if (matchedOwn.has(ownFeature)) continue;
    let best: { competitor: string; score: number } | null = null;
    for (const competitorFeature of competitorFeatures) {
      const score = similarity(ownFeature, competitorFeature, df, size);
      if (!best || score > best.score) best = { competitor: competitorFeature, score };
    }
    if (!best || best.score < MATCH_THRESHOLD) {
      advantages.push({
        feature: ownFeature,
        closestCompetitor: best && best.score > 0 ? best.competitor : null,
        closestScore: best?.score ?? 0,
      });
    }
  }

  return {
    shared,
    gaps,
    advantages,
    coverageOfCompetitor:
      competitorFeatures.length > 0 ? Math.round((shared.length / competitorFeatures.length) * 100) : 0,
  };
}

/**
 * Gaps that more than one competitor shares.
 *
 * A capability two rivals both ship is a table-stakes expectation in the
 * category; one that only a single rival has may just be their niche. Ranking by
 * how many competitors have it is the most defensible prioritisation available
 * without user-demand data.
 */
export interface CommonGap {
  feature: string;
  /** Competitor names that advertise it. */
  competitors: string[];
  /** Total tracked competitors, for the "3 of 4" framing. */
  competitorCount: number;
  certainty: 'high' | 'medium' | 'low';
}

export function findCommonGaps(
  perCompetitor: Array<{ name: string; comparison: FeatureComparison }>,
): CommonGap[] {
  // Cluster near-identical gap phrasings across competitors so "REST API
  // support" and "Full REST API" count as one shared expectation.
  const clusters: Array<{ canonical: string; competitors: Set<string>; certainties: FeatureGap['certainty'][] }> = [];

  for (const { name, comparison } of perCompetitor) {
    for (const gap of comparison.gaps) {
      if (gap.certainty === 'low') continue;
      const existing = clusters.find((c) => similarity(c.canonical, gap.feature) >= MATCH_THRESHOLD);
      if (existing) {
        existing.competitors.add(name);
        existing.certainties.push(gap.certainty);
      } else {
        clusters.push({ canonical: gap.feature, competitors: new Set([name]), certainties: [gap.certainty] });
      }
    }
  }

  return clusters
    .map((c) => ({
      feature: c.canonical,
      competitors: [...c.competitors],
      competitorCount: perCompetitor.length,
      // A cluster is only high-certainty if every contributing gap was.
      certainty: c.certainties.every((x) => x === 'high') ? ('high' as const) : ('medium' as const),
    }))
    .sort((a, b) => b.competitors.length - a.competitors.length);
}
