import { useLocation, useNavigate } from 'react-router-dom';
import { Maximize2, X, GitBranch, Loader2, ClipboardList, AlertCircle } from 'lucide-react';
import { useChangelogGen } from '../../contexts/ChangelogGenContext';
import { DockBoard } from '../../contexts/JobDockContext';

const GENERATOR_PATH = '/changelog-generator';

const STEP_LABELS: Record<string, string> = {
  git: 'Git Analysis',
  classify: 'Code Classification',
  summarize: 'AI Summarization',
  report: 'Report Generation',
  review: 'Review Queue',
};

/**
 * Floating, dockable view of a running (or just-finished) changelog generation.
 * Shows on every page except the generator itself, so the pipeline stays visible
 * while the user navigates away — matching the WP-import / image-framer flows.
 * "Open" returns to the generator page; the pipeline keeps streaming regardless.
 */
export function ChangelogGenMiniPlayer() {
  const { active, running, logs, currentStep, progress, result, error, productName, cancel, reset } = useChangelogGen();
  const navigate = useNavigate();
  const location = useLocation();

  // Nothing to show, or the full view (generator page) is already on screen.
  if (!active || location.pathname === GENERATOR_PATH) return null;

  const lastLog = logs[logs.length - 1];
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : running ? 5 : 100;
  const reviewCount = result?.stats?.reviewEntriesCreated ?? 0;

  const statusText = running
    ? progress
      ? `${STEP_LABELS[currentStep] || currentStep} · ${progress.current}/${progress.total}`
      : STEP_LABELS[currentStep] || 'Starting…'
    : error
      ? 'Failed'
      : reviewCount > 0
        ? `Done · ${reviewCount} to review`
        : 'Done';

  const barColor = error ? 'bg-red-500' : running ? 'bg-primary' : 'bg-emerald-500';

  return (
    <DockBoard id="changelog-gen" order={2}>
      <div className="w-full rounded-lg border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate flex-1">
            Changelog{productName ? ` · ${productName}` : ''}
          </span>
          <button
            type="button"
            onClick={() => navigate(GENERATOR_PATH)}
            aria-label="Open generator"
            title="Open generator"
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {!running && (
            <button
              type="button"
              onClick={reset}
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
              {running && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
              {error && <AlertCircle className="w-3 h-3 shrink-0 text-red-500" />}
              <span className="truncate">{statusText}</span>
            </span>
            {progress && running && <span className="text-muted-foreground shrink-0">{pct}%</span>}
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {lastLog && (
            <p className="text-[11px] font-mono text-muted-foreground truncate">{lastLog.message}</p>
          )}

          {running ? (
            <button
              type="button"
              onClick={cancel}
              className="w-full text-xs rounded-md border px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Stop
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(GENERATOR_PATH)}
                className="flex-1 text-xs rounded-md border px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Open
              </button>
              {reviewCount > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/review')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs rounded-md border border-primary/30 bg-primary/10 text-primary px-2 py-1.5 hover:bg-primary/20 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Review
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </DockBoard>
  );
}
