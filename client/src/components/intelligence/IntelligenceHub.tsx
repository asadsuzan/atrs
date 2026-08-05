import { useState } from 'react';
import { Info, Loader2, Sparkles, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAiStatus, useTriggerAnalysis } from '../../hooks/useIntelligence';
import { IntelligenceHome } from './IntelligenceHome';
import { CompetitorsView } from './CompetitorsView';

/**
 * The intelligence workspace: two tabs, one analysis button.
 *
 * This started as seven sections named after subsystems, then four organised by user
 * question — which still showed the roadmap twice and health twice, because "what
 * should I do" and "what is the plan" are the same content at different lengths.
 *
 * It is now the three things the feature actually produces — product health, AI
 * insights, roadmap — on one page, plus competitor analysis, which is a genuinely
 * separate concern and is left untouched.
 *
 * There was also more than one way to trigger analysis: this header, the health
 * dashboard, and a roadmap regenerate button, each refreshing a different subset. They
 * are now one button that runs the whole pipeline, so what you see is always from a
 * single consistent pass over the data.
 */

type SectionKey = 'home' | 'competitors';

const SECTIONS: Array<{ key: SectionKey; label: string; icon: typeof Sparkles }> = [
  { key: 'home', label: 'Intelligence', icon: Sparkles },
  { key: 'competitors', label: 'Competitors', icon: Swords },
];

export function IntelligenceHub({ productId }: { productId: string }) {
  const [section, setSection] = useState<SectionKey>('home');
  const { data: aiStatus } = useAiStatus();
  const analyze = useTriggerAnalysis();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.key === section;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* The single entry point for regenerating everything: health, insights and
            roadmap all come from one pass, so they can never disagree. */}
        {section === 'home' && (
          <Button
            onClick={() => analyze.mutate({ productId, category: 'all' })}
            disabled={analyze.isPending}
            size="sm"
          >
            {analyze.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {analyze.isPending ? 'Analysing…' : 'Run analysis'}
          </Button>
        )}
      </div>

      {/* Only surfaced when the model is down, and framed around what still works. The
          findings, scores and priorities are all computed, so the only thing lost is
          fluency — without saying that, plainer wording reads as a malfunction. */}
      {section === 'home' && aiStatus && !aiStatus.available && (
        <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            AI wording is unavailable, so the text below is written from the data directly. Every finding,
            score and priority is unaffected.
          </p>
        </div>
      )}

      {analyze.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          Analysis failed. Check that the product has a WordPress.org slug set, then try again.
        </div>
      )}

      {section === 'home' && <IntelligenceHome productId={productId} analyzing={analyze.isPending} />}
      {section === 'competitors' && <CompetitorsView productId={productId} />}
    </div>
  );
}
