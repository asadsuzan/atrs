import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getMonthlyReport } from '../services/reports';
import { getProducts } from '../services/products';
import { getActivities } from '../services/activities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, PlusCircle, Wrench, Bug, FileText, Activity as ActivityIcon, ArrowRight, Play, ServerOff, Puzzle, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition, { staggerContainer, staggerItem } from '../components/layout/PageTransition';

export default function Dashboard() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['dashboardReport', currentMonth, currentYear],
    queryFn: () => getMonthlyReport({ month: currentMonth, year: currentYear }),
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['dashboardProducts'],
    queryFn: () => getProducts(),
  });

  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['dashboardActivities'],
    queryFn: () => getActivities({ limit: -1 }),
  });

  if (isReportLoading || isProductsLoading || isActivitiesLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
  
  const recentActivities = [...allActivities].sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || a.activityDate).getTime();
    const dateB = new Date(b.createdAt || b.activityDate).getTime();
    return dateB - dateA;
  }).slice(0, 8);

  const totalFeatures = allActivities.filter((a: any) => a.type === 'feature').length;
  const totalImprovements = allActivities.filter((a: any) => a.type === 'improvement').length;
  const totalBugs = allActivities.filter((a: any) => a.type === 'bug-fix').length;
  const totalReleased = allActivities.filter((a: any) => a.tags?.includes('released')).length;
  const totalUnreleased = allActivities.filter((a: any) => a.tags?.includes('unreleased')).length;
  const grandTotal = totalFeatures + totalImprovements + totalBugs || 1;

  const featurePct = Math.round((totalFeatures / grandTotal) * 100);
  const improvePct = Math.round((totalImprovements / grandTotal) * 100);
  const bugPct = grandTotal > 1 ? (100 - featurePct - improvePct) : Math.round((totalBugs / grandTotal) * 100);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'improvement': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'bug-fix': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
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
                  recentActivities.map((activity: any) => (
                    <Link key={activity._id} to={`/products/${activity.productId?._id}#activity-${activity._id}`} className="flex items-start gap-4 p-3 rounded-lg border bg-card/50 transition-colors hover:bg-muted/50 cursor-pointer block">
                      <div className="mt-0.5">
                        {activity.type === 'feature' && <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full"><PlusCircle className="w-4 h-4" /></div>}
                        {activity.type === 'improvement' && <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full"><Wrench className="w-4 h-4" /></div>}
                        {activity.type === 'bug-fix' && <div className="p-2 bg-red-500/10 text-red-500 rounded-full"><Bug className="w-4 h-4" /></div>}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p className="text-sm font-medium leading-tight">{activity.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.createdAt || activity.activityDate), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground pt-1 flex-wrap gap-y-1">
                          <span className="font-medium text-foreground/80">{activity.productId?.name || 'Unknown Product'}</span>
                          <span className="mx-2">•</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${getTypeColor(activity.type)}`}>
                            {activity.type}
                          </Badge>
                          {activity.tier && (
                            <>
                              <span className="mx-2">•</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                                {activity.tier}
                              </Badge>
                            </>
                          )}
                          {activity.tags?.includes('released') && (
                            <>
                              <span className="mx-2">•</span>
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-none text-[10px] px-1.5 py-0 uppercase">RELEASED</Badge>
                            </>
                          )}
                          {activity.tags?.includes('unreleased') && (
                            <>
                              <span className="mx-2">•</span>
                              <Badge variant="default" className="bg-slate-500 hover:bg-slate-600 text-white border-none text-[10px] px-1.5 py-0 uppercase">UNRELEASED</Badge>
                            </>
                          )}
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
