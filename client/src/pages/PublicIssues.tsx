import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Rocket, GitBranch, Globe, Loader2, Bug } from 'lucide-react';
import { getPublicIssues, type Issue, type IssueStatus, type IssueSeverity } from '../services/issues';
import { MediaCarousel } from '@/components/ui/media-carousel';
import { RichText } from '@/components/ui/RichText';

const STATUS_META: Record<IssueStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  'in-progress': { label: 'In Progress', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  closed: { label: 'Closed', cls: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-300' },
};

const SEVERITY_META: Record<IssueSeverity, string> = {
  low: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// Display order: active issues first, then resolved/closed.
const STATUS_ORDER: IssueStatus[] = ['open', 'in-progress', 'resolved', 'closed'];

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function Pill({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${cls}`}>{children}</span>;
}

function IssueRow({ issue }: { issue: Issue }) {
  const date = fmtDate(issue.foundAt) || fmtDate(issue.createdAt);
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold tracking-tight">{issue.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <Pill cls={SEVERITY_META[issue.severity]}>{issue.severity}</Pill>
          <Pill cls={STATUS_META[issue.status].cls}>{STATUS_META[issue.status].label}</Pill>
        </div>
      </div>
      <RichText html={issue.description} className="text-sm text-muted-foreground mt-2 leading-relaxed" />
      {issue.mediaUrls && issue.mediaUrls.length > 0 && (
        <div className="mt-3">
          <MediaCarousel urls={issue.mediaUrls} title={issue.title} />
        </div>
      )}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
        {issue.versionLabel && <span>Version <span className="font-medium text-foreground">{issue.versionLabel}</span></span>}
        {issue.reporter && <span>Reported by <span className="font-medium text-foreground">{issue.reporter}</span></span>}
        {date && <span>{date}</span>}
      </div>
    </div>
  );
}

export default function PublicIssues() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-issues', id],
    queryFn: () => getPublicIssues(id as string),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    if (data?.product?.name) document.title = `${data.product.name} — Known Issues`;
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-6">
        <h1 className="text-2xl font-bold">Issues not found</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          This issues page doesn't exist or hasn't been published.
        </p>
        <Link to="/" className="text-primary font-medium hover:underline mt-4">Go to ATRS</Link>
      </div>
    );
  }

  const { product, issues } = data;
  const ordered = [...issues].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const openCount = issues.filter((i) => i.status === 'open' || i.status === 'in-progress').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            {product.icon ? (
              <img src={product.icon} alt="" className="w-14 h-14 rounded-xl object-cover bg-muted border shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl font-bold">
                {product.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{product.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Bug className="w-4 h-4" /> Known issues</p>
            </div>
          </div>
          <RichText html={product.description} className="text-muted-foreground mt-4 max-w-2xl" />
          <div className="flex items-center gap-4 mt-4 text-sm">
            {product.wpOrgSlug && (
              <a href={`https://wordpress.org/plugins/${product.wpOrgSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Globe className="w-4 h-4" /> WordPress.org
              </a>
            )}
            {product.githubUrl && (
              <a href={product.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <GitBranch className="w-4 h-4" /> GitHub
              </a>
            )}
          </div>
        </div>
      </header>

      {/* List */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {issues.length === 0 ? (
          <div className="text-center py-16">
            <Bug className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-3">No known issues. Everything looks good! 🎉</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              {openCount} open {openCount === 1 ? 'issue' : 'issues'} · {issues.length} total
            </p>
            <div className="space-y-3">
              {ordered.map((issue) => <IssueRow key={issue._id} issue={issue} />)}
            </div>
          </>
        )}
      </main>

      {/* Powered-by footer */}
      <footer className="border-t">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Rocket className="w-3.5 h-3.5" /> Powered by ATRS
          </Link>
        </div>
      </footer>
    </div>
  );
}
