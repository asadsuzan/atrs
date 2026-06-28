import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { getStaleProducts, type StaleProduct } from '../../services/products';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/utils';

type Classified = StaleProduct & { level: 'critical' | 'warning'; label: string };

export function classifyStale(p: StaleProduct, days: number): Classified {
  if (!p.lastActivityAt) return { ...p, level: 'critical', label: 'No changelog yet' };
  const d = Math.floor((Date.now() - Date.parse(p.lastActivityAt)) / 86400000);
  return { ...p, level: d >= days * 2 ? 'critical' : 'warning', label: `${d}d since update` };
}

/**
 * App-wide priority alert: when products are overdue for a changelog update, it
 * pops a rich, dismissible toast (with sound) once per session. Critical items
 * (never updated, or 2× past the window) make the alert sticky and red.
 */
export function StaleProductAlert() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['staleProducts'],
    queryFn: () => getStaleProducts(),
    staleTime: 5 * 60 * 1000,
  });

  const days = data?.days ?? 7;
  const products = data?.products ?? [];

  useEffect(() => {
    if (!products.length) return;

    const classified = products.map((p) => classifyStale(p, days));
    const critical = classified.filter((c) => c.level === 'critical');
    const total = classified.length;
    const urgent = critical.length;

    // Fire once per session per distinct situation (so it re-alerts if the
    // counts change, but doesn't nag on every navigation).
    const signature = `${days}:${total}:${urgent}`;
    if (sessionStorage.getItem('atrs_stale_alert') === signature) return;
    sessionStorage.setItem('atrs_stale_alert', signature);

    const isCritical = urgent > 0;
    const top = (isCritical ? critical : classified).slice(0, 3);

    const timer = setTimeout(() => {
      playSound('notification');
      toast.custom(
        (id) => (
          <div className="w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-card shadow-xl">
            <div className={cn('h-1 w-full', isCritical ? 'bg-red-500' : 'bg-amber-500')} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  isCritical ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500',
                )}>
                  {isCritical ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">
                    {isCritical
                      ? `${urgent} product${urgent > 1 ? 's' : ''} need urgent updating`
                      : `${total} product${total > 1 ? 's' : ''} need updating`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    No changelog in {days}+ days. Keeping them current improves trust and ranking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.dismiss(id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-3 space-y-1">
                {top.map((p) => (
                  <li key={p._id} className="flex items-center gap-2 text-xs">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', p.level === 'critical' ? 'bg-red-500' : 'bg-amber-500')} />
                    <span className="flex-1 truncate text-foreground">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground">{p.label}</span>
                  </li>
                ))}
                {total > top.length && (
                  <li className="text-xs text-muted-foreground">+{total - top.length} more</li>
                )}
              </ul>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toast.dismiss(id)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => { toast.dismiss(id); navigate('/'); }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors',
                    isCritical ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600',
                  )}
                >
                  Review now <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: isCritical ? Infinity : 12000 },
      );
    }, 1200);

    return () => clearTimeout(timer);
  }, [products, days, navigate]);

  return null;
}
