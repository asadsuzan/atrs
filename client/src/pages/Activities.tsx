import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivities, createActivity, deleteActivity, updateActivity } from '../services/activities';
import { getProducts } from '../services/products';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ActivityForm } from '../components/activities/ActivityForm';
import { Plus, Edit2, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Activities() {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useLocalStorage<string>('atrs_filter_productId', 'all');
  const [type, setType] = useLocalStorage<string>('atrs_filter_type', 'all');
  const [tier, setTier] = useLocalStorage<string>('atrs_filter_tier', 'all');
  const [tagFilter, setTagFilter] = useLocalStorage<string>('atrs_filter_tag', 'all');
  const [startDate, setStartDate] = useLocalStorage<string>('atrs_filter_startDate', '');
  const [endDate, setEndDate] = useLocalStorage<string>('atrs_filter_endDate', '');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useLocalStorage<string>('atrs_filter_sortBy', 'activityDate');
  const [sortOrder, setSortOrder] = useLocalStorage<string>('atrs_filter_sortOrder', 'desc');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const queryParams: any = { page, limit: 10, sortBy, sortOrder };
  if (productId && productId !== 'all') queryParams.productId = productId;
  if (type && type !== 'all') queryParams.type = type;
  if (type === 'feature' && tier && tier !== 'all') queryParams.tier = tier;
  if (tagFilter && tagFilter !== 'all') queryParams.tags = tagFilter;
  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;

  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities', queryParams],
    queryFn: () => getActivities(queryParams),
  });

  const activities = activitiesData?.data || [];
  const totalPages = activitiesData?.totalPages || 1;

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };
  
  const SortIcon = ({ field }: { field: string }) => {
    return <ArrowUpDown className={`w-4 h-4 ml-1 ${sortBy === field ? 'opacity-100' : 'opacity-30'}`} />;
  };

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });
  const products = productsData?.data || [];

  const createMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      toast.success("Activity created successfully");
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setIsAddOpen(false);
    },
    onError: () => toast.error("Failed to create activity")
  });

  const updateMutation = useMutation({
    mutationFn: updateActivity,
    onSuccess: () => {
      toast.success("Activity updated successfully");
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setEditingActivity(null);
    },
    onError: () => toast.error("Failed to update activity")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      toast.success("Activity deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => toast.error("Failed to delete activity")
  });

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'feature': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200';
      case 'improvement': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200';
      case 'bug-fix': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      default: return '';
    }
  };

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Activities</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <ActivityForm onSubmit={(data: any) => {
              if(!data.mediaType) delete data.mediaType;
              if(!data.mediaUrl) delete data.mediaUrl;
              createMutation.mutate(data);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border flex-wrap">
        <Select value={productId} onValueChange={(v) => { setProductId(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products?.map((p: any) => (
              <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="bug-fix">Bug Fix</SelectItem>
          </SelectContent>
        </Select>
        {type === 'feature' && (
          <Select value={tier} onValueChange={(v) => { setTier(v); setPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="unreleased">Unreleased</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full sm:w-[150px]" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-full sm:w-[150px]" />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('activityDate')}>
                <div className="flex items-center">Date <SortIcon field="activityDate" /></div>
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center">Type <SortIcon field="type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort('title')}>
                <div className="flex items-center">Title <SortIcon field="title" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">No activities found.</TableCell>
              </TableRow>
            ) : (
              activities.map((activity: any, index: number) => (
                <motion.tr 
                  key={activity._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <TableCell className="whitespace-nowrap">
                    {new Date(activity.activityDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {activity.productId?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getTypeColor(activity.type)}`}>
                      {activity.type.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/products/${activity.productId?._id}#activity-${activity._id}`}
                        className="truncate hover:underline text-primary transition-colors"
                      >
                        {activity.title}
                      </Link>
                      {activity.tier === 'pro' && (
                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">PRO</Badge>
                      )}
                      {activity.tags?.includes('released') && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">RELEASED</Badge>
                      )}
                      {activity.tags?.includes('unreleased') && (
                        <Badge variant="default" className="bg-slate-500 hover:bg-slate-600 text-white border-none uppercase text-[10px] px-1.5 py-0 h-4 shrink-0">UNRELEASED</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditingActivity({
                      ...activity,
                      productId: activity.productId?._id,
                      activityDate: new Date(activity.activityDate).toISOString().split('T')[0],
                      tags: activity.tags || []
                    })}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (await confirm({ title: 'Delete Activity', description: 'Are you sure you want to permanently delete this activity?' })) {
                        deleteMutation.mutate(activity._id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!editingActivity} onOpenChange={(open: boolean) => !open && setEditingActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <ActivityForm
              initialData={editingActivity}
              onSubmit={(data: any) => {
                if(!data.mediaType) delete data.mediaType;
                if(!data.mediaUrl) delete data.mediaUrl;
                updateMutation.mutate({ id: editingActivity._id, ...data });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
