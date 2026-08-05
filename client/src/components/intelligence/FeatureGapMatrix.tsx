import { AlertTriangle, Check, Info, SearchX, Sparkles, TrendingUp, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGapAnalysis } from '../../hooks/useIntelligence';
import { DeterministicBadge } from './EvidenceTrail';

/**
 * Feature-gap and positioning analysis.
 *
 * The layout survives from the original, but what fills it differs in kind. The old
 * version handed an LLM two lists of hand-typed feature strings and printed whatever
 * comparison came back, so features the product genuinely had were reported as
 * missing and competitor "advantages" were invented outright.
 *
 * The columns are now computed: advantages and disadvantages are arithmetic on live
 * WordPress.org metrics, and missing features come from comparing real readme text.
 * Because lexical comparison genuinely cannot be certain, each gap carries a certainty
 * and the least reliable ones are filtered out server-side.
 */

const CERTAINTY_NOTE: Record<'high' | 'medium' | 'low', string> = {
  high: 'No similar wording found in your readme',
  medium: 'Partial wording overlap — verify before acting',
  low: 'Likely the same capability worded differently',
};

export function FeatureGapMatrix({ productId }: { productId: string }) {
  const { data, isLoading, isError, refetch } = useGapAnalysis(productId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-100 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Gap analysis failed</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              The comparison could not be built. WordPress.org may be unreachable.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.competitors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <SearchX className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No competitors tracked</h3>
          <p className="mt-2 max-w-md text-slate-500">
            Feature-gap analysis needs at least one tracked competitor. Use discovery above to find real
            WordPress.org plugins competing for the same search terms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Executive summary
            </CardTitle>
            {data.deterministic && <DeterministicBadge />}
          </div>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{data.summary}</p>
        </CardContent>
      </Card>

      {/* Caveats appear before the analysis, not buried after it. Thin data producing a
          confident-looking comparison is the exact failure mode this rewrite exists to
          prevent. */}
      {data.caveats.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              What this analysis could not see
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {data.caveats.map((caveat, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {caveat}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.marketPositioning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Market positioning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">{data.marketPositioning}</p>
          </CardContent>
        </Card>
      )}

      {data.sharedGaps.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Category expectations you don't advertise</CardTitle>
            <CardDescription>
              Capabilities two or more competitors advertise and your readme does not mention. Something
              multiple rivals ship tends to be table stakes rather than differentiation, so its absence is more
              likely to lose comparisons than its presence is to win them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.sharedGaps.map((gap, i) => (
                <li key={i} className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{gap.feature}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Advertised by {gap.competitors.join(', ')} · {CERTAINTY_NOTE[gap.certainty]}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.strategicRecommendations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Strategic recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.strategicRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6">
        {data.competitors.map((comp) => (
          <Card key={comp.competitorId} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50 px-6 py-4 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold">{comp.name}</h3>
                <p className="text-xs text-slate-500">
                  You cover {comp.featureCoverage}% of what they advertise
                  {/* Where features came from matters: a hand-typed list is only as current as
                      the last person who edited it, and the user should weigh it accordingly. */}
                  {comp.featureSource === 'manual' && ' · features from manual entry, not their live readme'}
                  {comp.featureSource === 'none' && ' · no features could be read'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="bg-red-50/30 p-6 dark:bg-red-950/10">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                  <TrendingUp className="h-4 w-4" /> They measurably beat you
                </h4>
                <ul className="space-y-3">
                  {comp.advantages.length === 0 ? (
                    <span className="text-sm italic text-slate-400">Nothing — you lead on every metric</span>
                  ) : (
                    comp.advantages.map((adv, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <span className="leading-snug">{adv}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="bg-green-50/30 p-6 dark:bg-green-950/10">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                  <TrendingUp className="h-4 w-4 rotate-180" /> You measurably beat them
                </h4>
                <ul className="space-y-3">
                  {comp.disadvantages.length === 0 ? (
                    <span className="text-sm italic text-slate-400">Nothing measurable</span>
                  ) : (
                    comp.disadvantages.map((dis, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <span className="leading-snug">{dis}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="p-6">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-400">
                  <AlertTriangle className="h-4 w-4" /> They advertise, you don't
                </h4>
                <ul className="space-y-3">
                  {comp.missingFeatures.length === 0 ? (
                    <span className="text-sm italic text-slate-400">No gaps detected</span>
                  ) : (
                    comp.missingFeatures.map((feat, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                              feat.certainty === 'high' ? 'bg-indigo-500' : 'bg-indigo-300',
                            )}
                          />
                          <span className="leading-snug">{feat.feature}</span>
                        </div>
                        {feat.certainty !== 'high' && (
                          <p className="ml-3.5 mt-0.5 text-xs text-slate-400">{CERTAINTY_NOTE[feat.certainty]}</p>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="bg-blue-50/30 p-6 dark:bg-blue-950/10">
                <h4 className="mb-4 flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" /> You advertise, they don't
                </h4>
                <ul className="space-y-3">
                  {comp.differentiators.length === 0 ? (
                    <span className="text-sm italic text-slate-400">No unique capabilities detected</span>
                  ) : (
                    comp.differentiators.map((diff, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span className="leading-snug">{diff}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
