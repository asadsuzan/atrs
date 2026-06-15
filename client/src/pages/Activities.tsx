import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivities, createActivity, deleteActivity, updateActivity, bulkUpdateActivities, bulkDeleteActivities } from '../services/activities';
import { getProducts } from '../services/products';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ActivityForm } from '../components/activities/ActivityForm';
import { Plus, Edit2, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Activities() {
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const [productId, setProductId] = useLocalStorage<string>('atrs_activities_productId', 'all');
  const [type, setType] = useLocalStorage<string>('atrs_activities_type', 'all');
  const [tier, setTier] = useLocalStorage<string>('atrs_activities_tier', 'all');
  const [tagFilter, setTagFilter] = useLocalStorage<string>('atrs_activities_tag', 'all');
  const [search, setSearch] = useLocalStorage<string>('atrs_activities_search', '');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [startDate, setStartDate] = useLocalStorage<string>('atrs_activities_startDate', '');
  const [endDate, setEndDate] = useLocalStorage<string>('atrs_activities_endDate', '');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useLocalStorage<string>('atrs_activities_sortBy', 'activityDate');
  const [sortOrder, setSortOrder] = useLocalStorage<string>('atrs_activities_sortOrder', 'desc');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  const queryParams: any = { page, limit: 10, sortBy, sortOrder };
  if (productId && productId !== 'all') queryParams.productId = productId;
  if (type && type !== 'all') queryParams.type = type;
  if (type === 'feature' && tier && tier !== 'all') queryParams.tier = tier;
  if (tagFilter && tagFilter !== 'all') queryParams.tags = tagFilter;
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (startDate) queryParams.startDate = startDate;
  if (endDate) queryParams.endDate = endDate;

  const { data: activitiesData, isLoading, isError } = useQuery({
    queryKey: ['activities', queryParams],
    queryFn: () => getActivities(queryParams),
  });

  const activities = activitiesData?.data || [];
  const totalPages = activitiesData?.totalPages || 1;

  // Clear bulk selection whenever the page or any filter changes so bulk
  // actions can never operate on rows that are no longer visible.
  useEffect(() => {
    setSelectedIds([]);
  }, [page, debouncedSearch, productId, type, tier, tagFilter, startDate, endDate, sortBy, sortOrder]);

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

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, update }: { ids: string[], update: any }) => bulkUpdateActivities(ids, update),
    onSuccess: () => {
      toast.success("Activities updated");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => toast.error("Failed to update activities")
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteActivities,
    onSuccess: () => {
      toast.success("Activities deleted");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => toast.error("Failed to delete activities")
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(activities.map((a: any) => a._id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(i => i !== id));
  };

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
              if(!data.mediaType) data.mediaType = null;
              if(!data.mediaUrl) data.mediaUrl = null;
              createMutation.mutate(data);
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Row 1: Search + Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 p-3 border-b">
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-[220px] flex-shrink-0"
          />
          <div className="w-px h-5 bg-border flex-shrink-0" />
          <Select value={productId} onValueChange={(v) => { setProductId(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[180px] flex-shrink-0">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products?.map((p: any) => (
                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] flex-shrink-0">
              <SelectValue placeholder="All Types" />
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
              <SelectTrigger className="h-9 w-[110px] flex-shrink-0">
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[130px] flex-shrink-0">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="unreleased">Unreleased</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: Date Range */}
        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
            Date Range
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
              <DatePicker
                value={startDate}
                onChange={(v) => { setStartDate(v); setPage(1); }}
                placeholder="Start date"
                max={endDate || undefined}
                clearable
                className="h-8 w-[160px] text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
              <DatePicker
                value={endDate}
                onChange={(v) => { setEndDate(v); setPage(1); }}
                placeholder="End date"
                min={startDate || undefined}
                clearable
                className="h-8 w-[160px] text-sm"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
              >
                Clear dates
              </Button>
            )}
          </div>
          {(search || productId !== 'all' || type !== 'all' || tagFilter !== 'all' || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => {
                setSearch('');
                setProductId('all');
                setType('all');
                setTier('all');
                setTagFilter('all');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Reset all filters
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={activities.length > 0 && selectedIds.length === activities.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead aria-sort={sortBy === 'activityDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="flex items-center w-full hover:opacity-80 transition-opacity" onClick={() => handleSort('activityDate')} aria-label="Sort by date">
                  Date <SortIcon field="activityDate" />
                </button>
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead aria-sort={sortBy === 'type' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="flex items-center w-full hover:opacity-80 transition-opacity" onClick={() => handleSort('type')} aria-label="Sort by type">
                  Type <SortIcon field="type" />
                </button>
              </TableHead>
              <TableHead aria-sort={sortBy === 'title' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="flex items-center w-full hover:opacity-80 transition-opacity" onClick={() => handleSort('title')} aria-label="Sort by title">
                  Title <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
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
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-destructive">
                  Failed to load activities. Please try again.
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">No activities found.</TableCell>
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
                  <TableCell>
                    <Checkbox 
                      checked={selectedIds.includes(activity._id)}
                      onCheckedChange={(checked: boolean) => handleSelectOne(activity._id, checked)}
                      aria-label="Select row"
                    />
                  </TableCell>
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
                    <Button variant="ghost" size="icon" aria-label={`Edit ${activity.title}`} onClick={() => setEditingActivity({
                      ...activity,
                      productId: activity.productId?._id,
                      activityDate: format(new Date(activity.activityDate), 'yyyy-MM-dd'),
                      tags: activity.tags || []
                    })}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${activity.title}`} onClick={async () => {
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

      {selectedIds.length > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50"
        >
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, update: { $addToSet: { tags: 'released' }, $pull: { tags: 'unreleased' } } })}>
            Mark Released
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, update: { $addToSet: { tags: 'unreleased' }, $pull: { tags: 'released' } } })}>
            Mark Unreleased
          </Button>
          <Button variant="destructive" size="sm" onClick={async () => {
            if (await confirm({ title: 'Delete Activities', description: `Are you sure you want to delete ${selectedIds.length} activities?` })) {
              bulkDeleteMutation.mutate(selectedIds);
            }
          }}>
            Delete
          </Button>
        </motion.div>
      )}

      <Dialog open={!!editingActivity} onOpenChange={(open: boolean) => !open && setEditingActivity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          {editingActivity && (
            <ActivityForm
              key={editingActivity._id}
              initialData={editingActivity}
              onSubmit={(data: any) => {
                if(!data.mediaType) data.mediaType = null;
                if(!data.mediaUrl) data.mediaUrl = null;
                updateMutation.mutate({ id: editingActivity._id, ...data });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
