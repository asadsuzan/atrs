import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMediaList, deleteMedia, type IMediaFile } from '../services/media';
import { useJobStream } from '../contexts/JobStreamContext';
import { getProducts } from '../services/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Image as ImageIcon, Video as VideoIcon, Search, Trash2, Copy, Check, FileQuestion, HardDrive, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import { playSound } from '@/lib/sound';

export default function MediaManager() {
  const queryClient = useQueryClient();
  const { runJob } = useJobStream();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'gif'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'in-use' | 'orphaned'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc' | 'size-asc'>('date-desc');
  const [selectedMedia, setSelectedMedia] = useState<IMediaFile | null>(null);
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IMediaFile | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  // Fetch Products for Filter
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 100 }),
  });
  const products = productsData?.data || [];

  // Fetch Media List
  const { data: mediaList = [], isLoading, isRefetching, refetch } = useQuery<IMediaFile[]>({
    queryKey: ['mediaList'],
    queryFn: getMediaList,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ filename, force }: { filename: string; force: boolean }) => deleteMedia(filename, force),
    onSuccess: (_, variables) => {
      playSound('delete');
      toast.success(`Deleted file ${variables.filename}`);
      queryClient.invalidateQueries({ queryKey: ['mediaList'] });
      setDeleteTarget(null);
      setSelectedMedia(null);
    },
    onError: (err: any) => {
      playSound('error');
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete file';
      toast.error(errMsg);
    }
  });

  // Streamed bulk purge of unused (orphaned) media.
  const startPurge = () => {
    setIsPurging(false);
    runJob({
      title: 'Purging unused media',
      url: '/media/purge-orphaned-stream',
      noun: 'file',
      onDone: () => queryClient.invalidateQueries({ queryKey: ['mediaList'] }),
    });
  };

  // Copy URL to Clipboard
  const handleCopyUrl = (url: string, filename: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      playSound('click');
      setCopiedFilename(filename);
      toast.success('Copied URL to clipboard');
      setTimeout(() => setCopiedFilename(null), 2000);
    });
  };

  // Format File Size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to determine media classification
  const getMediaType = (mime: string) => {
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    return 'other';
  };

  // Filter & Sort Logic
  const filteredMedia = mediaList
    .filter(item => {
      // 1. Search
      const matchesSearch = item.filename.toLowerCase().includes(search.toLowerCase());
      
      // 2. Type Filter
      const mediaType = getMediaType(item.mimeType);
      let matchesType = true;
      if (typeFilter === 'image') matchesType = mediaType === 'image';
      else if (typeFilter === 'video') matchesType = mediaType === 'video';
      else if (typeFilter === 'gif') matchesType = mediaType === 'gif';

      // 3. Usage Filter
      let matchesUsage = true;
      if (usageFilter === 'in-use') matchesUsage = !item.isOrphaned;
      else if (usageFilter === 'orphaned') matchesUsage = item.isOrphaned;

      // 4. Product Filter
      let matchesProduct = true;
      if (productFilter !== 'all') {
        matchesProduct = item.references.some(ref => ref.productId === productFilter);
      }

      return matchesSearch && matchesType && matchesUsage && matchesProduct;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'size-desc') return b.size - a.size;
      if (sortBy === 'size-asc') return a.size - b.size;
      return 0;
    });

  // Calculate Statistics
  const totalFiles = mediaList.length;
  const totalSize = mediaList.reduce((acc, item) => acc + item.size, 0);
  const orphanedFiles = mediaList.filter(item => item.isOrphaned);
  const orphanedCount = orphanedFiles.length;
  const orphanedSize = orphanedFiles.reduce((acc, item) => acc + item.size, 0);

  const handleDeleteClick = (e: React.MouseEvent, media: IMediaFile) => {
    e.stopPropagation();
    setDeleteTarget(media);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ImageIcon className="w-8 h-8 text-primary" />
            Media Library
          </h2>
          <p className="text-muted-foreground mt-1">Browse, check usage reference, and clean up uploaded media files.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching} title="Refresh Library">
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
          {orphanedCount > 0 && (
            <Button variant="destructive" onClick={() => setIsPurging(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Purge Unused ({orphanedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiles}</div>
            <p className="text-xs text-muted-foreground">Files hosted in your uploads folder</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
            <p className="text-xs text-muted-foreground">Total filesize of all uploaded items</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow transition-shadow border-amber-200 dark:border-amber-900/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unused Media</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
              {orphanedCount} <span className="text-sm font-medium text-muted-foreground">({formatBytes(orphanedSize)})</span>
            </div>
            <p className="text-xs text-muted-foreground">Assets not referenced in any DB collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search filename..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={productFilter} onValueChange={(v) => setProductFilter(v)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((prod: any) => (
                  <SelectItem key={prod._id} value={prod._id}>
                    {prod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={usageFilter} onValueChange={(v: any) => setUsageFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All References</SelectItem>
                <SelectItem value="in-use">In Use Only</SelectItem>
                <SelectItem value="orphaned">Unused (Orphaned)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest Uploads</SelectItem>
                <SelectItem value="date-asc">Oldest Uploads</SelectItem>
                <SelectItem value="size-desc">Largest Filesize</SelectItem>
                <SelectItem value="size-asc">Smallest Filesize</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Media Type Tabs */}
        <div className="flex gap-2 border-t pt-3 overflow-x-auto">
          {(['all', 'image', 'video', 'gif'] as const).map((tab) => (
            <Button
              key={tab}
              variant={typeFilter === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(tab)}
              className="capitalize"
            >
              {tab === 'all' && 'All Types'}
              {tab === 'image' && 'Images'}
              {tab === 'video' && 'Videos'}
              {tab === 'gif' && 'GIFs'}
            </Button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg border border-muted" />
          ))}
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-card text-muted-foreground flex flex-col items-center justify-center gap-2">
          <FileQuestion className="w-12 h-12 opacity-50" />
          <p className="text-lg font-medium">No media assets found</p>
          <p className="text-sm opacity-70">Try modifying your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {filteredMedia.map((media) => {
              const isImg = getMediaType(media.mimeType) === 'image' || getMediaType(media.mimeType) === 'gif';
              const isVid = getMediaType(media.mimeType) === 'video';
              return (
                <motion.div
                  layout
                  key={media.filename}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedMedia(media)}
                  className="group relative aspect-square bg-muted hover:bg-muted/80 rounded-lg border shadow-sm overflow-hidden cursor-pointer transition-all duration-300"
                >
                  {/* Media Content */}
                  {isImg ? (
                    <img src={media.url} alt={media.filename} className="w-full h-full object-cover select-none" />
                  ) : isVid ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 text-white select-none relative">
                      <VideoIcon className="w-10 h-10 text-primary" />
                      <video src={media.url} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" muted />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white select-none">
                      <FileQuestion className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlays/Badges */}
                  <div className="absolute top-2 left-2">
                    {media.isOrphaned ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-[10px] text-white">Unused</Badge>
                    ) : (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-[10px] text-white">In Use</Badge>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-3 transition-opacity duration-300">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(media.url, media.filename);
                        }}
                        title="Copy URL"
                      >
                        {copiedFilename === media.filename ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-red-500/20 hover:text-red-400"
                        onClick={(e) => handleDeleteClick(e, media)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="truncate text-white text-xs font-medium" title={media.filename}>
                      {media.filename}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={(open) => !open && setSelectedMedia(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">Media Details</DialogTitle>
            <DialogDescription className="truncate">{selectedMedia?.filename}</DialogDescription>
          </DialogHeader>
          
          {selectedMedia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Left Column: Preview */}
              <div className="aspect-video md:aspect-square bg-slate-900 border rounded-lg overflow-hidden flex items-center justify-center relative">
                {getMediaType(selectedMedia.mimeType) === 'image' || getMediaType(selectedMedia.mimeType) === 'gif' ? (
                  <img src={selectedMedia.url} alt={selectedMedia.filename} className="max-w-full max-h-full object-contain" />
                ) : getMediaType(selectedMedia.mimeType) === 'video' ? (
                  <video src={selectedMedia.url} controls className="w-full h-full object-contain" />
                ) : (
                  <FileQuestion className="w-20 h-20 text-muted-foreground" />
                )}
              </div>

              {/* Right Column: Metadata & References */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* File Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm border-b pb-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">File Size</span>
                      <span className="font-semibold">{formatBytes(selectedMedia.size)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">MIME Type</span>
                      <span className="font-semibold truncate block" title={selectedMedia.mimeType}>{selectedMedia.mimeType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Upload Date</span>
                      <span className="font-semibold">{format(new Date(selectedMedia.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Status</span>
                      {selectedMedia.isOrphaned ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-600 text-[10px] mt-0.5">Unused</Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] mt-0.5">In Use</Badge>
                      )}
                    </div>
                  </div>

                  {/* References List */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      Usage References ({selectedMedia.references.length})
                    </h4>
                    {selectedMedia.isOrphaned ? (
                      <div className="text-xs p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 rounded border border-amber-100 dark:border-amber-900/20">
                        This file is not used anywhere in the system and is safe to delete.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                        {selectedMedia.references.map((ref, idx) => (
                          <div key={idx} className="text-xs p-2 bg-muted rounded border flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="font-bold uppercase text-[9px] px-1 bg-primary/10 text-primary rounded mr-1.5">
                                {ref.entityType}
                              </span>
                              <span className="font-medium" title={ref.entityName}>{ref.entityName}</span>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-[10px] font-mono">
                              {ref.field}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopyUrl(selectedMedia.url, selectedMedia.filename)}
                  >
                    {copiedFilename === selectedMedia.filename ? (
                      <><Check className="w-4 h-4 mr-2 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy URL</>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setDeleteTarget(selectedMedia)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md border-red-200 dark:border-red-950 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm File Deletion
            </DialogTitle>
            <DialogDescription className="break-all pt-1 font-medium">
              Are you sure you want to delete <span className="font-bold underline text-foreground">{deleteTarget?.filename}</span>?
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && !deleteTarget.isOrphaned && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 rounded border border-red-100 dark:border-red-900/20 space-y-2 text-xs">
              <p className="font-bold">⚠️ Warning: This file is currently in use!</p>
              <p>Deleting it will break display links in the following locations:</p>
              <ul className="list-disc pl-4 space-y-1 font-medium">
                {deleteTarget.references.slice(0, 4).map((ref, idx) => (
                  <li key={idx} className="truncate">
                    <span className="capitalize">{ref.entityType}</span>: {ref.entityName}
                  </li>
                ))}
                {deleteTarget.references.length > 4 && (
                  <li>...and {deleteTarget.references.length - 4} more entities.</li>
                )}
              </ul>
              <p className="pt-1 text-[10px] font-bold">This deletion will force-unlink the media from these items.</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({
                    filename: deleteTarget.filename,
                    force: !deleteTarget.isOrphaned
                  });
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : deleteTarget?.isOrphaned ? 'Yes, Delete' : 'Yes, Force Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Purge Confirmation Dialog */}
      <Dialog open={isPurging} onOpenChange={setIsPurging}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              Purge Unused Media Assets
            </DialogTitle>
            <DialogDescription className="pt-1">
              This action will permanently delete all <span className="font-bold">{orphanedCount} unused files</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-xs p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 rounded border border-amber-100 dark:border-amber-900/20 space-y-1">
            <p>• Only files with zero database references will be deleted.</p>
            <p>• This frees up approximately <span className="font-bold">{formatBytes(orphanedSize)}</span> of local disk space.</p>
            <p>• This action is irreversible.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={startPurge}
            >
              Confirm Purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
