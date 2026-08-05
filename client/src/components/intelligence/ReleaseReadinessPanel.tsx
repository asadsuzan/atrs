import { AlertTriangle, CheckCircle2, Info, Rocket, ShieldAlert, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReleaseReadiness } from '../../hooks/useIntelligence';
import type { CheckGrade, ReadinessCheck } from '../../services/intelligence';

/**
 * The pre-release gate.
 *
 * Standing out in a marketplace is largely the accumulation of releases that didn't
 * go wrong, so this answers one question — is this version safe to ship — with
 * deterministic checks and no AI involvement anywhere. Each check states the rule it
 * applied, so a verdict can be disagreed with rather than merely overridden.
 */

const GRADE_STYLE: Record<CheckGrade, { icon: typeof Info; color: string; ring: string; label: string }> = {
  blocker: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    ring: 'border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20',
    label: 'Blocker',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    ring: 'border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20',
    label: 'Warning',
  },
  pass: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    ring: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/10',
    label: 'Pass',
  },
  info: {
    icon: Info,
    color: 'text-slate-500 dark:text-slate-400',
    ring: 'border-border bg-slate-50/60 dark:bg-slate-900/40',
    label: 'Context',
  },
};

function CheckRow({ check }: { check: ReadinessCheck }) {
  const style = GRADE_STYLE[check.grade];
  const Icon = style.icon;

  return (
    <div className={cn('rounded-lg border p-3', style.ring)}>
      <div className="flex gap-2.5">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.color)} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{check.label}</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{check.finding}</p>
          {check.action && (
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              <span className="font-medium">Do this: </span>
              {check.action}
            </p>
          )}
          {/* The rule is shown so the gate is auditable — a check the user disagrees with
              can be argued about on its merits instead of just ignored. */}
          <p className="text-xs text-slate-400">Rule: {check.rule}</p>
        </div>
      </div>
    </div>
  );
}

export function ReleaseReadinessPanel({ productId, version }: { productId: string; version?: string }) {
  const { data, isLoading, isError, refetch } = useReleaseReadiness(productId, version);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
          <p className="text-sm text-slate-500">Could not assess release readiness.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const verdictStyle = {
    blocked: {
      icon: ShieldAlert,
      tone: 'text-red-600 dark:text-red-400',
      ring: 'border-red-200 dark:border-red-900/50',
      headline: 'Not ready to ship',
      detail: `${data.blockers.length} blocking issue${data.blockers.length === 1 ? '' : 's'} must be resolved first.`,
    },
    ready_with_warnings: {
      icon: AlertTriangle,
      tone: 'text-amber-600 dark:text-amber-400',
      ring: 'border-amber-200 dark:border-amber-900/50',
      headline: 'Ready, with caveats',
      detail: `Nothing blocking, but ${data.warnings.length} thing${data.warnings.length === 1 ? '' : 's'} would be cheaper to fix now than after shipping.`,
    },
    ready: {
      icon: Rocket,
      tone: 'text-emerald-600 dark:text-emerald-400',
      ring: 'border-emerald-200 dark:border-emerald-900/50',
      headline: 'Ready to ship',
      detail: 'Every gated check passed.',
    },
  }[data.verdict];

  const VerdictIcon = verdictStyle.icon;

  return (
    <div className="space-y-4">
      <Card className={cn('border-l-4', verdictStyle.ring)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className={cn('flex items-center gap-2 text-base', verdictStyle.tone)}>
                <VerdictIcon className="h-4 w-4" />
                {verdictStyle.headline}
              </CardTitle>
              <CardDescription className="mt-1">
                {verdictStyle.detail}
                {data.versionLabel ? ` Assessing ${data.versionLabel}.` : ' No unreleased version found — assessing current state.'}
              </CardDescription>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn('text-2xl font-semibold tabular-nums', verdictStyle.tone)}>{data.score}</span>
              <span className="text-sm text-slate-400">/100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400">
            All checks are computed from your issue tracker, release history and WordPress.org listing. No AI
            is involved — a release gate that occasionally invented a blocker would be worse than none.
          </p>
        </CardContent>
      </Card>

      {data.blockers.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            Blocking ({data.blockers.length})
          </h4>
          {data.blockers.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </section>
      )}

      {data.warnings.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Worth fixing first ({data.warnings.length})
          </h4>
          {data.warnings.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </section>
      )}

      {data.passed.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Passed ({data.passed.length})
          </h4>
          {data.passed.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </section>
      )}

      {data.info.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Context</h4>
          {data.info.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </section>
      )}
    </div>
  );
}
