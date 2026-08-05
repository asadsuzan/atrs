import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Evidence } from '../../services/intelligence';

/**
 * The verifiable facts behind an AI-written claim.
 *
 * This component is the counterweight to every narrative in the intelligence
 * feature. A user should never have to decide whether to trust a sentence — they can
 * open the trail, see the numbers it was derived from, and click through to
 * WordPress.org or the issue that produced them.
 *
 * Collapsed by default so it informs without dominating, but the trigger states the
 * evidence count so users know it exists.
 */

interface Props {
  evidence: Evidence[];
  /** Signal codes the narrative cited, shown as the reasoning chain. */
  signalCodes?: string[];
  label?: string;
  className?: string;
  defaultOpen?: boolean;
}

/** Human labels for the machine source keys carried on evidence rows. */
const SOURCE_LABELS: Record<string, string> = {
  'wp.org': 'WordPress.org',
  'wp.org.readme': 'WordPress.org readme',
  'atrs.issues': 'Issue tracker',
  'atrs.versions': 'Release history',
  'atrs.activities': 'Changelog',
  'atrs.market': 'Market snapshots',
  'atrs.aso': 'Listing audit',
  'atrs.products': 'Product settings',
  'atrs.competitors': 'Tracked competitors',
  'atrs.benchmark': 'Benchmark',
  'atrs.featurematch': 'Feature comparison',
  'competitor.rss': 'Competitor feed',
  'wphive.com': 'WP Hive',
  'patchstack.com': 'Patchstack',
  'wp-rankings.com': 'WP Rankings',
};

export function EvidenceTrail({ evidence, signalCodes, label, className, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (!evidence || evidence.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-border/60 bg-slate-50/60 dark:bg-slate-900/40', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {label ?? 'Evidence'}
          <span className="ml-1.5 text-slate-400">
            ({evidence.length} {evidence.length === 1 ? 'fact' : 'facts'})
          </span>
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
          <dl className="space-y-1.5">
            {evidence.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                <dt className="text-slate-500 dark:text-slate-400">{item.label}:</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{item.value}</dd>
                {/* Only render a link for real URLs — refs are often entity ids. */}
                {item.ref && /^https?:\/\//.test(item.ref) ? (
                  <a
                    href={item.ref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {SOURCE_LABELS[item.source] ?? item.source}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <span className="text-slate-400">{SOURCE_LABELS[item.source] ?? item.source}</span>
                )}
              </div>
            ))}
          </dl>

          {signalCodes && signalCodes.length > 0 && (
            <div className="border-t border-border/40 pt-2">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Derived from</p>
              <div className="flex flex-wrap gap-1">
                {signalCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Flags output the system is *not* confident about.
 *
 * This used to render on every card as "78% confidence", which is a number nobody can
 * act on and which competes with the finding itself for attention. A high confidence
 * score is the expected case and says nothing useful; a low one is a genuine caveat.
 * So the badge stays silent above the threshold and speaks up below it.
 *
 * The underlying figure is still computed from data density, historical accuracy and
 * groundedness — it is available on click, just no longer shouted.
 */
const LOW_CONFIDENCE = 0.55;

export function ConfidenceBadge({
  confidence,
  breakdown,
  deterministic,
}: {
  confidence: number;
  breakdown?: {
    dataDensity: number;
    historicalAccuracy: number;
    groundedness: number;
    explanation: string;
  };
  deterministic?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(confidence * 100);
  const isLow = confidence < LOW_CONFIDENCE;

  if (!isLow && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-400 hover:text-slate-600 hover:underline dark:hover:text-slate-300"
        title="How certain the system is about this, and why"
      >
        How certain?
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          isLow
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        )}
        title="How this confidence was calculated"
      >
        {isLow ? `Low certainty (${pct}%)` : `${pct}% certain`}
      </button>

      {open && breakdown && (
        <div className="absolute left-0 top-full z-20 mt-1 w-80 rounded-lg border border-border bg-white p-3 text-xs shadow-lg dark:bg-slate-900">
          <p className="mb-2 leading-relaxed text-slate-600 dark:text-slate-300">{breakdown.explanation}</p>
          <dl className="space-y-1">
            {[
              ['Data density', breakdown.dataDensity, 'How much corroborating evidence exists'],
              ['Historical accuracy', breakdown.historicalAccuracy, 'Whether past output here proved useful'],
              [
                'Groundedness',
                breakdown.groundedness,
                deterministic ? 'Computed without a language model' : 'How closely the wording stuck to the evidence',
              ],
            ].map(([name, value, hint]) => (
              <div key={String(name)} className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400" title={String(hint)}>
                  {String(name)}
                </dt>
                <dd className="font-mono font-medium text-slate-800 dark:text-slate-100">
                  {Math.round(Number(value) * 100)}%
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/**
 * Marks output whose wording was templated because no language model was reachable.
 *
 * Worth showing explicitly: the finding, the numbers and the priority are all still
 * correct, and only the prose is plainer. Without this badge users would reasonably
 * assume the feature was malfunctioning.
 */
export function DeterministicBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        className,
      )}
      title="Written from computed data without AI narration. The findings and figures are unaffected."
    >
      Computed
    </span>
  );
}
