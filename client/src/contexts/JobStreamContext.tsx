import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { streamJob, cancelJob, type JobProgress, type JobSummary } from '../services/jobStream';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';

export type JobLogLine = {
  type: JobProgress['type'];
  message: string;
  label?: string;
  timestamp: string;
};

export interface JobRunConfig {
  /** Heading shown in the dialog / mini-player, e.g. "Deleting products". */
  title: string;
  method?: 'POST' | 'DELETE';
  /** Path relative to /api, e.g. "/products/bulk-delete-stream". */
  url: string;
  body?: any;
  /** Word for the units being processed, used in summaries (default "item"). */
  noun?: string;
  /** Called once the job completes (e.g. invalidate queries, clear selection). */
  onDone?: (summary: JobSummary) => void;
}

interface JobStreamContextValue {
  isOpen: boolean;
  isMinimized: boolean;
  isRunning: boolean;
  isCancelling: boolean;
  title: string;
  noun: string;
  logs: JobLogLine[];
  progress: { current: number; total: number } | null;
  summary: JobSummary | null;
  runJob: (config: JobRunConfig) => void;
  requestCancel: () => void;
  minimize: () => void;
  restore: () => void;
  close: () => void;
}

const JobStreamContext = createContext<JobStreamContextValue | null>(null);

export function useJobStream() {
  const ctx = useContext(JobStreamContext);
  if (!ctx) throw new Error('useJobStream must be used within JobStreamProvider');
  return ctx;
}

/**
 * Drives one streaming bulk/cascade job at a time and exposes it through a
 * minimizable live-console dialog + floating mini-player. Lives at the app root
 * so a minimized job keeps streaming across navigation.
 */
export function JobStreamProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [title, setTitle] = useState('');
  const [noun, setNoun] = useState('item');
  const [logs, setLogs] = useState<JobLogLine[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const onDoneRef = useRef<JobRunConfig['onDone']>(undefined);

  const minimize = () => { setIsMinimized(true); setIsOpen(false); };
  const restore = () => { setIsMinimized(false); setIsOpen(true); };

  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setIsOpen(false);
    setIsMinimized(false);
    setIsRunning(false);
    setIsCancelling(false);
    setLogs([]);
    setProgress(null);
    setSummary(null);
  };

  const runJob = async (config: JobRunConfig) => {
    // Reset and open the console.
    setTitle(config.title);
    setNoun(config.noun || 'item');
    setLogs([]);
    setProgress(null);
    setSummary(null);
    setIsCancelling(false);
    setIsRunning(true);
    setIsOpen(true);
    setIsMinimized(false);
    sessionIdRef.current = null;
    onDoneRef.current = config.onDone;

    const controller = new AbortController();
    abortRef.current = controller;

    const pushLog = (line: Omit<JobLogLine, 'timestamp'>) => {
      const timestamp = new Date().toLocaleTimeString([], { hour12: false });
      setLogs(prev => [...prev, { ...line, timestamp }]);
    };

    try {
      await streamJob(
        config.method || 'POST',
        config.url,
        config.body,
        {
          onSession: (id) => { sessionIdRef.current = id; },
          onProgress: (e) => {
            if (e.itemIndex && e.totalItems) setProgress({ current: e.itemIndex, total: e.totalItems });
            pushLog({ type: e.type, message: e.message, label: e.label });
          },
          onComplete: (result) => {
            setSummary(result);
            playSound(result.errors?.length ? 'error' : 'success');
            onDoneRef.current?.(result);
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
      if (err?.name !== 'AbortError') {
        playSound('error');
        pushLog({ type: 'error', message: err?.message || 'Operation failed' });
        toast.error('Operation failed');
      }
    } finally {
      setIsRunning(false);
      setIsCancelling(false);
      abortRef.current = null;
    }
  };

  // Cancel = stop processing remaining items (deletes already done are kept).
  const requestCancel = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) { abortRef.current?.abort(); return; }
    setIsCancelling(true);
    try {
      await cancelJob(sessionId);
    } catch {
      toast.error('Failed to request cancellation');
      setIsCancelling(false);
    }
  };

  const value: JobStreamContextValue = {
    isOpen, isMinimized, isRunning, isCancelling, title, noun,
    logs, progress, summary,
    runJob, requestCancel, minimize, restore, close,
  };

  return <JobStreamContext.Provider value={value}>{children}</JobStreamContext.Provider>;
}
