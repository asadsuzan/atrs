/**
 * Plain-language formatting for intelligence output.
 *
 * The engines speak in person-weeks and RICE scores because that is what makes them
 * comparable and auditable. Users maintaining a plugin do not think that way: "0.25
 * person-weeks" and "RICE 4,180" are precise and meaningless at a glance. These
 * helpers translate at the display boundary, leaving the underlying figures intact
 * and reachable for anyone who wants to check the arithmetic.
 */

/** Effort as a duration a person can picture. */
export function effortLabel(personWeeks: number | null | undefined): string {
  if (personWeeks === null || personWeeks === undefined || !Number.isFinite(personWeeks)) {
    return 'effort unknown';
  }
  // A 40-hour week; below a day, round to the nearest couple of hours so the estimate
  // doesn't imply precision the inputs can't support.
  const hours = personWeeks * 40;
  if (hours <= 2) return 'about an hour';
  if (hours < 8) return `about ${Math.round(hours / 2) * 2} hours`;
  if (hours < 40) {
    const days = Math.round(hours / 8);
    return days === 1 ? 'about a day' : `about ${days} days`;
  }
  const weeks = Math.round(personWeeks * 2) / 2;
  return weeks === 1 ? 'about a week' : `about ${weeks} weeks`;
}

/**
 * A priority word, derived from horizon and category rather than from the raw RICE
 * score. The number orders the list; the word tells the user how to feel about it.
 */
export function priorityLabel(item: {
  horizon: string;
  category: string;
}): { label: string; tone: string } {
  if (item.category === 'security') {
    return { label: 'Urgent', tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  }
  if (item.horizon === 'now') {
    return { label: 'Do next', tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' };
  }
  if (item.horizon === 'next') {
    return { label: 'Soon', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' };
  }
  if (item.horizon === 'watch') {
    return { label: 'Setup', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  return { label: 'Later', tone: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
}

/** Human names for the work categories, which are stored as machine slugs. */
export const CATEGORY_LABEL: Record<string, string> = {
  security: 'Security',
  stability: 'Bugs',
  feature: 'Feature',
  growth: 'Growth',
  reputation: 'Reviews',
  discoverability: 'Being found',
  compliance: 'Compatibility',
  support: 'Support',
  tech_debt: 'Tech debt',
  process: 'Process',
};

/** A short, non-numeric reading of a 0–100 score. */
export function scoreWord(score: number | null): string {
  if (score === null) return 'not measured';
  if (score >= 80) return 'strong';
  if (score >= 60) return 'okay';
  if (score >= 40) return 'weak';
  return 'poor';
}

/** Score colour, shared so every score in the feature reads the same way. */
export function scoreTone(score: number | null): { text: string; bar: string; border: string } {
  if (score === null) {
    return { text: 'text-slate-400', bar: 'bg-slate-300 dark:bg-slate-700', border: 'border-slate-200 dark:border-slate-800' };
  }
  if (score >= 80) {
    return { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-900/50' };
  }
  if (score >= 60) {
    return { text: 'text-sky-600 dark:text-sky-400', bar: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-900/50' };
  }
  if (score >= 40) {
    return { text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-900/50' };
  }
  return { text: 'text-red-600 dark:text-red-400', bar: 'bg-red-500', border: 'border-red-200 dark:border-red-900/50' };
}

/** Short pillar names. The full label reads as a heading; this fits in a strip. */
export const PILLAR_SHORT: Record<string, string> = {
  productHealth: 'Health',
  reputation: 'Reviews',
  discoverability: 'Found',
  marketTraction: 'Growth',
  releaseDiscipline: 'Shipping',
  competitivePosition: 'Rivals',
};
