import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMediaList, type IMediaFile } from '../../services/media';
import { getProducts } from '../../services/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Image as ImageIcon, Video as VideoIcon, Check, FileQuestion } from 'lucide-react';

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (urls: string | string[]) => void;
  multiple?: boolean;
  accept?: string;
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  accept = 'image/*,video/*',
}: MediaLibraryDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState<string>('all');

  // Fetch Products for Filter
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 100 }),
    enabled: open,
  });
  const products = productsData?.data || [];

  // Fetch Media List
  const { data: mediaList = [], isLoading } = useQuery<IMediaFile[]>({
    queryKey: ['mediaList'],
    queryFn: getMediaList,
    enabled: open, // Only fetch when dialog is open
  });

  const getMediaType = (mime: string) => {
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    return 'other';
  };

  // Check if file extension matches the accept prop
  const isAccepted = (item: IMediaFile) => {
    const type = getMediaType(item.mimeType);
    const acceptLower = accept.toLowerCase();
    
    if (acceptLower === '*/*' || acceptLower.includes('image/*,video/*') || acceptLower.includes('video/*,image/*')) {
      return type === 'image' || type === 'video' || type === 'gif';
    }
    
    let ok = false;
    if (acceptLower.includes('image/*') && (type === 'image' || type === 'gif')) {
      ok = true;
    }
    if (acceptLower.includes('video/*') && type === 'video') {
      ok = true;
    }
    if (acceptLower.includes('gif') && type === 'gif') {
      ok = true;
    }
    
    return ok;
  };

  const filteredMedia = mediaList
    .filter(isAccepted)
    .filter((item) => item.filename.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => {
      if (productFilter === 'all') return true;
      return item.references.some((ref) => ref.productId === productFilter);
    });

  const handleMediaClick = (url: string) => {
    if (multiple) {
      if (selectedUrls.includes(url)) {
        setSelectedUrls(selectedUrls.filter((u) => u !== url));
      } else {
        setSelectedUrls([...selectedUrls, url]);
      }
    } else {
      setSelectedUrls([url]);
    }
  };

  const handleSelectConfirm = () => {
    if (selectedUrls.length === 0) return;
    if (multiple) {
      onSelect(selectedUrls);
    } else {
      onSelect(selectedUrls[0]);
    }
    onOpenChange(false);
    setSelectedUrls([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedUrls([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if(!v) handleClose(); }}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Select Media from Library
          </DialogTitle>
        </DialogHeader>

        {/* Search & Filter */}
        <div className="flex gap-2 my-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media files by filename..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={productFilter} onValueChange={(v) => setProductFilter(v)}>
            <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg border border-muted" />
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <FileQuestion className="w-10 h-10 opacity-50" />
              <p className="text-sm font-medium">No matching media assets found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredMedia.map((media) => {
                const isImg = getMediaType(media.mimeType) === 'image' || getMediaType(media.mimeType) === 'gif';
                const isVid = getMediaType(media.mimeType) === 'video';
                const isSelected = selectedUrls.includes(media.url);
                return (
                  <div
                    key={media.filename}
                    onClick={() => handleMediaClick(media.url)}
                    className={`group relative aspect-square bg-muted rounded-md border overflow-hidden cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/40 ring-offset-1'
                        : 'border-muted hover:border-muted-foreground/45'
                    }`}
                  >
                    {/* Media Preview */}
                    {isImg ? (
                      <img src={media.url} alt={media.filename} className="w-full h-full object-cover" />
                    ) : isVid ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground relative">
                        <VideoIcon className="w-6 h-6 text-primary" />
                        <video src={media.url} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" muted />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <FileQuestion className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Checkbox Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                          <Check className="w-4 h-4 stroke-[3px]" />
                        </div>
                      </div>
                    )}

                    {/* Name Hover Overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 opacity-0 group-hover:opacity-100 p-1 text-[10px] text-white truncate text-center transition-opacity duration-150">
                      {media.filename}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="border-t pt-4 shrink-0 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedUrls.length > 0
              ? `${selectedUrls.length} file(s) selected`
              : 'Choose one or more items from the library'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedUrls.length === 0}
              onClick={handleSelectConfirm}
            >
              Select Media
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
