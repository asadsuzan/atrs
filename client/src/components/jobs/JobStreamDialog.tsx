import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, Minus } from 'lucide-react';
import { useJobStream, type JobLogLine } from '../../contexts/JobStreamContext';

const LOG_STYLES: Record<JobLogLine['type'], { color: string; icon: string }> = {
  info: { color: 'text-slate-400', icon: 'ℹ' },
  success: { color: 'text-emerald-400', icon: '✓' },
  warn: { color: 'text-amber-400', icon: '⚠' },
  error: { color: 'text-red-400', icon: '✗' },
};

export function JobStreamDialog() {
  const {
    isOpen, isRunning, isCancelling, title, logs, progress, summary,
    requestCancel, minimize, restore, close,
  } = useJobStream();

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs, isOpen]);

  const done = (summary?.deleted ?? summary?.productsDeleted ?? 0) as number;
  const errorCount = summary?.errors?.length ?? 0;

  // Closing the window keeps a running job alive by minimizing it.
  const handleOpenChange = (next: boolean) => {
    if (next) { restore(); return; }
    if (isRunning) minimize();
    else close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
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

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isRunning
                ? isCancelling
                  ? 'Stopping…'
                  : progress
                    ? `Processing ${progress.current} of ${progress.total}…`
                    : 'Starting…'
                : summary?.cancelled
                  ? 'Stopped'
                  : 'Finished'}
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
                isCancelling || summary?.cancelled || errorCount ? 'bg-amber-500' : 'bg-primary'
              } ${isCancelling ? 'animate-pulse' : ''}`}
              style={{
                width: isCancelling
                  ? '100%'
                  : progress
                    ? `${(progress.current / progress.total) * 100}%`
                    : isRunning ? '5%' : '100%',
              }}
            />
          </div>
        </div>

        {/* Live console */}
        <div className="flex-1 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-relaxed min-h-[12rem]">
          {logs.map((line, i) => {
            const style = LOG_STYLES[line.type];
            return (
              <div key={i} className="flex gap-2 whitespace-pre-wrap break-words">
                <span className="flex-shrink-0 text-slate-600">{line.timestamp}</span>
                <span className={`flex-shrink-0 ${style.color}`}>{style.icon}</span>
                <span className={style.color}>{line.message}</span>
              </div>
            );
          })}
          {isRunning && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" /> {isCancelling ? 'stopping…' : 'working…'}
            </div>
          )}
          <div ref={logEndRef} />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          {summary ? (
            <p className="text-xs text-muted-foreground">
              {summary.cancelled ? 'Stopped · ' : ''}{done} done · {errorCount} error(s)
            </p>
          ) : <span />}
          {isRunning ? (
            <Button variant="outline" onClick={requestCancel} disabled={isCancelling}>
              {isCancelling ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Stopping…</>
              ) : 'Stop'}
            </Button>
          ) : (
            <Button onClick={close}>Close</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
