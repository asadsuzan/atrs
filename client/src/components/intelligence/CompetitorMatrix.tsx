import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Info, Minus, Swords } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCompetitiveMatrix } from '../../hooks/useIntelligence';
import type { MatrixRow, MatrixVerdict } from '../../services/intelligence';

/**
 * The factual head-to-head comparison.
 *
 * Contains no interpretation whatsoever — every cell is a live WordPress.org number
 * or an explicit blank. This exists as a separate view from the gap analysis narrative
 * precisely so a user can check the narrative against the numbers, and so the feature
 * remains fully useful when no language model is configured.
 */

const fmt = (n: number | null | undefined): string =>
  n === null || n === undefined ? '—' : Math.round(n).toLocaleString('en-US');

/** Columns in the order a maintainer would actually scan them. */
const COLUMNS: Array<{
  key: keyof MatrixRow;
  label: string;
  render: (row: MatrixRow) => string;
  align?: 'right';
}> = [
  { key: 'activeInstalls', label: 'Installs', render: (r) => fmt(r.activeInstalls), align: 'right' },
  {
    key: 'meanStars',
    label: 'Rating',
    render: (r) => (r.meanStars === null ? '—' : `${r.meanStars.toFixed(2)}★`),
    align: 'right',
  },
  { key: 'numRatings', label: 'Reviews', render: (r) => fmt(r.numRatings), align: 'right' },
  {
    key: 'supportResolutionRate',
    label: 'Support resolved',
    render: (r) => (r.supportResolutionRate === null ? '—' : `${r.supportResolutionRate}%`),
    align: 'right',
  },
  {
    key: 'daysSinceRelease',
    label: 'Last release',
    render: (r) => (r.daysSinceRelease === null ? '—' : `${r.daysSinceRelease}d ago`),
    align: 'right',
  },
  {
    key: 'medianDaysBetweenReleases',
    label: 'Cadence',
    render: (r) => (r.medianDaysBetweenReleases === null ? '—' : `every ${r.medianDaysBetweenReleases}d`),
    align: 'right',
  },
  { key: 'featureCount', label: 'Features', render: (r) => fmt(r.featureCount), align: 'right' },
  { key: 'screenshotCount', label: 'Screenshots', render: (r) => fmt(r.screenshotCount), align: 'right' },
  { key: 'testedUpTo', label: 'Tested to', render: (r) => r.testedUpTo ?? '—' },
];

const STANDING_STYLE: Record<MatrixVerdict['standing'], { icon: typeof Minus; color: string; label: string }> = {
  ahead: { icon: ArrowUp, color: 'text-emerald-600 dark:text-emerald-400', label: 'Ahead' },
  behind: { icon: ArrowDown, color: 'text-red-600 dark:text-red-400', label: 'Behind' },
  level: { icon: Minus, color: 'text-slate-500 dark:text-slate-400', label: 'Level' },
  unknown: { icon: Info, color: 'text-slate-400', label: 'Unknown' },
};

export function CompetitorMatrix({ productId }: { productId: string }) {
  const { data, isLoading, isError, refetch } = useCompetitiveMatrix(productId);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
          <p className="text-sm text-slate-500">Could not build the competitive matrix.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4 text-indigo-500" />
            Head-to-head
          </CardTitle>
          <CardDescription>
            Live WordPress.org figures, compared directly. Nothing here is estimated or inferred — a dash
            means the value genuinely could not be read.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {/* The table scrolls inside its own container so the page body never scrolls
              horizontally on narrow screens. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-y border-border bg-slate-50/80 dark:bg-slate-900/50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-300">Plugin</th>
                  {COLUMNS.map((col) => (
                    <th
                      key={String(col.key)}
                      className={cn(
                        'whitespace-nowrap px-3 py-2 font-medium text-slate-600 dark:text-slate-300',
                        col.align === 'right' ? 'text-right' : 'text-left',
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.competitorId ?? 'product'}
                    className={cn(
                      'border-b border-border/60',
                      // Our own row is emphasised so the comparison has an obvious anchor.
                      row.subject === 'product' && 'bg-indigo-50/50 font-medium dark:bg-indigo-950/20',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-800 dark:text-slate-100">{row.name}</span>
                        {row.subject === 'product' && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            You
                          </span>
                        )}
                        {row.url && (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {/* Explaining a blank row beats leaving the user to assume the data is broken. */}
                      {row.unmeasurableReason && (
                        <p className="mt-0.5 text-xs font-normal text-amber-600 dark:text-amber-400">
                          {row.unmeasurableReason}
                        </p>
                      )}
                    </td>
                    {COLUMNS.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700 dark:text-slate-200',
                          col.align === 'right' ? 'text-right' : 'text-left',
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {data.unmeasured.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardContent className="space-y-1.5 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {data.unmeasured.length} tracked competitor{data.unmeasured.length === 1 ? '' : 's'} could not be
              measured
            </p>
            <ul className="space-y-0.5 text-sm text-slate-600 dark:text-slate-300">
              {data.unmeasured.map((u) => (
                <li key={u.name}>
                  <span className="font-medium">{u.name}:</span> {u.reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.verdicts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Where you stand</CardTitle>
            <CardDescription>
              Each metric compared against the best competitor on that metric. Tolerances are applied so
              rounding noise is not reported as a difference.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 pt-0">
            {data.verdicts.map((verdict) => {
              const style = STANDING_STYLE[verdict.standing];
              const Icon = style.icon;
              return (
                <div key={verdict.metric} className="flex items-start gap-2.5 py-2.5">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {verdict.label}
                      </span>
                      <span className={cn('text-xs font-medium', style.color)}>{style.label}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{verdict.note}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
