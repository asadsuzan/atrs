import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Sparkles, Wrench, Bug, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { RELEASES, APP_VERSION, type ChangeType, type Release } from '../data/changelog';

/** Per-type presentation, aligned with the product's public changelog styling. */
const TYPE_META: Record<
  ChangeType,
  { label: string; dot: string; text: string; Icon: typeof Sparkles }
> = {
  feature: { label: 'New', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', Icon: Sparkles },
  improvement: { label: 'Improved', dot: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', Icon: Wrench },
  fix: { label: 'Fixed', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', Icon: Bug },
  security: { label: 'Security', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', Icon: ShieldCheck },
};

const TYPE_ORDER: ChangeType[] = ['feature', 'improvement', 'fix', 'security'];

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function ReleaseEntry({ release, filter }: { release: Release; filter: ChangeType | 'all' }) {
  const date = fmtDate(release.date);
  const isUnreleased = !release.date;

  // Group entries by type, honoring the active filter.
  const grouped = useMemo(() => {
    const map = {} as Record<ChangeType, Release['entries']>;
    for (const t of TYPE_ORDER) map[t] = [];
    for (const e of release.entries) {
      if (filter !== 'all' && e.type !== filter) continue;
      map[e.type].push(e);
    }
    return map;
  }, [release.entries, filter]);

  const hasVisible = TYPE_ORDER.some((t) => grouped[t].length > 0);
  if (!hasVisible) return null;

  return (
    <div className="relative pl-8 pb-10 border-l border-border last:border-l-transparent">
      <span className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-background" />
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2 className="text-xl font-bold tracking-tight">
          {isUnreleased ? release.version : `v${release.version}`}
        </h2>
        {isUnreleased && (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-amber-500" /> In progress
          </span>
        )}
        {date && <span className="text-sm text-muted-foreground">{date}</span>}
      </div>

      {release.title && <p className="mt-1 font-medium text-foreground">{release.title}</p>}
      {release.summary && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{release.summary}</p>}

      <div className="mt-4 space-y-4">
        {TYPE_ORDER.map((t) => {
          const items = grouped[t];
          if (items.length === 0) return null;
          const meta = TYPE_META[t];
          return (
            <div key={t}>
              <p className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${meta.text}`}>
                <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
              </p>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
                    <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                    <span>
                      <span className="text-foreground font-medium">{it.title}</span>
                      {it.description && <span className="text-muted-foreground"> — {it.description}</span>}
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

export default function AppChangelog() {
  useDocumentTitle("What's New");
  const [filter, setFilter] = useState<ChangeType | 'all'>('all');

  const filters: { key: ChangeType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'feature', label: 'New' },
    { key: 'improvement', label: 'Improved' },
    { key: 'fix', label: 'Fixed' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to ATRS
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl shadow-sm flex items-center justify-center overflow-hidden bg-primary/10 shrink-0">
              <img alt="ATRS" src="/favicon.svg" className="w-full h-full object-cover p-2" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">What&apos;s New in ATRS</h1>
              <p className="text-sm text-muted-foreground">
                Release notes &amp; product updates
                <span className="mx-2 text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground">Current: v{APP_VERSION}</span>
              </p>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex flex-wrap gap-2 mt-6">
            {filters.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Timeline */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {RELEASES.length === 0 ? (
          <p className="text-muted-foreground">No releases yet.</p>
        ) : (
          <div>
            {RELEASES.map((r) => (
              <ReleaseEntry key={r.version} release={r} filter={filter} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-center gap-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Rocket className="w-3.5 h-3.5" /> ATRS Dashboard
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Help &amp; docs
          </Link>
        </div>
      </footer>
    </div>
  );
}
