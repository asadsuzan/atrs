import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  wpOrgPreview,
  wpOrgPreviewBySlug,
  importFromWpOrgStream,
  cancelImportSession,
  type ImportProgress,
  type ImportSummary,
} from '../services/products';
import { toast } from 'sonner';
import { playSound } from '@/lib/sound';

export interface WpPlugin {
  slug: string;
  name: string;
  shortDescription: string;
  icon: string;
  category: 'plugin' | 'block';
  alreadyImported: boolean;
}

export type LogLine = {
  type: ImportProgress['type'];
  message: string;
  slug?: string;
  timestamp: string;
};

export type ImportMode = 'username' | 'slug';

interface WpImportContextValue {
  // Window state
  isOpen: boolean;
  isMinimized: boolean;
  open: () => void;
  close: () => void;
  minimize: () => void;
  restore: () => void;

  // Which lookup method the selection step is using.
  mode: ImportMode;
  setMode: (m: ImportMode) => void;

  // Selection phase (username method)
  username: string;
  setUsername: (v: string) => void;
  plugins: WpPlugin[];
  selected: Set<string>;
  fetched: boolean;
  previewLoading: boolean;
  fetchPlugins: () => void;
  toggle: (slug: string) => void;
  toggleAll: () => void;

  // Selection phase (slug method) — mirrors the username flow: fetch a preview
  // (with "will update" badges) first, then import the selected plugins.
  slugInput: string;
  setSlugInput: (v: string) => void;
  fetchSlugPlugins: () => void;

  // Import phase
  isImporting: boolean;
  isCancelling: boolean;
  logs: LogLine[];
  progress: { current: number; total: number } | null;
  summary: ImportSummary | null;
  startImport: () => void;
  requestCancel: () => void;

  /**
   * Onboarding shortcut: kick off an import directly (skipping the manual
   * select-plugins step) and surface the live console. Pass an author
   * `username` to import a whole catalogue, or just `slugs` to import specific
   * plugins by slug.
   */
  quickImport: (opts: { username?: string; slugs: string[] }) => Promise<void>;
}

const WpImportContext = createContext<WpImportContextValue | null>(null);

export function useWpImport() {
  const ctx = useContext(WpImportContext);
  if (!ctx) throw new Error('useWpImport must be used within WpImportProvider');
  return ctx;
}

/**
 * Holds all WordPress.org import state and drives the SSE stream. It lives at
 * the app root (above the router) so an in-flight import survives navigation —
 * which is what makes the minimized "picture-in-picture" view work: the user
 * can collapse the dialog, roam to other pages, and the import keeps streaming
 * into the floating mini-player.
 */
export function WpImportProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [mode, setModeRaw] = useState<ImportMode>('username');
  const [username, setUsernameRaw] = useState('');
  const [plugins, setPlugins] = useState<WpPlugin[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetched, setFetched] = useState(false);
  const [slugInput, setSlugInputRaw] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: () => wpOrgPreview(username.trim()),
    onSuccess: (data: WpPlugin[]) => {
      setPlugins(data);
      // Pre-select all (new and existing) — existing ones get updated.
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

  const slugPreviewMutation = useMutation({
    mutationFn: () => {
      const slugs = slugInput.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      return wpOrgPreviewBySlug(slugs);
    },
    onSuccess: (data: WpPlugin[]) => {
      setPlugins(data);
      setSelected(new Set(data.map(p => p.slug)));
      setFetched(true);
      if (data.length === 0) toast.info('No matching plugins found for those slugs.');
      else playSound('success');
    },
    onError: () => {
      playSound('error');
      toast.error('Failed to fetch plugins from WordPress.org');
    },
  });

  // Editing the username invalidates a previous fetch.
  const setUsername = (v: string) => {
    setUsernameRaw(v);
    setFetched(false);
    setPlugins([]);
  };

  // Editing the slug list invalidates a previous fetch.
  const setSlugInput = (v: string) => {
    setSlugInputRaw(v);
    setFetched(false);
    setPlugins([]);
  };

  // Switching the lookup method clears any preview from the other method.
  const setMode = (m: ImportMode) => {
    setModeRaw(m);
    setFetched(false);
    setPlugins([]);
    setSelected(new Set());
  };

  const open = () => { setIsOpen(true); setIsMinimized(false); };
  const minimize = () => { setIsMinimized(true); setIsOpen(false); };
  const restore = () => { setIsMinimized(false); setIsOpen(true); };

  const resetAll = () => {
    setMode('username');
    setUsernameRaw('');
    setPlugins([]);
    setSelected(new Set());
    setFetched(false);
    setSlugInput('');
    setIsImporting(false);
    setIsCancelling(false);
    setLogs([]);
    setProgress(null);
    setSummary(null);
    sessionIdRef.current = null;
  };

  // Full dismiss: aborts any in-flight import (server rolls back on disconnect)
  // and clears everything.
  const close = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsOpen(false);
    setIsMinimized(false);
    resetAll();
  };

  const toggleAll = () => {
    if (plugins.every(p => selected.has(p.slug))) setSelected(new Set());
    else setSelected(new Set(plugins.map(p => p.slug)));
  };

  const toggle = (slug: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const runImport = async (uname: string, slugList: string[]) => {
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
        uname.trim(),
        slugList,
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
      // AbortError fires when the user fully closes the import mid-stream — ignore it.
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

  // Import the selected plugins from the preview list. The username is only
  // passed through in author mode; in slug mode the selected slugs are resolved
  // directly (no author lookup).
  const startImport = () => runImport(mode === 'username' ? username : '', Array.from(selected));

  const quickImport = async ({ username: uname = '', slugs }: { username?: string; slugs: string[] }) => {
    if (slugs.length === 0) return;
    // Surface the live console while it streams (same window as the manual flow).
    setIsOpen(true);
    setIsMinimized(false);
    setUsernameRaw(uname);
    await runImport(uname, slugs);
  };

  // Graceful cancel: signal the server to stop and roll back, but keep the
  // stream open so rollback progress streams into the console / mini-player.
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

  const value: WpImportContextValue = {
    isOpen, isMinimized, open, close, minimize, restore,
    mode, setMode,
    username, setUsername, plugins, selected, fetched,
    previewLoading: previewMutation.isPending || slugPreviewMutation.isPending,
    fetchPlugins: () => previewMutation.mutate(),
    toggle, toggleAll,
    slugInput, setSlugInput,
    fetchSlugPlugins: () => slugPreviewMutation.mutate(),
    isImporting, isCancelling, logs, progress, summary,
    startImport, requestCancel, quickImport,
  };

  return <WpImportContext.Provider value={value}>{children}</WpImportContext.Provider>;
}
