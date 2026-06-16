import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  wpOrgPreview,
  importFromWpOrgStream,
  cancelImportSession,
  type ImportProgress,
  type ImportSummary,
} from '../../services/products';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Download, Globe, RefreshCw, Terminal } from 'lucide-react';
import { playSound } from '@/lib/sound';

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

type LogLine = {
  type: ImportProgress['type'];
  message: string;
  slug?: string;
  timestamp: string;
};

const LOG_STYLES: Record<ImportProgress['type'], { color: string; icon: string }> = {
  info: { color: 'text-slate-400', icon: 'ℹ' },
  success: { color: 'text-emerald-400', icon: '✓' },
  warn: { color: 'text-amber-400', icon: '⚠' },
  error: { color: 'text-red-400', icon: '✗' },
};

export function WpOrgImportDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [plugins, setPlugins] = useState<WpPlugin[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);

  // Live-import state
  const [isImporting, setIsImporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the console to the bottom as new lines arrive.
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

  // Abort any in-flight import if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const previewMutation = useMutation({
    mutationFn: () => wpOrgPreview(username.trim()),
    onSuccess: (data: WpPlugin[]) => {
      setPlugins(data);
      // Pre-select all (new and existing), since existing will now be updated
      setSelected(new Set(data.map(p => p.slug)));
      setFetched(true);
      if (data.length === 0) toast.info('No plugins found for that username.');
      else playSound('success');
    },
    onError: () => {
      playSound('error');
      toast.error('Failed to fetch plugins from WordPress.org');
    },
  });

  const startImport = async () => {
    setIsImporting(true);
    setIsCancelling(false);
    setLogs([]);
    setSummary(null);
    setProgress(null);
    sessionIdRef.current = null;

    const controller = new AbortController();
    abortRef.current = controller;

    const pushLog = (line: Omit<LogLine, 'timestamp'>) => {
      const timestamp = new Date().toLocaleTimeString([], { hour12: false });
      setLogs(prev => [...prev, { ...line, timestamp }]);
    };

    try {
      await importFromWpOrgStream(
        username.trim(),
        Array.from(selected),
        {
          onSession: (id) => { sessionIdRef.current = id; },
          onProgress: (e) => {
            if (e.pluginIndex && e.totalPlugins) {
              setProgress({ current: e.pluginIndex, total: e.totalPlugins });
            }
            pushLog({ type: e.type, message: e.message, slug: e.slug });
          },
          onComplete: (result) => {
            setSummary(result);
            playSound(result.errors.length ? 'error' : 'success');
            if (result.cancelled) {
              toast.info(`Import cancelled — rolled back ${result.rolledBack ?? 0} product(s)`);
            } else {
              const parts: string[] = [];
              if (result.created) parts.push(`${result.created} created`);
              if (result.updated) parts.push(`${result.updated} updated`);
              toast.success(parts.length ? parts.join(', ') : 'Import complete');
              if (result.errors.length) toast.error(`${result.errors.length} error(s) during import`);
            }
            // Created products may have been added then rolled back — refresh either way.
            queryClient.invalidateQueries({ queryKey: ['products'] });
          },
          onError: (message) => {
            playSound('error');
            pushLog({ type: 'error', message });
            toast.error(message);
          },
        },
        controller.signal,
      );
    } catch (err: any) {
      // AbortError fires when the user hard-closes the dialog mid-import — ignore it.
      if (err?.name !== 'AbortError') {
        playSound('error');
        pushLog({ type: 'error', message: err?.message || 'Import failed' });
        toast.error('Import failed');
      }
    } finally {
      setIsImporting(false);
      setIsCancelling(false);
      abortRef.current = null;
    }
  };

  // Graceful cancel: signal the server to stop and roll back, but keep the
  // stream open so rollback progress streams into the console. The stream ends
  // on its own once rollback finishes (onComplete with cancelled: true).
  const requestCancel = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      // Stream hasn't reported its session yet — fall back to a hard abort.
      abortRef.current?.abort();
      return;
    }
    setIsCancelling(true);
    try {
      await cancelImportSession(sessionId);
    } catch {
      toast.error('Failed to request cancellation');
      setIsCancelling(false);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setUsername('');
    setPlugins([]);
    setSelected(new Set());
    setFetched(false);
    setIsImporting(false);
    setIsCancelling(false);
    setLogs([]);
    setProgress(null);
    setSummary(null);
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

  // Console view (during/after import)
  const showConsole = isImporting || logs.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showConsole ? <Terminal className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
            {showConsole ? 'Importing from WordPress.org' : 'Import from WordPress.org'}
          </DialogTitle>
        </DialogHeader>

        {showConsole ? (
          <>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isImporting
                    ? isCancelling
                      ? 'Cancelling — rolling back…'
                      : progress
                        ? `Importing plugin ${progress.current} of ${progress.total}…`
                        : 'Starting import…'
                    : summary?.cancelled
                      ? 'Import cancelled — changes rolled back'
                      : 'Import finished'}
                </span>
                {progress && !isCancelling && (
                  <span className="text-muted-foreground">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCancelling || summary?.cancelled
                      ? 'bg-amber-500'
                      : summary?.errors.length
                        ? 'bg-amber-500'
                        : 'bg-primary'
                  } ${isCancelling ? 'animate-pulse' : ''}`}
                  style={{
                    width: isCancelling
                      ? '100%'
                      : progress
                        ? `${(progress.current / progress.total) * 100}%`
                        : isImporting ? '5%' : '100%',
                  }}
                />
              </div>
            </div>

            {/* Live console */}
            <div className="flex-1 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed">
              {logs.map((line, i) => {
                const style = LOG_STYLES[line.type];
                return (
                  <div key={i} className="flex gap-2 whitespace-pre-wrap break-words">
                    <span className="flex-shrink-0 text-slate-600">{line.timestamp}</span>
                    <span className={`flex-shrink-0 ${style.color}`}>{style.icon}</span>
                    <span className={style.color}>
                      {line.slug && <span className="text-sky-400">[{line.slug}] </span>}
                      {line.message}
                    </span>
                  </div>
                );
              })}
              {isImporting && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> {isCancelling ? 'rolling back…' : 'working…'}
                </div>
              )}
              <div ref={logEndRef} />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              {summary ? (
                <p className="text-xs text-muted-foreground">
                  {summary.cancelled
                    ? `Cancelled · ${summary.rolledBack ?? 0} rolled back · ${summary.updated} kept · ${summary.errors.length} error(s)`
                    : `${summary.created} created · ${summary.updated} updated · ${summary.errors.length} error(s)`}
                </p>
              ) : <span />}
              {isImporting ? (
                <Button variant="outline" onClick={requestCancel} disabled={isCancelling}>
                  {isCancelling ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cancelling…</>
                  ) : 'Cancel & roll back'}
                </Button>
              ) : (
                <Button onClick={handleClose}>Close</Button>
              )}
            </div>
          </>
        ) : (
          <>
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
                      onClick={startImport}
                      disabled={selected.size === 0}
                    >
                      <Download className="w-4 h-4 mr-2" /> Import {selected.size} product{selected.size !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
