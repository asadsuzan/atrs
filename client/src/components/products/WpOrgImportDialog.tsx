import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wpOrgPreview, importFromWpOrg } from '../../services/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Download, Globe, RefreshCw } from 'lucide-react';

interface WpPlugin {
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  category: 'plugin' | 'block';
  alreadyImported: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WpOrgImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [plugins, setPlugins] = useState<WpPlugin[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);

  const previewMutation = useMutation({
    mutationFn: () => wpOrgPreview(username.trim()),
    onSuccess: (data: WpPlugin[]) => {
      setPlugins(data);
      // Pre-select all (new and existing), since existing will now be updated
      setSelected(new Set(data.map(p => p.slug)));
      setFetched(true);
      if (data.length === 0) toast.info('No plugins found for that username.');
    },
    onError: () => toast.error('Failed to fetch plugins from WordPress.org'),
  });

  const importMutation = useMutation({
    mutationFn: () => importFromWpOrg(username.trim(), Array.from(selected)),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.created.length) parts.push(`${result.created.length} created`);
      if (result.updated.length) parts.push(`${result.updated.length} updated`);
      toast.success(parts.length ? parts.join(', ') : 'Done');
      if (result.errors.length) toast.error(`${result.errors.length} error(s) during import`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleClose();
    },
    onError: () => toast.error('Import failed'),
  });

  const handleClose = () => {
    setUsername('');
    setPlugins([]);
    setSelected(new Set());
    setFetched(false);
    onOpenChange(false);
  };

  const toggleAll = () => {
    if (plugins.every(p => selected.has(p.slug))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(plugins.map(p => p.slug)));
    }
  };

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const allSelected = plugins.length > 0 && plugins.every(p => selected.has(p.slug));
  const toUpdate = Array.from(selected).filter(s => plugins.find(p => p.slug === s)?.alreadyImported).length;
  const toCreate = selected.size - toUpdate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" /> Import from WordPress.org
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="WordPress.org username (e.g. bplugins)"
            value={username}
            onChange={e => { setUsername(e.target.value); setFetched(false); setPlugins([]); }}
            onKeyDown={e => e.key === 'Enter' && username.trim() && previewMutation.mutate()}
          />
          <Button
            onClick={() => previewMutation.mutate()}
            disabled={!username.trim() || previewMutation.isPending}
          >
            {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
          </Button>
        </div>

        {fetched && plugins.length > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="select-all" className="cursor-pointer select-none">
                  Select all ({plugins.length})
                </label>
              </div>
              <span>{selected.size} selected</span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {plugins.map(plugin => (
                <div
                  key={plugin.slug}
                  onClick={() => toggle(plugin.slug)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(plugin.slug)
                      ? 'bg-primary/5 border-primary/30'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    checked={selected.has(plugin.slug)}
                    onCheckedChange={() => toggle(plugin.slug)}
                    onClick={e => e.stopPropagation()}
                  />
                  {plugin.icon ? (
                    <img src={plugin.icon} alt={plugin.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-muted" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{plugin.name}</span>
                      <Badge variant="outline" className="capitalize text-xs flex-shrink-0">{plugin.category}</Badge>
                      {plugin.alreadyImported && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Will update
                        </Badge>
                      )}
                    </div>
                    {plugin.shortDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plugin.shortDescription}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              {selected.size > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {[toCreate > 0 && `${toCreate} new`, toUpdate > 0 && `${toUpdate} update`].filter(Boolean).join(' · ')}
                </p>
              ) : <span />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={selected.size === 0 || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Import {selected.size} product{selected.size !== 1 ? 's' : ''}</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
