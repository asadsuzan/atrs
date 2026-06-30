import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Image as ImageIcon, Film, Video } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
// NOTE: framerExport pulls in heavy encoders (gif.js, gifuct). It's imported
// *dynamically* inside start() so those stay code-split out of the main bundle
// and only load when a download actually runs. Types are erased, so importing
// them with `import type` here costs nothing.
import type { ChromeOptions, MediaFit, MediaKind } from '../components/tools/framerExport';

/** Human-facing label + icon per media kind (shared by the panel and board). */
export const KIND_META: Record<MediaKind, { label: string; Icon: typeof ImageIcon }> = {
  image: { label: 'Image', Icon: ImageIcon },
  gif: { label: 'GIF', Icon: Film },
  video: { label: 'WebM Video', Icon: Video },
};

export type JobStatus = 'pending' | 'rendering' | 'done' | 'error';
export interface DownloadJob {
  id: string;
  name: string;
  kind: MediaKind;
  previewUrl: string;
  status: JobStatus;
  progress: number; // 0..1, meaningful while rendering
}

export type DownloadPhase =
  | 'idle'
  | 'processing'
  | 'packaging'
  | 'downloading'
  | 'done'
  | 'cancelled'
  | 'error';

export interface ExportItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
}

export interface ExportRequest {
  /** Shared chrome settings; each item's title is applied per-frame. */
  chromeBase: Omit<ChromeOptions, 'title'>;
  radius: number;
  fit: MediaFit;
  quality: 'standard' | 'high';
  separateFiles: boolean;
  items: ExportItem[];
}

interface FramerExportContextValue {
  jobs: DownloadJob[];
  phase: DownloadPhase;
  isMinimized: boolean;
  isRunning: boolean;
  start: (req: ExportRequest) => void;
  cancel: () => void;
  dismiss: () => void;
  minimize: () => void;
  restore: () => void;
}

const FramerExportContext = createContext<FramerExportContextValue | null>(null);

export function useFramerExport() {
  const ctx = useContext(FramerExportContext);
  if (!ctx) throw new Error('useFramerExport must be used within FramerExportProvider');
  return ctx;
}

/**
 * Owns the Image Framer download queue. Lives at the app root (above the router)
 * so an in-flight export keeps running — and the job board keeps showing — even
 * when the user navigates to other pages. Mirrors WpImportProvider's pattern.
 */
export function FramerExportProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);

  const updateJob = (id: string, patch: Partial<DownloadJob>) =>
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, ...patch } : j)));

  const start = async (req: ExportRequest) => {
    if (isRunning || req.items.length === 0) return;
    cancelRef.current = false;
    setIsRunning(true);
    setIsMinimized(false);
    setPhase('processing');

    // Lazy-load the encoders (gif.js/gifuct) — keeps them out of the main bundle.
    const fx = await import('../components/tools/framerExport');

    // Decode the (optional) scene background image once for the whole batch.
    let bgImage: HTMLImageElement | undefined;
    if (req.chromeBase.backgroundImageUrl) {
      try {
        bgImage = await fx.decodeImage(req.chromeBase.backgroundImageUrl);
      } catch {
        /* fall back to the CSS background */
      }
    }

    // Composite one item onto a canvas-drawn scene and re-encode, keeping its type.
    const renderOne = async (
      item: ExportItem,
      onProgress: (p: number) => void,
    ): Promise<{ name: string; blob: Blob } | null> => {
      const { chromeBase } = req;
      try {
        await document.fonts.load(`${chromeBase.fontWeight} ${chromeBase.fontSize}px ${chromeBase.fontFamily}`);
      } catch {
        /* non-fatal */
      }

      const kind = fx.getMediaKind(item.file);
      // A finer warp grid for stills; coarser for motion (re-warped every frame).
      const render = fx.renderChrome(
        { ...chromeBase, title: item.title },
        { bgImage, warpDetail: kind === 'image' ? 24 : 12 },
      );

      let blob: Blob;
      if (kind === 'gif') {
        blob = await fx.exportGif(render, item.file, req.radius, req.fit, req.quality === 'high' ? 3 : 10, onProgress);
      } else if (kind === 'video') {
        const bitrate = req.quality === 'high' ? 10_000_000 : 3_000_000;
        blob = await fx.exportVideo(render, item.previewUrl, req.radius, req.fit, bitrate, onProgress);
      } else {
        blob = await fx.exportImage(render, item.file, req.radius, req.fit);
        onProgress(1);
      }

      const base = item.file.name.replace(/\.[^/.]+$/, '');
      return { name: `framed-${base}.${fx.extForFile(item.file, kind)}`, blob };
    };

    setJobs(
      req.items.map(item => ({
        id: item.id,
        name: item.file.name,
        kind: fx.getMediaKind(item.file),
        previewUrl: item.previewUrl,
        status: 'pending' as const,
        progress: 0,
      })),
    );

    const results: { name: string; blob: Blob }[] = [];
    try {
      for (const item of req.items) {
        if (cancelRef.current) break;
        updateJob(item.id, { status: 'rendering', progress: 0 });
        try {
          const result = await renderOne(item, p => updateJob(item.id, { progress: p }));
          if (result) {
            results.push(result);
            updateJob(item.id, { status: 'done', progress: 1 });
          } else {
            updateJob(item.id, { status: 'error' });
          }
        } catch (err) {
          console.error(err);
          updateJob(item.id, { status: 'error' });
        }
      }

      if (cancelRef.current) {
        setPhase('cancelled');
        return;
      }
      if (results.length === 0) {
        setPhase('error');
        toast.error('Nothing could be generated');
        return;
      }

      if (results.length === 1 || req.separateFiles) {
        setPhase('downloading');
        results.forEach(r => saveAs(r.blob, r.name));
      } else {
        setPhase('packaging');
        const zip = new JSZip();
        results.forEach(r => zip.file(r.name, r.blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setPhase('downloading');
        saveAs(zipBlob, 'framed-media.zip');
      }
      setPhase('done');
    } catch (err) {
      console.error(err);
      setPhase('error');
      toast.error('Failed to generate download');
    } finally {
      setIsRunning(false);
    }
  };

  const cancel = () => {
    cancelRef.current = true;
  };
  const dismiss = () => {
    setJobs([]);
    setPhase('idle');
    setIsMinimized(false);
  };
  const minimize = () => setIsMinimized(true);
  const restore = () => setIsMinimized(false);

  const value: FramerExportContextValue = {
    jobs,
    phase,
    isMinimized,
    isRunning,
    start,
    cancel,
    dismiss,
    minimize,
    restore,
  };

  return <FramerExportContext.Provider value={value}>{children}</FramerExportContext.Provider>;
}
