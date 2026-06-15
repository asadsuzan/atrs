import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getMonthlyReport, getTrendData } from '../services/reports';
import { getProducts } from '../services/products';
import { getActivities } from '../services/activities';
import { getAuditLogs } from '../services/auditLogs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, PlusCircle, Wrench, Bug, FileText, Activity as ActivityIcon, ArrowRight, Play, ServerOff, Puzzle, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';
import { TrendChart } from '../components/reports/TrendChart';
import { DashboardSkeleton } from '@/components/ui/skeletons';

export default function Dashboard() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const { data: report, isLoading: isReportLoading, isError: isReportError } = useQuery({
    queryKey: ['dashboardReport', currentMonth, currentYear],
    queryFn: () => getMonthlyReport({ month: currentMonth, year: currentYear }),
  });

  const { data: productsData, isLoading: isProductsLoading, isError: isProductsError } = useQuery({
    queryKey: ['dashboardProducts'],
    queryFn: () => getProducts(),
  });

  const { data: activitiesData, isLoading: isActivitiesLoading, isError: isActivitiesError } = useQuery({
    queryKey: ['dashboardActivities'],
    queryFn: () => getActivities({ limit: -1 }),
  });

  const { data: auditLogsData, isLoading: isAuditLogsLoading, isError: isAuditLogsError } = useQuery({
    queryKey: ['dashboardAuditLogs'],
    queryFn: () => getAuditLogs(),
  });

  const { data: trendData, isLoading: isTrendLoading, isError: isTrendError } = useQuery({
    queryKey: ['dashboardTrend'],
    queryFn: () => getTrendData({ months: 6 }),
  });

  if (isReportLoading || isProductsLoading || isActivitiesLoading || isAuditLogsLoading || isTrendLoading) {
    return <DashboardSkeleton />;
  }

  if (isReportError || isProductsError || isActivitiesError || isAuditLogsError || isTrendError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ServerOff className="w-10 h-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Couldn't load your dashboard</h2>
        <p className="text-muted-foreground mt-2">Something went wrong fetching your data. Please try again.</p>
      </div>
    );
  }

  const summary = report?.summary || {
    products: 0,
    features: 0,
    improvements: 0,
    bugFixes: 0,
    totalActivities: 0,
  };

  const allProducts = productsData?.data || [];
  const activeProducts = allProducts.filter((p: any) => p.status === 'active');
  const inactiveProducts = allProducts.filter((p: any) => p.status === 'inactive');
  const plugins = allProducts.filter((p: any) => p.category === 'plugin');
  const blocks = allProducts.filter((p: any) => p.category === 'block');

  const allActivities = activitiesData?.data || [];
  
  const recentActivities = auditLogsData || [];

  const totalFeatures = allActivities.filter((a: any) => a.type === 'feature').length;
  const totalImprovements = allActivities.filter((a: any) => a.type === 'improvement').length;
  const totalBugs = allActivities.filter((a: any) => a.type === 'bug-fix').length;
  const totalReleased = allActivities.filter((a: any) => a.tags?.includes('released')).length;
  const totalUnreleased = allActivities.filter((a: any) => a.tags?.includes('unreleased')).length;
  const grandTotal = totalFeatures + totalImprovements + totalBugs || 1;

  const featurePct = Math.round((totalFeatures / grandTotal) * 100);
  const improvePct = Math.round((totalImprovements / grandTotal) * 100);
  const bugPct = grandTotal > 1 ? (100 - featurePct - improvePct) : Math.round((totalBugs / grandTotal) * 100);

  const getLogLink = (log: any) => {
    if (log.action === 'DELETE') return '#';
    if (log.entityType === 'PRODUCT') return `/products/${log.entityId}`;
    if (log.entityType === 'ACTIVITY') {
       const act = allActivities.find((a: any) => a._id === log.entityId);
       if (act && act.productId) {
         return `/products/${act.productId._id || act.productId}#activity-${log.entityId}`;
       }
       return '/activities';
    }
    return '#';
  };

  const getProductNameForLog = (log: any) => {
    if (log.entityType === 'ACTIVITY') {
      const act = allActivities.find((a: any) => a._id === log.entityId);
      if (act && act.productId) {
        const prod = allProducts.find((p: any) => p._id === (act.productId._id || act.productId));
        return prod ? prod.name : null;
      }
    }
    return null;
  };

  return (
    <PageTransition className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Command Center</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening across your products.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/products"><Package className="w-4 h-4 mr-2" /> Manage Products</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/activities"><ActivityIcon className="w-4 h-4 mr-2" /> Log Activity</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/reports"><FileText className="w-4 h-4 mr-2" /> View Reports</Link>
          </Button>
        </div>
      </div>
      
      {/* Monthly Summary */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
      >
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Products Updated</CardTitle>
              <Package className="w-4 h-4 text-primary/70 shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{summary.products}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Features Delivered</CardTitle>
              <PlusCircle className="w-4 h-4 text-emerald-500/70 shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{summary.features}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Improvements Made</CardTitle>
              <Wrench className="w-4 h-4 text-blue-500/70 shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{summary.improvements}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Bug Fixes Resolved</CardTitle>
              <Bug className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{summary.bugFixes}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Released</CardTitle>
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{totalReleased}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Unreleased</CardTitle>
              <div className="w-4 h-4 rounded-full bg-slate-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="text-2xl font-bold">{totalUnreleased}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        
        {/* Left Column (Span 4) */}
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><ActivityIcon className="w-5 h-5 mr-2 text-primary" /> Activity Trend</CardTitle>
              <CardDescription>Activity breakdown over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={trendData || []} />
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full max-h-[480px]">
            <CardHeader>
              <CardTitle className="flex items-center"><ActivityIcon className="w-5 h-5 mr-2 text-primary" /> Recent Activity Feed</CardTitle>
              <CardDescription>The latest updates tracked across all products.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activities logged yet.</p>
                ) : (
                  recentActivities.map((log: any) => (
                    <Link 
                      key={log._id} 
                      to={getLogLink(log)} 
                      className={`flex items-start gap-4 p-3 rounded-lg border bg-card/50 transition-colors ${log.action !== 'DELETE' ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'} block`}
                      onClick={(e) => log.action === 'DELETE' && e.preventDefault()}
                    >
                      <div className="mt-0.5">
                        {log.action === 'CREATE' && <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full"><PlusCircle className="w-4 h-4" /></div>}
                        {log.action === 'UPDATE' && <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full"><Wrench className="w-4 h-4" /></div>}
                        {log.action === 'DELETE' && <div className="p-2 bg-red-500/10 text-red-500 rounded-full"><Bug className="w-4 h-4" /></div>}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p className="text-sm font-medium leading-tight">{log.details || `${log.action} ${log.entityType}`}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground pt-1 flex-wrap gap-y-1">
                          <span className="font-medium text-foreground/80">
                            {log.entityName}
                            {getProductNameForLog(log) && <span className="font-normal text-muted-foreground ml-1">({getProductNameForLog(log)})</span>}
                          </span>
                          <span className="mx-2">•</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border capitalize`}>
                            {log.entityType.toLowerCase()}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ml-2 uppercase ${log.action === 'CREATE' ? 'text-emerald-500' : log.action === 'DELETE' ? 'text-red-500' : 'text-blue-500'}`}>
                            {log.action}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Span 3) */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2 text-primary" /> Product Landscape</CardTitle>
              <CardDescription>Overview of your portfolio.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-4xl font-bold text-primary">{allProducts.length}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Products</p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Package className="h-7 w-7" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Play className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Active
                    </div>
                    <p className="text-2xl font-semibold">{activeProducts.length}</p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <ServerOff className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Inactive
                    </div>
                    <p className="text-2xl font-semibold">{inactiveProducts.length}</p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Puzzle className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> Plugins
                    </div>
                    <p className="text-2xl font-semibold">{plugins.length}</p>
                  </div>
                  <div className="space-y-2 p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> Blocks
                    </div>
                    <p className="text-2xl font-semibold">{blocks.length}</p>
                  </div>
                </div>
                
                <Button variant="ghost" className="w-full text-sm mt-2" asChild>
                  <Link to="/products">View All Products <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Activity Distribution</CardTitle>
              <CardDescription>All-time breakdown of activity types.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="flex h-4 w-full rounded-full overflow-hidden border border-border">
                  {totalFeatures > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${featurePct}%` }} title={`Features: ${featurePct}%`} />}
                  {totalImprovements > 0 && <div className="bg-blue-500 h-full" style={{ width: `${improvePct}%` }} title={`Improvements: ${improvePct}%`} />}
                  {totalBugs > 0 && <div className="bg-red-500 h-full" style={{ width: `${bugPct}%` }} title={`Bug Fixes: ${bugPct}%`} />}
                  {grandTotal === 0 && <div className="bg-muted h-full w-full" />}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center text-emerald-500 font-medium">
                      <PlusCircle className="w-3.5 h-3.5 mr-1" /> {featurePct}%
                    </div>
                    <div className="text-muted-foreground">Features</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center text-blue-500 font-medium">
                      <Wrench className="w-3.5 h-3.5 mr-1" /> {improvePct}%
                    </div>
                    <div className="text-muted-foreground">Improvements</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center text-red-500 font-medium">
                      <Bug className="w-3.5 h-3.5 mr-1" /> {bugPct}%
                    </div>
                    <div className="text-muted-foreground">Bug Fixes</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
