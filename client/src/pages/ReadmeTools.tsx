import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Eye, ShieldCheck, ExternalLink, Loader2, Maximize2, Minimize2, AppWindow } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageFramer } from '../components/tools/ImageFramer';
import { useWindowManager } from '../contexts/WindowManagerContext';

type Tool = 'viewer' | 'validator' | 'framer';

const WPREADME_URL = 'https://wpreadme.com/';
const VALIDATOR_URL = 'https://wordpress.org/plugins/developers/readme-validator/';
// Same-origin reverse proxy (server strips X-Frame-Options) so the validator
// can be embedded. See server/src/controllers/ReadmeToolsController.ts.
const VALIDATOR_PROXY_URL = '/api/tools/readme-validator';

interface ToolConfig {
  src: string;
  title: string;
  /** Short name shown in the loading text, e.g. "the validator". */
  label: string;
  /** Real external URL for "Open in new tab". */
  externalUrl: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  blurb: React.ReactNode;
}

const TOOLS: Record<Tool, ToolConfig> = {
  viewer: {
    src: WPREADME_URL,
    title: 'wpreadme.com — Readme Viewer',
    label: 'wpreadme.com',
    externalUrl: WPREADME_URL,
    referrerPolicy: 'no-referrer',
    blurb: (
      <>
        Live readme preview powered by{' '}
        <a href={WPREADME_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">wpreadme.com</a>.
      </>
    ),
  },
  validator: {
    src: VALIDATOR_PROXY_URL,
    title: 'WordPress.org Readme Validator',
    label: 'the validator',
    externalUrl: VALIDATOR_URL,
    blurb: (
      <>
        The official validator from{' '}
        <a href={VALIDATOR_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">wordpress.org</a>,
        embedded via a proxy.
      </>
    ),
  },
  framer: {
    src: '',
    title: 'Image Framer',
    label: 'the image framer',
    externalUrl: '',
    blurb: 'Upload your plugin screenshots and wrap them in a beautiful macOS-style window frame.',
  },
};

export default function ReadmeTools() {
  const [tool, setTool] = useState<Tool>('viewer');
  const [fullscreen, setFullscreen] = useState(false);
  const config = TOOLS[tool];
  const { open: openWindow } = useWindowManager();

  // Esc exits fullscreen, and lock body scroll while the popup is open.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  return (
    <PageTransition className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7" /> Readme Tools
          </h2>
          <p className="text-muted-foreground mt-1">
            Preview and validate WordPress.org plugin <code className="text-xs bg-muted px-1.5 py-0.5 rounded">readme.txt</code> files.
          </p>
        </div>
        <ToolSwitcher tool={tool} setTool={setTool} />
      </div>

      {/* Inline panel */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{config.blurb}</p>
        
        {tool === 'framer' ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  openWindow({
                    id: 'image-framer',
                    title: 'Image Framer',
                    icon: <FileText className="w-4 h-4" />,
                    content: <ImageFramer />,
                    width: 1100,
                    height: 720,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <AppWindow className="w-4 h-4" /> Open in window
              </button>
            </div>
            <ImageFramer />
          </div>
        ) : (
          <div className="relative rounded-lg border overflow-hidden bg-card">
            <FrameControls externalUrl={config.externalUrl} onFullscreen={() => setFullscreen(true)} />
            <IframeWithLoader key={tool} config={config} className="h-[calc(100vh-220px)] min-h-[600px]" />
          </div>
        )}
      </div>

      {/* Fullscreen popup — portaled to <body> so it escapes the page's
          framer-motion transform and covers the entire viewport over every
          element (sidebar, dialogs, etc.). */}
      {fullscreen && tool !== 'framer' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-background">
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-card shrink-0">
              <span className="text-sm font-medium truncate">{config.title}</span>
              <div className="flex items-center gap-2">
                <ToolSwitcher tool={tool} setTool={setTool} />
                <button
                  type="button"
                  onClick={() => setFullscreen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Minimize2 className="w-4 h-4" /> Exit fullscreen
                </button>
              </div>
            </div>
            <IframeWithLoader key={`fs-${tool}`} config={config} className="flex-1" />
          </div>,
          document.body
        )}
    </PageTransition>
  );
}

function ToolSwitcher({ tool, setTool }: { tool: Tool; setTool: (t: Tool) => void }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted shrink-0">
      <TabButton active={tool === 'viewer'} onClick={() => setTool('viewer')} icon={Eye} label="Viewer" />
      <TabButton active={tool === 'validator'} onClick={() => setTool('validator')} icon={ShieldCheck} label="Validator" />
      <TabButton active={tool === 'framer'} onClick={() => setTool('framer')} icon={FileText} label="Image Framer" />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

/** Grouped floating controls (top-right of the inline frame): open-in-new-tab + fullscreen. */
function FrameControls({ externalUrl, onFullscreen }: { externalUrl: string; onFullscreen: () => void }) {
  const btn =
    'flex items-center justify-center w-8 h-8 rounded-md border bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-accent transition-colors';
  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab" aria-label="Open in new tab" className={btn}>
        <ExternalLink className="w-4 h-4" />
      </a>
      <button type="button" onClick={onFullscreen} title="Fullscreen" aria-label="Enter fullscreen" className={btn}>
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/** An iframe with the spinner/skeleton loading overlay and slow-load fallback. */
function IframeWithLoader({ config, className }: { config: ToolConfig; className: string }) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    slowTimer.current = setTimeout(() => setSlow(true), 8000);
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  const handleLoaded = () => {
    setLoaded(true);
    setSlow(false);
    if (slowTimer.current) clearTimeout(slowTimer.current);
  };

  return (
    <div className="relative flex-1 flex flex-col">
      {!loaded && <FrameLoader label={config.label} slow={slow} fallbackUrl={config.externalUrl} />}
      <iframe
        src={config.src}
        title={config.title}
        onLoad={handleLoaded}
        className={`w-full border-0 bg-white transition-opacity duration-300 ${className} ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        referrerPolicy={config.referrerPolicy}
      />
    </div>
  );
}

function FrameLoader({ label, slow, fallbackUrl }: { label: string; slow: boolean; fallbackUrl: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-card">
      {/* Faux content skeleton so the panel has shape while loading. */}
      <div className="p-6 space-y-4 opacity-60" aria-hidden>
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/5" />
      </div>

      {/* Centered spinner + status, overlaid on the skeleton. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading {label}…</p>
        {slow && (
          <div className="mt-1 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground/80 max-w-xs">This is taking longer than usual.</p>
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
            >
              Open in new tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
