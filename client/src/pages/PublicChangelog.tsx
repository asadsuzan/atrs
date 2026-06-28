import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Rocket, GitBranch, Globe, Loader2 } from 'lucide-react';
import { getPublicChangelog, type ReleaseType, type ReleaseBlock } from '../services/release';
import { RichText } from '@/components/ui/RichText';
import { htmlToPlainText } from '@/lib/richText';

const TYPE_META: Record<ReleaseType, { label: string; dot: string; text: string }> = {
  feature: { label: 'Features', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  improvement: { label: 'Improvements', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  'bug-fix': { label: 'Bug Fixes', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
};
const TYPE_ORDER: ReleaseType[] = ['feature', 'improvement', 'bug-fix'];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function VersionEntry({ block }: { block: ReleaseBlock }) {
  const date = fmtDate(block.releasedAt);
  return (
    <div className="relative pl-8 pb-10 border-l border-border last:border-l-transparent">
      <span className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background" />
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-xl font-bold tracking-tight">{block.label}</h2>
        {block.unreleased && block.label !== 'Unreleased' && (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-500/30 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Unreleased
          </span>
        )}
        {date && <span className="text-sm text-muted-foreground">{date}</span>}
      </div>
      <RichText html={block.notes} className="text-sm text-muted-foreground mt-2" />
      <div className="mt-4 space-y-4">
        {TYPE_ORDER.map((t) => {
          const items = block.groups[t];
          if (!items || items.length === 0) return null;
          return (
            <div key={t}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${TYPE_META[t].text}`}>{TYPE_META[t].label}</p>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_META[t].dot}`} />
                    <span>
                      <span className="text-foreground font-medium">{it.title}</span>
                      {!block.unreleased && it.tags?.includes('unreleased') && (
                        <span className="ml-1.5 inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-500/30 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider align-middle">
                          <span className="w-1 h-1 rounded-full bg-amber-500" /> Unreleased
                        </span>
                      )}
                      {(() => {
                        const sd = htmlToPlainText(it.shortDescription || '');
                        return sd && sd !== it.title ? <span className="text-muted-foreground"> — {sd}</span> : null;
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PublicChangelog() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-changelog', id],
    queryFn: () => getPublicChangelog(id as string),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    if (data?.product?.name) document.title = `${data.product.name} — Changelog`;
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
        <h1 className="text-2xl font-bold">Changelog not found</h1>
        <p className="text-muted-foreground mt-2 max-w-sm">
          This changelog doesn't exist or hasn't been published.
        </p>
        <Link to="/" className="text-primary font-medium hover:underline mt-4">Go to ATRS</Link>
      </div>
    );
  }

  const { product, releases, unreleased } = data;

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
              <p className="text-sm text-muted-foreground">Changelog &amp; release notes</p>
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

      {/* Timeline */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {releases.length === 0 && !unreleased ? (
          <p className="text-muted-foreground">No releases published yet.</p>
        ) : (
          <div>
            {unreleased && <VersionEntry block={unreleased} />}
            {releases.map((b) => <VersionEntry key={b.versionId || b.label} block={b} />)}
          </div>
        )}
      </main>

      {/* Powered-by footer (the growth loop) */}
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
