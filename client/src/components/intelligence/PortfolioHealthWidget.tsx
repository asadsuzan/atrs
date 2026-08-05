import { usePortfolioHealth } from '../../hooks/useIntelligence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, ShieldAlert, HeartPulse, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function PortfolioHealthWidget() {
  const { data, isLoading, error } = usePortfolioHealth();

  if (isLoading) {
    return (
      <Card className="h-full border-indigo-100 dark:border-indigo-900 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            AI Portfolio Health
          </CardTitle>
          <CardDescription>Overall intelligence analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const {
    averageScore,
    healthyProducts,
    atRiskProducts,
    criticalProducts,
    totalProducts,
    unanalyzedProducts = 0,
    trend,
    trendDelta,
    products = [],
  } = data;

  if (totalProducts === 0) return null;

  /**
   * Products with a score, versus products that exist.
   *
   * This endpoint used to return zeros for everyone — it aggregated HealthScore on an
   * `ownerId` field the schema never defined, so the match found nothing. Now that it
   * works, the distinction matters: an average over 2 of 9 products should not be
   * presented as covering the portfolio.
   */
  const analyzedCount = totalProducts - unanalyzedProducts;
  const weakest = products[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full border-indigo-200 dark:border-indigo-900/50 shadow-md bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <HeartPulse className="w-24 h-24 -mt-4 -mr-4 text-indigo-500" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Activity className="h-5 w-5 text-indigo-500" />
              AI Portfolio Health
            </div>
            <div className={cn(
              "text-3xl font-black tabular-nums tracking-tight",
              averageScore >= 80 ? 'text-emerald-500' :
              averageScore >= 60 ? 'text-amber-500' : 'text-red-500'
            )}>
              {averageScore}<span className="text-base text-slate-400 font-medium">/100</span>
            </div>
          </CardTitle>
          <CardDescription>
            {analyzedCount === 0
              ? `No products analysed yet — run an analysis to populate this.`
              : `Averaged across ${analyzedCount} analysed product${analyzedCount === 1 ? '' : 's'}`}
            {unanalyzedProducts > 0 && analyzedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {' '}
                · {unanalyzedProducts} not yet analysed
              </span>
            )}
            {typeof trendDelta === 'number' && trendDelta !== 0 && (
              <span
                className={cn(
                  ' · ',
                  trend === 'improving'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : trend === 'declining'
                      ? 'text-red-600 dark:text-red-400'
                      : '',
                )}
              >
                {trendDelta > 0 ? '+' : ''}
                {trendDelta} vs previous period
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mt-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                <ShieldCheck className="h-4 w-4" />
                {healthyProducts}
              </div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500">Healthy</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-amber-500 font-semibold mb-1">
                <AlertTriangle className="h-4 w-4" />
                {atRiskProducts}
              </div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500">At Risk</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-red-500 font-semibold mb-1">
                <ShieldAlert className="h-4 w-4" />
                {criticalProducts}
              </div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500">Critical</span>
            </div>
          </div>

          {/* Bar spans analysed products only, so the segments always sum to the full
              width rather than leaving an unexplained gap for unscored products. */}
          {analyzedCount > 0 && (
            <div className="mt-5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 flex overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${(healthyProducts / analyzedCount) * 100}%` }} />
              <div className="bg-amber-500 h-full" style={{ width: `${(atRiskProducts / analyzedCount) * 100}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${(criticalProducts / analyzedCount) * 100}%` }} />
            </div>
          )}

          {/* Naming the weakest product turns a summary number into somewhere to go next. */}
          {weakest && (
            <p className="mt-4 text-xs text-slate-500">
              Needs attention first:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">{weakest.name}</span> at{' '}
              {weakest.overallScore}/100
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
