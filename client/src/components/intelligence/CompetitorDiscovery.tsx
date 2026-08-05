import { useState } from 'react';
import { CheckCircle2, ExternalLink, Info, Loader2, Plus, Search, Star, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useDiscoverCompetitors, useTrackCompetitors } from '../../hooks/useCompetitors';
import type { DiscoveredCompetitor } from '../../services/competitors';

/**
 * Competitor discovery from the WordPress.org directory.
 *
 * Every candidate is a real, currently-listed plugin found by searching the directory
 * with the product's own tags and description keywords. Nothing is added without the
 * user confirming it — the previous implementation asked an LLM to name competitors
 * and wrote the results straight to the database, which meant plugins that did not
 * exist silently corrupted every downstream comparison.
 *
 * `relevance` and its basis are shown for exactly that reason: the user is the one who
 * knows their market, and the score is an argument rather than a verdict.
 */

const fmt = (n: number | null): string => (n === null ? 'unknown' : n.toLocaleString('en-US'));

function relevanceTone(score: number): string {
  if (score >= 55) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 35) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
  return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function CandidateRow({
  candidate,
  selected,
  onToggle,
}: {
  candidate: DiscoveredCompetitor;
  selected: boolean;
  onToggle: (slug: string) => void;
}) {
  const staleDays = candidate.lastUpdated
    ? Math.floor((Date.now() - new Date(candidate.lastUpdated).getTime()) / 86_400_000)
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        candidate.alreadyTracked
          ? 'border-border/60 bg-slate-50/60 opacity-70 dark:bg-slate-900/40'
          : selected
            ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20'
            : 'border-border',
      )}
    >
      <div className="flex gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={selected}
            disabled={candidate.alreadyTracked}
            onCheckedChange={() => onToggle(candidate.slug)}
            aria-label={`Track ${candidate.name}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-100">{candidate.name}</span>
            <a
              href={candidate.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              wordpress.org
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', relevanceTone(candidate.relevance))}>
              {candidate.relevance}% match
            </span>
            {candidate.alreadyTracked && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Already tracked
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{candidate.shortDescription}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {fmt(candidate.activeInstalls)} installs
            </span>
            {candidate.rating !== null && candidate.numRatings > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3" />
                {(candidate.rating / 20).toFixed(1)}★ ({fmt(candidate.numRatings)})
              </span>
            )}
            {staleDays !== null && (
              <span className={cn(staleDays > 365 && 'text-amber-600 dark:text-amber-400')}>
                Updated {staleDays}d ago
              </span>
            )}
            {candidate.author && <span>by {candidate.author}</span>}
          </div>

          {/* The basis is what lets a user reject a bad suggestion for a stated reason
              rather than having to second-guess an opaque score. */}
          {candidate.relevanceBasis.length > 0 && (
            <ul className="space-y-0.5 text-xs text-slate-400">
              {candidate.relevanceBasis.map((reason, i) => (
                <li key={i}>· {reason}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function CompetitorDiscovery({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading, isError, refetch } = useDiscoverCompetitors(productId, open);
  const track = useTrackCompetitors();

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const addSelected = async () => {
    if (selected.size === 0) return;
    await track.mutateAsync({ productId, slugs: [...selected] });
    setSelected(new Set());
    refetch();
  };

  if (!open) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Search className="h-7 w-7 text-slate-300" />
          <div>
            <h4 className="font-medium text-slate-700 dark:text-slate-200">Find competitors</h4>
            <p className="mt-0.5 max-w-md text-sm text-slate-500">
              Searches the WordPress.org directory using this product's own tags and description. Every result
              is a real, currently-listed plugin with live install and rating figures.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Search the directory
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-indigo-500" />
              Discovered competitors
            </CardTitle>
            <CardDescription>
              {data?.searchTerms && data.searchTerms.length > 0
                ? `Searched the directory for: ${data.searchTerms.map((t) => t.replace(/^tag:/, '#')).join(', ')}`
                : 'Searching the WordPress.org directory…'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching WordPress.org…
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-slate-500">Discovery failed.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {/* A caveat is returned when discovery genuinely cannot run — most often a
            missing WordPress.org slug. Surfacing it beats an unexplained empty list. */}
        {data?.caveat && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">{data.caveat}</p>
          </div>
        )}

        {data && !data.caveat && data.candidates.length === 0 && !isLoading && (
          <p className="py-6 text-center text-sm text-slate-500">
            No plugins scored above the relevance threshold. Add competitors manually, or broaden this
            product's WordPress.org tags so the search has more to work with.
          </p>
        )}

        {data && data.candidates.length > 0 && (
          <>
            <div className="space-y-2">
              {data.candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.slug}
                  candidate={candidate}
                  selected={selected.has(candidate.slug)}
                  onToggle={toggle}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <p className="text-xs text-slate-500">
                {selected.size === 0
                  ? 'Select the plugins that genuinely compete with yours.'
                  : `${selected.size} selected`}
              </p>
              <Button size="sm" onClick={addSelected} disabled={selected.size === 0 || track.isPending}>
                {track.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Track {selected.size > 0 ? selected.size : ''}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
