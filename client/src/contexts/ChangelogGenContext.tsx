import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';
import {
  generateChangelog,
  type GenerateInput,
  type ProgressEvent,
  type GenerationResult,
} from '../services/changelogGen';
import { cancelJob } from '../services/jobStream';

interface StartMeta {
  /** Product name shown in the mini-player while generating. */
  productName: string;
}

interface ChangelogGenContextValue {
  /** True once a run has started and hasn't been reset — drives the mini-player. */
  active: boolean;
  running: boolean;
  logs: ProgressEvent[];
  currentStep: string;
  progress: { current: number; total: number } | null;
  result: GenerationResult | null;
  error: string | null;
  productName: string;
  start: (input: GenerateInput, meta: StartMeta) => void;
  cancel: () => void;
  reset: () => void;
}

const ChangelogGenContext = createContext<ChangelogGenContextValue | null>(null);

export function useChangelogGen() {
  const ctx = useContext(ChangelogGenContext);
  if (!ctx) throw new Error('useChangelogGen must be used within ChangelogGenProvider');
  return ctx;
}

/**
 * Drives the Git Changelog Generator's streaming pipeline from the app root, so
 * generation keeps running (and stays visible via a docked mini-player) when the
 * user navigates away from the generator page — mirroring the WP-import and
 * image-framer job flows.
 */
export function ChangelogGenProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<ProgressEvent[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productName, setProductName] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const start = (input: GenerateInput, meta: StartMeta) => {
    // Reset for a fresh run.
    setActive(true);
    setRunning(true);
    setResult(null);
    setError(null);
    setLogs([]);
    setCurrentStep('');
    setProgress(null);
    setProductName(meta.productName);
    sessionIdRef.current = null;

    const abort = new AbortController();
    abortRef.current = abort;

    generateChangelog(
      input,
      {
        onSession: (id) => { sessionIdRef.current = id; },
        onProgress: (evt) => {
          setLogs((prev) => [...prev, evt]);
          setCurrentStep(evt.step);
          if (evt.itemIndex && evt.totalItems) {
            setProgress({ current: evt.itemIndex, total: evt.totalItems });
          }
        },
        onComplete: (res) => {
          setResult(res as GenerationResult);
          setRunning(false);
          sessionIdRef.current = null;
          playSound('success');
          const n = res?.stats?.reviewEntriesCreated ?? 0;
          if (n > 0) {
            toast.success(`Changelog generated — ${n} draft ${n === 1 ? 'entry' : 'entries'} sent to the review queue`, {
              description: 'Approve them in the Review queue to add them to the changelog.',
              duration: 8000,
            });
          } else {
            toast.success('Changelog generated!');
          }
        },
        onError: (msg) => {
          setError(msg);
          setRunning(false);
          sessionIdRef.current = null;
          playSound('error');
          toast.error(msg);
        },
      },
      abort.signal,
    ).catch((err) => {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Generation failed');
        setRunning(false);
        playSound('error');
      }
    });
  };

  const cancel = () => {
    const sessionId = sessionIdRef.current;
    if (sessionId) cancelJob(sessionId).catch(() => {});
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setRunning(false);
    toast.info('Generation cancelled');
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setActive(false);
    setRunning(false);
    setLogs([]);
    setCurrentStep('');
    setProgress(null);
    setResult(null);
    setError(null);
    setProductName('');
  };

  const value: ChangelogGenContextValue = {
    active, running, logs, currentStep, progress, result, error, productName,
    start, cancel, reset,
  };

  return <ChangelogGenContext.Provider value={value}>{children}</ChangelogGenContext.Provider>;
}
