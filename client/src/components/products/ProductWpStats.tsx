import { useQuery } from '@tanstack/react-query';
import { getProductWpStats } from '../../services/products';
import { cn } from '@/lib/utils';
import {
  Star, RefreshCw, Users, BarChart3, Hexagon, ShieldCheck, ShieldAlert, FlaskConical,
} from 'lucide-react';

const compact = (n?: number | null) =>
  n == null ? null : Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function daysAgo(s?: string | null): string | null {
  if (!s) return null;
  const m = s.match(/\d{4}-\d{2}-\d{2}/);
  const d = m ? new Date(m[0]) : new Date(s);
  if (isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** One labeled metric in the stat grid. */
function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

/** A clickable ecosystem service chip: opens the external page, shows its value. */
function StatChip({
  href, title, icon: Icon, label, value, tone,
}: { href: string; title: string; icon: React.ElementType; label: string; value?: string | null; tone?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-[11px] transition-colors hover:bg-muted hover:border-primary/40"
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', tone)} />
      <span className="text-muted-foreground">{label}</span>
      {value != null && <span className="font-semibold text-foreground">{value}</span>}
    </a>
  );
}

export function ProductWpStats({ productId }: { productId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['wpStats', productId],
    queryFn: () => getProductWpStats(productId),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="mt-3 pt-3 border-t space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-4 w-10 rounded bg-muted/70 animate-pulse" />
              <div className="h-2.5 w-12 rounded bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-6 w-14 rounded-md bg-muted/50 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!data || !data.slug || !data.links) return null;

  const { links, wporg, ranking, hive, patchstack } = data;
  const stars = wporg?.rating != null ? (wporg.rating / 20).toFixed(1) : null;
  const updated = daysAgo(wporg?.lastUpdated);
  const present = patchstack?.present ?? null;

  return (
    <div className="mt-3 pt-3 border-t space-y-2.5">
      {/* Core WordPress.org metrics */}
      {wporg && (
        <div className="grid grid-cols-3 gap-2">
          {wporg.activeInstalls != null && <Stat icon={Users} value={`${compact(wporg.activeInstalls)}+`} label="Installs" />}
          {stars && <Stat icon={Star} value={stars} label="Rating" />}
          {updated && <Stat icon={RefreshCw} value={updated} label="Updated" />}
        </div>
      )}

      {/* Clickable ecosystem services */}
      <div className="flex flex-wrap items-center gap-1.5">
        <StatChip
          href={links.ranking}
          title="View on WP Rankings"
          icon={BarChart3}
          tone="text-purple-500"
          label="Rank"
          value={ranking != null ? `#${compact(ranking)}` : null}
        />
        <StatChip
          href={links.hive}
          title="View on WP Hive"
          icon={Hexagon}
          tone="text-amber-500"
          label="Hive"
          value={hive?.memory || null}
        />
        <StatChip
          href={links.patchstack}
          title={present != null ? `${present} present · ${patchstack?.patched ?? 0} patched vulnerabilities` : 'View on Patchstack'}
          icon={present && present > 0 ? ShieldAlert : ShieldCheck}
          tone={present && present > 0 ? 'text-red-500' : 'text-emerald-500'}
          label="Patch"
          value={present != null ? String(present) : null}
        />
        <StatChip
          href={links.pt}
          title="View on Plugin Tests"
          icon={FlaskConical}
          tone="text-sky-500"
          label="PT"
        />
      </div>
    </div>
  );
}
