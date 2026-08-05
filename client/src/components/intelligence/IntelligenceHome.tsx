import { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Lightbulb,
  ListChecks,
  Loader2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useDeleteInsight,
  useDeleteRoadmapItem,
  useHealthScore,
  useInsights,
  useRoadmap,
  useUpdateInsight,
  useUpdateRoadmapItem,
} from '../../hooks/useIntelligence';
import { EvidenceTrail, ConfidenceBadge, DeterministicBadge } from './EvidenceTrail';
import { CATEGORY_LABEL, effortLabel, priorityLabel, scoreTone } from './format';
import type { Insight, RoadmapItem } from '../../services/intelligence';

/**
 * The intelligence home: product health, AI insights, and the roadmap.
 *
 * This replaces a four-tab arrangement that showed the same material more than once —
 * the roadmap appeared under both Focus and Plan, and health and insights appeared
 * again inside the Scorecard. Three sections, each appearing exactly once, is the whole
 * design.
 *
 * Every generated item can be deleted, and there is one analysis button rather than
 * three. Competitor analysis is untouched and remains its own tab.
 */

const HEALTH_LABELS: Record<string, string> = {
  bugHealth: 'Bugs',
  releaseHealth: 'Releases',
  featureVelocity: 'Delivery pace',
  issueResolution: 'Issue resolution',
  productActivity: 'Overall activity',
  changelogQuality: 'Changelog',
};

const SEVERITY_STYLE: Record<string, { icon: typeof Info; color: string; border: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-600 dark:text-red-400', border: 'border-l-red-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500' },
  opportunity: { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' },
  info: { icon: Info, color: 'text-sky-600 dark:text-sky-400', border: 'border-l-sky-500' },
};

/** Confirm-once delete, so a stray click can't discard analysis silently. */
function DeleteButton({ onConfirm, pending, label }: { onConfirm: () => void; pending: boolean; label: string }) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {pending ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      title={label}
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

// ---------------------------------------------------------------- health

function HealthSection({ productId }: { productId: string }) {
  const { data, isLoading } = useHealthScore(productId);

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  if (!data) return null;

  const tone = scoreTone(data.overallScore);
  const TrendIcon =
    data.trend === 'improving' ? TrendingUp : data.trend === 'declining' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'improving'
      ? 'text-emerald-600 dark:text-emerald-400'
      : data.trend === 'declining'
        ? 'text-red-600 dark:text-red-400'
        : 'text-slate-400';

  const breakdown = Object.entries(data.breakdown ?? {})
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => (a[1] as number) - (b[1] as number));

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Activity className="h-4 w-4 text-indigo-500" />
        Product health
      </h3>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className={cn('text-4xl font-bold tabular-nums', tone.text)}>{data.overallScore}</span>
              <span className="text-lg text-slate-400">/100</span>
              <p className={cn('mt-1 flex items-center gap-1 text-sm', trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {data.trend}
                {data.trendDelta !== 0 && (
                  <span className="tabular-nums">
                    ({data.trendDelta > 0 ? '+' : ''}
                    {data.trendDelta})
                  </span>
                )}
              </p>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Weighted from your issue tracker, release history and changelog. Weakest component first.
            </p>
          </div>

          {/* Weakest first: the point of a breakdown is to show where the score is being
              lost, which a fixed alphabetical order buries. */}
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {breakdown.map(([key, value]) => {
              const t = scoreTone(value as number);
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {HEALTH_LABELS[key] ?? key}
                    </span>
                    <span className={cn('text-xs font-semibold tabular-nums', t.text)}>{value as number}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={cn('h-full rounded-full', t.bar)} style={{ width: `${value as number}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// -------------------------------------------------------------- insights

function InsightRow({ insight }: { insight: Insight }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateInsight();
  const remove = useDeleteInsight();
  const style = SEVERITY_STYLE[insight.severity] ?? SEVERITY_STYLE.info;
  const Icon = style.icon;

  return (
    <Card className={cn('border-l-4', style.border)}>
      <CardContent className="space-y-2 p-4">
        <div className="flex gap-3">
          <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.color)} />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold leading-snug text-slate-800 dark:text-slate-100">{insight.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {insight.narrative}
            </p>
          </div>
          <DeleteButton
            onConfirm={() => remove.mutate(insight._id)}
            pending={remove.isPending}
            label="Delete this insight"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {insight.deterministic && <DeterministicBadge />}
            {typeof insight.confidence === 'number' && (
              <ConfidenceBadge
                confidence={insight.confidence}
                breakdown={insight.confidenceBreakdown}
                deterministic={insight.deterministic}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {insight.status !== 'acknowledged' && (
              <button
                type="button"
                onClick={() => update.mutate({ insightId: insight._id, payload: { status: 'acknowledged' } })}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline dark:hover:text-slate-300"
              >
                Mark read
              </button>
            )}
            {insight.evidence && insight.evidence.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Evidence
                <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
              </button>
            )}
          </div>
        </div>

        {open && insight.evidence && (
          <EvidenceTrail evidence={insight.evidence} signalCodes={insight.signalCodes} defaultOpen />
        )}
      </CardContent>
    </Card>
  );
}

function InsightsSection({ productId }: { productId: string }) {
  const { data, isLoading } = useInsights(productId, { limit: 20 });
  const insights = data?.data ?? [];

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Lightbulb className="h-4 w-4 text-indigo-500" />
        AI insights
        {insights.length > 0 && <span className="font-normal text-slate-400">({insights.length})</span>}
      </h3>

      {isLoading && <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}

      {!isLoading && insights.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm text-slate-500">
              No insights yet. Run an analysis to generate them from your product data.
            </p>
          </CardContent>
        </Card>
      )}

      {insights.map((insight) => (
        <InsightRow key={insight._id} insight={insight} />
      ))}
    </section>
  );
}

// --------------------------------------------------------------- roadmap

function RoadmapRow({ item }: { item: RoadmapItem }) {
  const [open, setOpen] = useState(false);
  const update = useUpdateRoadmapItem();
  const remove = useDeleteRoadmapItem();
  const priority = priorityLabel(item);

  return (
    <Card className={cn('border-l-4', item.category === 'security' ? 'border-l-red-500' : 'border-l-indigo-500')}>
      <CardContent className="space-y-2 p-4">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-start gap-2">
              <h4 className="flex-1 font-semibold leading-snug text-slate-800 dark:text-slate-100">
                {item.title}
              </h4>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', priority.tone)}>
                {priority.label}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.rationale}</p>
            <p className="text-xs text-slate-400">
              {CATEGORY_LABEL[item.category] ?? item.category} · {effortLabel(item.rice?.effort)}
              {item.status !== 'proposed' && ` · ${item.status.replace('_', ' ')}`}
            </p>
          </div>
          <DeleteButton
            onConfirm={() => remove.mutate(item._id)}
            pending={remove.isPending}
            label="Delete this roadmap item"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex gap-1.5">
            {item.status === 'proposed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ itemId: item._id, payload: { status: 'accepted' } })}
                disabled={update.isPending}
              >
                Accept
              </Button>
            )}
            {item.status === 'accepted' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ itemId: item._id, payload: { status: 'in_progress' } })}
                disabled={update.isPending}
              >
                Start
              </Button>
            )}
            {item.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => update.mutate({ itemId: item._id, payload: { status: 'shipped' } })}
                disabled={update.isPending}
              >
                Mark shipped
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {open ? 'Hide detail' : 'Plan & evidence'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
          </button>
        </div>

        {open && (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</p>

            {item.actionItems.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Steps</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                  {item.actionItems.map((action, i) => (
                    <li key={i} className="leading-relaxed">
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {item.acceptanceCriteria.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Done when</p>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {item.acceptanceCriteria.map((c, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.expectedOutcome && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Expected result: </span>
                {item.expectedOutcome.statement}
              </p>
            )}

            <EvidenceTrail evidence={item.evidence} signalCodes={item.sourceSignalCodes} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoadmapSection({ productId }: { productId: string }) {
  const { data, isLoading } = useRoadmap(productId);

  // Flattened across horizons and ranked, rather than grouped into Now/Next/Later
  // boxes. The horizon is already expressed by the priority chip on each row, and the
  // boxes were mostly empty chrome on a short list.
  const items = data
    ? [...data.board.now, ...data.board.next, ...data.board.later, ...data.board.watch].filter(
        (i) => i.status !== 'dismissed',
      )
    : [];

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <ListChecks className="h-4 w-4 text-indigo-500" />
        Roadmap
        {items.length > 0 && <span className="font-normal text-slate-400">({items.length})</span>}
      </h3>

      {isLoading && <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}

      {!isLoading && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm text-slate-500">
              Nothing on the roadmap. Either no issues were detected, or an analysis has not run yet.
            </p>
          </CardContent>
        </Card>
      )}

      {items.map((item) => (
        <RoadmapRow key={item._id} item={item} />
      ))}
    </section>
  );
}

// ------------------------------------------------------------------ home

export function IntelligenceHome({
  productId,
  analyzing,
}: {
  productId: string;
  analyzing: boolean;
}) {
  if (analyzing) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analysing your product — reading issues, releases, changelog and WordPress.org listing…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HealthSection productId={productId} />
      <InsightsSection productId={productId} />
      <RoadmapSection productId={productId} />
    </div>
  );
}
