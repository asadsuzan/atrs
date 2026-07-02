import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { browseDirs } from '../../services/products';
import { Folder, HardDrive, CornerLeftUp, Loader2, Check, Home, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPath?: string;
  onSelect: (path: string) => void;
}

/** Server-side folder picker for choosing a product's local repo path. */
export function RepoPathBrowser({ open, onOpenChange, initialPath, onSelect }: Props) {
  // '' means the root view (drive list on Windows, "/" on POSIX).
  const [current, setCurrent] = useState<string>(initialPath || '');
  const [pathInput, setPathInput] = useState<string>(initialPath || '');

  // Reset to the field's current value each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setCurrent(initialPath || '');
      setPathInput(initialPath || '');
    }
  }, [open, initialPath]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['browse-dirs', current],
    queryFn: () => browseDirs(current || undefined),
    enabled: open,
    retry: false,
  });

  // Keep the editable path box in sync with the resolved directory.
  useEffect(() => {
    if (data && !isError) setPathInput(data.path || '');
  }, [data, isError]);

  const atRoot = !data || data.isRoot;
  const selectable = !!data && !data.isRoot && !!data.path;
  const errMsg = (error as any)?.response?.data?.message || 'Could not open that folder.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose local repo folder</DialogTitle>
          <DialogDescription>
            Browse folders on the server machine and pick the product's Git repository.
          </DialogDescription>
        </DialogHeader>

        {/* Editable path + Go */}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setCurrent(pathInput.trim()); }}
        >
          <Input
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="Type or paste a path…"
            className="font-mono text-xs"
          />
          <Button type="submit" variant="outline" size="sm">Go</Button>
        </form>

        {/* Toolbar: up + home */}
        <div className="flex items-center gap-2">
          <Button
            type="button" variant="outline" size="sm"
            disabled={!data || data.parent === null}
            onClick={() => data && data.parent !== null && setCurrent(data.parent)}
            className="gap-1.5"
          >
            <CornerLeftUp className="w-4 h-4" /> Up
          </Button>
          {data?.home && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setCurrent(data.home)} className="gap-1.5">
              <Home className="w-4 h-4" /> Home
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-[240px]" title={data?.path || 'Root'}>
            {data?.path || (atRoot ? 'Select a drive' : 'Root')}
          </span>
        </div>

        {/* Listing */}
        <div className="h-72 overflow-y-auto rounded-lg border bg-muted/20 divide-y">
          {isFetching ? (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full text-sm text-destructive gap-2 px-4 text-center">
              <AlertCircle className="w-5 h-5" /> {errMsg}
            </div>
          ) : (
            <>
              {/* Windows drive chips at the root */}
              {data?.drives?.map((d) => (
                <button
                  key={d.path}
                  type="button"
                  onClick={() => setCurrent(d.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
                >
                  <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{d.name}</span>
                </button>
              ))}
              {data?.dirs.map((d) => (
                <button
                  key={d.path}
                  type="button"
                  onDoubleClick={() => setCurrent(d.path)}
                  onClick={() => setCurrent(d.path)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left"
                >
                  <Folder className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
              {!data?.drives?.length && !data?.dirs.length && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground px-4 text-center py-10">
                  No sub-folders here — you can still select this folder.
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selectable}
            onClick={() => { if (data?.path) { onSelect(data.path); onOpenChange(false); } }}
            className="gap-1.5"
          >
            <Check className="w-4 h-4" /> Use this folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
