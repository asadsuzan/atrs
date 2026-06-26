import { X, Minus, Maximize2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  useFramerExport,
  KIND_META,
  type DownloadJob,
  type DownloadPhase,
} from '../../contexts/FramerExportContext';
import { DockBoard } from '../../contexts/JobDockContext';

const PHASE_LABEL: Record<DownloadPhase, string> = {
  idle: '',
  processing: 'Generating…',
  packaging: 'Packaging ZIP…',
  downloading: 'Downloading…',
  done: 'Download ready',
  cancelled: 'Cancelled',
  error: 'Something went wrong',
};

/**
 * Global, route-independent job board for Image Framer downloads. Rendered once
 * at the app root so the queue keeps running and stays visible across
 * navigation. Minimizes to a compact pill, like the WP-import mini-player.
 */
export function FramerExportBoard() {
  const { jobs, phase, isMinimized, isRunning, cancel, dismiss, minimize, restore } = useFramerExport();
  if (jobs.length === 0) return null;

  const active = phase === 'processing' || phase === 'packaging' || phase === 'downloading';
  const done = jobs.filter(j => j.status === 'done').length;

  const StatusIcon = active ? (
    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
  ) : phase === 'done' ? (
    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
  ) : (
    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
  );

  // Minimized: compact pill with overall progress.
  if (isMinimized) {
    const pct = jobs.length ? Math.round((done / jobs.length) * 100) : 0;
    return (
      <DockBoard id="framer-export" order={2}>
        <button
          type="button"
          onClick={restore}
          className="ml-auto flex items-center gap-2 rounded-full border bg-card pl-3 pr-4 py-2 shadow-2xl hover:bg-accent transition-colors animate-in slide-in-from-bottom-4 fade-in"
          title="Expand download board"
        >
          {StatusIcon}
          <span className="text-sm font-medium">{PHASE_LABEL[phase]}</span>
          <span className="text-xs text-muted-foreground">{done}/{jobs.length}</span>
          {active && (
            <span className="ml-1 h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DockBoard>
    );
  }

  return (
    <DockBoard id="framer-export" order={2}>
    <div className="w-full rounded-xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          {StatusIcon}
          <span className="text-sm font-semibold truncate">{PHASE_LABEL[phase]}</span>
          <span className="text-xs text-muted-foreground shrink-0">{done}/{jobs.length}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={minimize}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={isRunning ? cancel : dismiss}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={isRunning ? 'Cancel' : 'Dismiss'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-auto divide-y">
        {jobs.map(job => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
    </DockBoard>
  );
}

function JobRow({ job }: { job: DownloadJob }) {
  const { label, Icon } = KIND_META[job.kind];
  const pct = Math.round(job.progress * 100);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
        {job.kind === 'video' ? (
          <video src={job.previewUrl} muted className="w-full h-full object-cover" />
        ) : (
          <img src={job.previewUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{label}</span>
          <span className="truncate">· {job.name}</span>
        </div>

        {job.status === 'rendering' ? (
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <div className="mt-0.5 text-xs">
            {job.status === 'pending' && <span className="text-muted-foreground">Queued</span>}
            {job.status === 'done' && <span className="text-green-600">Ready</span>}
            {job.status === 'error' && <span className="text-destructive">Failed</span>}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {job.status === 'rendering' && <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>}
        {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        {job.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
        {job.status === 'pending' && <Loader2 className="w-4 h-4 text-muted-foreground/40" />}
      </div>
    </div>
  );
}
