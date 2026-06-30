import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivities, bulkUpdateActivities } from '../services/activities';
import { getPendingReviewIssues, updateIssue, deleteIssue, type IssueSeverity } from '../services/issues';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Wrench, Bug, Check, CircleCheck, FileCheck2, ArrowRight, Loader2, Globe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { htmlToPlainText } from '@/lib/richText';
import { useConfirm } from '../contexts/ConfirmContext';
import PageTransition from '../components/layout/PageTransition';
import { ReportsSkeleton } from '@/components/ui/skeletons';

const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

type ActivityType = 'feature' | 'improvement' | 'bug-fix';

const TYPE_META: Record<ActivityType, { label: string; Icon: any; cls: string }> = {
  feature: { label: 'Feature', Icon: PlusCircle, cls: 'text-blue-600 dark:text-blue-400' },
  improvement: { label: 'Improvement', Icon: Wrench, cls: 'text-purple-600 dark:text-purple-400' },
  'bug-fix': { label: 'Bug Fix', Icon: Bug, cls: 'text-red-600 dark:text-red-400' },
};
const TYPES: ActivityType[] = ['feature', 'improvement', 'bug-fix'];

/** Confidence chip: explains *why* an entry is flagged. */
function ConfidenceChip({ confidence }: { confidence?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    medium: {
      label: 'Guessed from first word',
      cls: 'bg-amber-100 text-amber-800 ring-amber-500/30 dark:bg-amber-900/40 dark:text-amber-300',
    },
    low: {
      label: 'No keyword — defaulted',
      cls: 'bg-red-100 text-red-800 ring-red-500/30 dark:bg-red-900/40 dark:text-red-300',
    },
  };
  const m = map[confidence || ''] ?? { label: 'Needs review', cls: 'bg-muted text-muted-foreground ring-border' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', m.cls)}>
      {m.label}
    </span>
  );
}

export default function Review() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const { data, isLoading } = useQuery({
    queryKey: ['activities', 'needs-review'],
    queryFn: () => getActivities({ needsReview: true, limit: -1, sortBy: 'activityDate', sortOrder: 'desc' }),
  });
  const entries: any[] = data?.data || [];

  // Publicly-reported issues awaiting approval.
  const { data: pendingIssues, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', 'pending-review'],
    queryFn: getPendingReviewIssues,
  });
  const issues: any[] = pendingIssues || [];

  const invalidateIssues = () => queryClient.invalidateQueries({ queryKey: ['issues'] });

  const approveIssue = useMutation({
    mutationFn: (id: string) => updateIssue({ id, needsReview: false }),
    onSuccess: () => { invalidateIssues(); toast.success('Issue approved — now visible on the public page'); },
    onError: () => toast.error('Could not approve — please try again'),
  });

  const rejectIssue = useMutation({
    mutationFn: (id: string) => deleteIssue(id),
    onSuccess: () => { invalidateIssues(); toast.success('Report rejected & deleted'); },
    onError: () => toast.error('Could not reject — please try again'),
  });

  // Group pending public issues by product for a scannable list.
  const issueGroups = useMemo(() => {
    const map = new Map<string, { name: string; id: string; items: any[] }>();
    for (const i of issues) {
      const pid = String(i.productId?._id || i.productId || 'unknown');
      const name = i.productId?.name || 'Unknown product';
      if (!map.has(pid)) map.set(pid, { name, id: pid, items: [] });
      map.get(pid)!.items.push(i);
    }
    return Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name));
  }, [issues]);

  // Per-row chosen type (defaults to the imported guess) + bulk selection set.
  const [pendingType, setPendingType] = useState<Record<string, ActivityType>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<ActivityType | ''>('');

  const typeFor = (a: any): ActivityType => pendingType[a._id] ?? a.type;

  const invalidate = () => {
    // Partial-match invalidation refreshes the list, the nav count, product
    // detail timelines and the dashboard — all keyed under 'activities'.
    queryClient.invalidateQueries({ queryKey: ['activities'] });
  };

  const resolve = useMutation({
    mutationFn: ({ ids, update }: { ids: string[]; update: any }) => bulkUpdateActivities(ids, update),
    onSuccess: (_res, vars) => {
      invalidate();
      setSelected((prev) => {
        const next = new Set(prev);
        vars.ids.forEach((id) => next.delete(id));
        return next;
      });
    },
    onError: () => toast.error('Could not update — please try again'),
  });

  // Group flagged entries by product for a scannable list.
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; id: string; items: any[] }>();
    for (const a of entries) {
      const pid = String(a.productId?._id || a.productId || 'unknown');
      const name = a.productId?.name || 'Unknown product';
      if (!map.has(pid)) map.set(pid, { name, id: pid, items: [] });
      map.get(pid)!.items.push(a);
    }
    return Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name));
  }, [entries]);

  const allIds = entries.map((a) => a._id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmOne = (a: any) =>
    resolve.mutate({ ids: [a._id], update: { type: typeFor(a), needsReview: false } });

  const confirmSelectedAsIs = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    // Each keeps its own current type; just clear the flag.
    resolve.mutate({ ids, update: { needsReview: false } }, { onSuccess: () => toast.success(`${ids.length} confirmed`) });
  };

  const applyTypeToSelected = () => {
    if (selected.size === 0 || !bulkType) return;
    const ids = Array.from(selected);
    resolve.mutate(
      { ids, update: { type: bulkType, needsReview: false } },
      { onSuccess: () => { toast.success(`${ids.length} set to ${TYPE_META[bulkType].label}`); setBulkType(''); } },
    );
  };

  const confirmAll = () => {
    if (allIds.length === 0) return;
    resolve.mutate({ ids: allIds, update: { needsReview: false } }, { onSuccess: () => toast.success('All entries confirmed') });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-primary" /> Review queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Items awaiting your review: publicly-reported issues to approve before they go live, and
              imported changelog entries whose type was guessed. Approving/confirming clears the flag.
            </p>
          </div>
          {entries.length > 0 && (
            <Button variant="outline" onClick={confirmAll} disabled={resolve.isPending}>
              <CircleCheck className="w-4 h-4 mr-2" /> Confirm all as-is ({entries.length})
            </Button>
          )}
        </div>

        {/* Combined empty state — only when nothing of either kind is pending. */}
        {!isLoading && !issuesLoading && entries.length === 0 && issues.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CircleCheck className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-lg font-medium">Nothing to review</p>
              <p className="text-sm text-muted-foreground mt-1">
                No public issue reports awaiting approval, and every imported changelog entry has a confirmed type.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Public issue reports awaiting approval */}
        {issues.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Public issue reports ({issues.length})
              </h2>
            </div>
            {issueGroups.map((g) => (
              <Card key={g.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      <Link to={`/products/${g.id}`} className="hover:text-primary hover:underline">{g.name}</Link>
                    </CardTitle>
                    <CardDescription>{g.items.length} to review</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {g.items.map((i) => {
                    const busy =
                      (approveIssue.isPending && approveIssue.variables === i._id) ||
                      (rejectIssue.isPending && rejectIssue.variables === i._id);
                    const desc = htmlToPlainText(i.description || '');
                    return (
                      <div key={i._id} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0', SEVERITY_BADGE[i.severity as IssueSeverity])}>
                          {i.severity}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate leading-tight" title={i.title}>{i.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Globe className="w-3 h-3" /> public</span>
                            {i.reporter && <span className="truncate">by {i.reporter}</span>}
                            {i.versionLabel && <span>v{i.versionLabel}</span>}
                            {desc && <span className="truncate hidden sm:inline">— {desc}</span>}
                          </div>
                        </div>
                        <Button
                          size="sm" variant="outline" className="h-8 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={async () => {
                            if (await confirm({ title: 'Reject report', description: 'Permanently delete this public submission?' })) {
                              rejectIssue.mutate(i._id);
                            }
                          }}
                          disabled={busy}
                          aria-label="Reject report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" className="h-8 shrink-0" onClick={() => approveIssue.mutate(i._id)} disabled={busy}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Approve</>}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {isLoading ? (
          <ReportsSkeleton />
        ) : entries.length === 0 ? null : (
          <>
            <div className="flex items-center gap-2 pt-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Imported changelog entries ({entries.length})
              </h2>
            </div>
            {/* Bulk action bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </label>
              <div className="flex items-center gap-2 ml-auto">
                <Select value={bulkType} onValueChange={(v) => setBulkType(v as ActivityType)}>
                  <SelectTrigger className="w-[150px] h-9" aria-label="Bulk type">
                    <SelectValue placeholder="Set type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyTypeToSelected} disabled={selected.size === 0 || !bulkType || resolve.isPending}>
                  Apply &amp; confirm
                </Button>
                <Button size="sm" variant="outline" onClick={confirmSelectedAsIs} disabled={selected.size === 0 || resolve.isPending}>
                  Confirm as-is
                </Button>
              </div>
            </div>

            {groups.map((g) => (
              <Card key={g.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      <Link to={`/products/${g.id}`} className="hover:text-primary hover:underline">{g.name}</Link>
                    </CardTitle>
                    <CardDescription>{g.items.length} to review</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {g.items.map((a) => {
                    const t = typeFor(a);
                    const meta = TYPE_META[t];
                    const busy = resolve.isPending && resolve.variables?.ids.includes(a._id);
                    return (
                      <div key={a._id} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2">
                        <Checkbox checked={selected.has(a._id)} onCheckedChange={() => toggleOne(a._id)} />
                        <meta.Icon className={cn('w-4 h-4 shrink-0', meta.cls)} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${g.id}#activity-${a._id}`}
                            className="block text-sm font-medium truncate leading-tight hover:text-primary hover:underline"
                            title={a.title}
                          >
                            {a.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            {a.versionId?.label && <span className="text-xs text-muted-foreground">{a.versionId.label}</span>}
                            <ConfidenceChip confidence={a.importConfidence} />
                          </div>
                        </div>
                        <Select value={t} onValueChange={(v) => setPendingType((p) => ({ ...p, [a._id]: v as ActivityType }))}>
                          <SelectTrigger className="w-[150px] h-8 text-xs shrink-0" aria-label={`Type for ${a.title}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TYPES.map((opt) => (
                              <SelectItem key={opt} value={opt}>{TYPE_META[opt].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 shrink-0" onClick={() => confirmOne(a)} disabled={busy}>
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Confirm</>}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/activities">Go to all changelogs <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
