import { Maximize2, X, Terminal, Loader2 } from 'lucide-react';
import { useJobStream } from '../../contexts/JobStreamContext';

/**
 * Floating picture-in-picture view of a running bulk/cascade job. Pinned to the
 * bottom-right on every page while the job (minimized by the user) keeps
 * streaming. Sits slightly higher than the WP-import mini-player so the two
 * never overlap if both are ever active.
 */
export function JobStreamMiniPlayer() {
  const {
    isMinimized, isRunning, isCancelling, title, progress, summary, logs,
    restore, close, requestCancel,
  } = useJobStream();

  if (!isMinimized) return null;

  const lastLog = logs[logs.length - 1];
  const pct = isCancelling
    ? 100
    : progress
      ? Math.round((progress.current / progress.total) * 100)
      : isRunning ? 5 : 100;

  const done = (summary?.deleted ?? summary?.productsDeleted ?? 0) as number;
  const errorCount = summary?.errors?.length ?? 0;

  const statusText = isRunning
    ? isCancelling
      ? 'Stopping…'
      : progress
        ? `${progress.current} of ${progress.total}`
        : 'Starting…'
    : summary?.cancelled
      ? `Stopped · ${done} done`
      : `Done · ${done} processed`;

  const barColor = isCancelling || summary?.cancelled || errorCount ? 'bg-amber-500' : 'bg-primary';

  return (
    <div className="fixed bottom-[6.5rem] right-4 z-[60] w-80 rounded-lg border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{title}</span>
        <button
          type="button"
          onClick={restore}
          aria-label="Restore"
          title="Expand"
          className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {!isRunning && (
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
            {isRunning && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
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
          <p className="text-[11px] font-mono text-muted-foreground truncate">{lastLog.message}</p>
        )}

        {isRunning && (
          <button
            type="button"
            onClick={requestCancel}
            disabled={isCancelling}
            className="w-full text-xs rounded-md border px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Stopping…' : 'Stop'}
          </button>
        )}
      </div>
    </div>
  );
}
