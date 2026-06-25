import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, Globe, Package, RefreshCw, Terminal, Minus } from 'lucide-react';
import { useWpImport } from '../../contexts/WpImportContext';
import { type ImportProgress } from '../../services/products';
import { cn } from '@/lib/utils';

const LOG_STYLES: Record<ImportProgress['type'], { color: string; icon: string }> = {
  info: { color: 'text-slate-400', icon: 'ℹ' },
  success: { color: 'text-emerald-400', icon: '✓' },
  warn: { color: 'text-amber-400', icon: '⚠' },
  error: { color: 'text-red-400', icon: '✗' },
};

export function WpOrgImportDialog() {
  const {
    isOpen, close, minimize,
    mode, setMode,
    username, setUsername, plugins, selected, fetched, previewLoading, fetchPlugins,
    toggle, toggleAll,
    slugInput, setSlugInput, fetchSlugPlugins,
    isImporting, isCancelling, logs, progress, summary, startImport, requestCancel,
  } = useWpImport();

  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the console to the bottom as new lines arrive.
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs, isOpen]);

  const allSelected = plugins.length > 0 && plugins.every(p => selected.has(p.slug));
  const toUpdate = Array.from(selected).filter(s => plugins.find(p => p.slug === s)?.alreadyImported).length;
  const toCreate = selected.size - toUpdate;

  // Console view is shown during and after an import.
  const showConsole = isImporting || logs.length > 0;

  // Closing the window (X / Escape / outside click) keeps a running import
  // alive by minimizing it; otherwise it fully resets.
  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (isImporting) minimize();
    else close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        {/* Minimize button — only meaningful once an import is running/finished;
            sits to the left of the built-in close (X). */}
        {showConsole && (
          <button
            type="button"
            onClick={minimize}
            aria-label="Minimize"
            title="Minimize to floating window"
            className="absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <Minus className="h-4 w-4" />
            <span className="sr-only">Minimize</span>
          </button>
        )}

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
                <Button onClick={close}>Close</Button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Method switch — import a whole catalogue by author username, or
                pull specific plugins by slug (mirrors the onboarding chooser). */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('username')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  mode === 'username' ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                )}
              >
                <Globe className={cn('w-5 h-5 shrink-0', mode === 'username' ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <div className="text-sm font-medium">By username</div>
                  <div className="text-xs text-muted-foreground">All of an author's plugins</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode('slug')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-left transition-colors',
                  mode === 'slug' ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                )}
              >
                <Package className={cn('w-5 h-5 shrink-0', mode === 'slug' ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <div className="text-sm font-medium">By plugin slug</div>
                  <div className="text-xs text-muted-foreground">Specific plugins</div>
                </div>
              </button>
            </div>

            {mode === 'username' ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="WordPress.org username (e.g. bplugins)"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && username.trim() && fetchPlugins()}
                  />
                  <Button
                    onClick={fetchPlugins}
                    disabled={!username.trim() || previewLoading}
                  >
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Found on the WordPress.org profile URL: wordpress.org/plugins/author/&lt;username&gt;
                </p>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Plugin slug (e.g. image-hover-effects-addon)"
                    value={slugInput}
                    onChange={e => setSlugInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && slugInput.trim() && fetchSlugPlugins()}
                  />
                  <Button
                    onClick={fetchSlugPlugins}
                    disabled={!slugInput.trim() || previewLoading}
                  >
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The slug is the last part of the plugin's URL: wordpress.org/plugins/&lt;slug&gt;.
                  You can paste several, separated by commas.
                </p>
              </>
            )}

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
                    <Button variant="outline" onClick={close}>Cancel</Button>
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
