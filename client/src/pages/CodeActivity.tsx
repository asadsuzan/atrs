import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCodeFeed, getCodeTrackerStatus, type CodeActivity } from '../services/codeTracker';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Code2, FileCode, PlusCircle, Wrench, Bug, Radio, FolderGit2, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PageTransition from '../components/layout/PageTransition';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  feature: { icon: PlusCircle, color: 'text-blue-500', label: 'Feature' },
  improvement: { icon: Wrench, color: 'text-purple-500', label: 'Improvement' },
  'bug-fix': { icon: Bug, color: 'text-red-500', label: 'Bug fix' },
};

function productName(p: CodeActivity['productId']): string {
  if (p && typeof p === 'object') return p.name;
  return 'Unknown product';
}
function productId(p: CodeActivity['productId']): string | null {
  if (p && typeof p === 'object') return p._id;
  if (typeof p === 'string') return p;
  return null;
}

export default function CodeActivity() {
  const { isAdmin } = useAuth();

  const { data: feed = [], isLoading } = useQuery({
    queryKey: ['code-tracker', 'feed'],
    queryFn: () => getCodeFeed(100),
    refetchInterval: 30000, // safety net; live updates also arrive via SSE
  });

  const { data: status } = useQuery({
    queryKey: ['code-tracker', 'status'],
    queryFn: getCodeTrackerStatus,
    enabled: isAdmin,
  });

  const latest = feed[0];

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="w-7 h-7" /> Currently Working On
          </h2>
          <p className="text-muted-foreground mt-1">
            Live code-activity tracker — file changes are summarized by AI into draft changelog entries.
          </p>
        </div>
        {status && (
          <div className="flex items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.enabled ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              <Radio className={`w-3.5 h-3.5 ${status.enabled ? 'animate-pulse' : ''}`} />
              {status.enabled ? 'Tracking' : 'Disabled'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground" title="Ollama model">
              <Cpu className="w-3.5 h-3.5" /> {status.model}
            </span>
          </div>
        )}
      </div>

      {/* Admin: surface the last tracker error (Ollama down, model missing, bad path). */}
      {isAdmin && status?.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <Radio className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{status.lastError}</span>
        </div>
      )}

      {/* Admin: show watched repos / hint to configure */}
      {isAdmin && status && (
        <Card>
          <CardContent className="p-4">
            {status.watching.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {status.enabled
                  ? 'No products have a local repo path set yet. Add a "Local repo path" on a product to start tracking it.'
                  : 'The tracker is disabled. Enable it in Settings → Code Activity Tracker, then set a repo path on a product.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {status.watching.map((w) => (
                  <span key={w.productId} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border bg-muted/40" title={w.repoPath}>
                    <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    {w.productName}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Latest highlight */}
      {latest && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Most recent</div>
            <FeedRow act={latest} highlight />
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      <div className="border rounded-xl bg-card divide-y">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-8 h-8 rounded-md" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
            </div>
          ))
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <FileCode className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">No code activity yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Once tracking is enabled and a product has a local repo path, your saved edits will appear
              here as AI-summarized draft changelog entries.
            </p>
          </div>
        ) : (
          feed.slice(latest ? 1 : 0).map((act) => (
            <div key={act._id} className="p-4">
              <FeedRow act={act} />
            </div>
          ))
        )}
      </div>
    </PageTransition>
  );
}

function FeedRow({ act, highlight }: { act: CodeActivity; highlight?: boolean }) {
  const meta = TYPE_META[act.type] || TYPE_META.improvement;
  const Icon = meta.icon;
  const pid = productId(act.productId);
  const when = (() => {
    try { return formatDistanceToNow(new Date(act.createdAt), { addSuffix: true }); } catch { return ''; }
  })();

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 shrink-0 ${meta.color}`}><Icon className="w-5 h-5" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {pid ? (
            <Link to={`/products/${pid}#activity-${act._id}`} className={`font-medium ${highlight ? 'text-base' : 'text-sm'} hover:underline`}>
              {act.title}
            </Link>
          ) : (
            <span className={`font-medium ${highlight ? 'text-base' : 'text-sm'}`}>{act.title}</span>
          )}
          <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
          {act.tags?.includes('unreleased') && <Badge variant="secondary" className="text-[10px]">draft</Badge>}
        </div>
        {act.shortDescription && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{act.shortDescription}</p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
          <span className="font-medium">{productName(act.productId)}</span>
          {act.filePath && (
            <>
              <span>·</span>
              <span className="font-mono inline-flex items-center gap-1 truncate max-w-[280px]">
                <FileCode className="w-3 h-3 shrink-0" /> {act.filePath}
              </span>
            </>
          )}
          {when && <><span>·</span><span>{when}</span></>}
        </div>
      </div>
    </div>
  );
}
