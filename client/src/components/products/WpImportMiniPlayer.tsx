import { Maximize2, X, Terminal, Loader2 } from 'lucide-react';
import { useWpImport } from '../../contexts/WpImportContext';
import { DockBoard } from '../../contexts/JobDockContext';

/**
 * Floating "picture-in-picture" view of an in-flight WP.org import. Rendered at
 * the app root, so it stays pinned to the bottom-right corner on every page
 * while an import the user minimized keeps streaming.
 */
export function WpImportMiniPlayer() {
  const {
    isMinimized, restore, close,
    isImporting, isCancelling, progress, summary, logs, requestCancel,
  } = useWpImport();

  if (!isMinimized) return null;

  const lastLog = logs[logs.length - 1];
  const pct = isCancelling
    ? 100
    : progress
      ? Math.round((progress.current / progress.total) * 100)
      : isImporting ? 5 : 100;

  const statusText = isImporting
    ? isCancelling
      ? 'Cancelling — rolling back…'
      : progress
        ? `Plugin ${progress.current} of ${progress.total}`
        : 'Starting…'
    : summary?.cancelled
      ? `Cancelled · ${summary.rolledBack ?? 0} rolled back`
      : summary
        ? `Done · ${summary.created} created · ${summary.updated} updated`
        : 'Finished';

  const barColor = isCancelling || summary?.cancelled || summary?.errors.length
    ? 'bg-amber-500'
    : 'bg-primary';

  return (
    <DockBoard id="wp-import" order={0}>
    <div className="w-full rounded-lg border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1">WordPress.org import</span>
        <button
          type="button"
          onClick={restore}
          aria-label="Restore"
          title="Expand"
          className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {!isImporting && (
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            title="Close"
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5 truncate">
            {isImporting && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
            <span className="truncate">{statusText}</span>
          </span>
          {progress && !isCancelling && <span className="text-muted-foreground shrink-0">{pct}%</span>}
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor} ${isCancelling ? 'animate-pulse' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {lastLog && (
          <p className="text-[11px] font-mono text-muted-foreground truncate">
            {lastLog.slug && <span className="text-sky-500">[{lastLog.slug}] </span>}
            {lastLog.message}
          </p>
        )}

        {isImporting && (
          <button
            type="button"
            onClick={requestCancel}
            disabled={isCancelling}
            className="w-full text-xs rounded-md border px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling…' : 'Cancel & roll back'}
          </button>
        )}
      </div>
    </div>
    </DockBoard>
  );
}
