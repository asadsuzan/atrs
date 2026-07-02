import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, MotionConfig, animate, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize, Minimize, Package, PlusCircle, Wrench, Bug, Play, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { getBranding } from '../../services/config';
import { useAuth } from '../../contexts/AuthContext';
import { extractAccentColor } from '../../lib/imageColor';

// Shared "easeOutExpo"-style curve for a calm, premium feel across the deck.
const EASE = [0.22, 1, 0.36, 1] as const;

/** Counts up to `value` on mount for a polished stat reveal (respects reduced motion). */
function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const controls = animate(mv, value, { duration: 0.9, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span>{text}</motion.span>;
}

type ActivityType = 'feature' | 'improvement' | 'bug-fix';

type Media = { url: string; isVideo: boolean };

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

/**
 * Flattens stored description HTML to clean, presentable text: strips tags and
 * decodes entities twice (imported changelogs are sometimes double-encoded,
 * e.g. `&amp;nbsp;`), then collapses whitespace.
 */
function toCleanText(input?: string): string {
  if (!input) return '';
  let out = input.replace(/<[^>]+>/g, ' ');
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Auto-import placeholder copy that adds no value on a slide — hidden. */
function isPlaceholderDesc(text: string): boolean {
  return /imported from\b.*\bchangelog\b/i.test(text) || /—\s*add details\.?$/i.test(text);
}

/** Collects an activity's media (its own + nested items'), de-duped, images first. */
function gatherMedia(act: any): Media[] {
  const raw: string[] = [];
  const push = (o: any) => {
    if (o?.mediaUrls?.length) raw.push(...o.mediaUrls);
    else if (o?.mediaUrl) raw.push(o.mediaUrl);
  };
  push(act);
  (act?.items || []).forEach(push);
  const seen = new Set<string>();
  const media = raw
    .filter((u) => u && !seen.has(u) && (seen.add(u), true))
    .map((url) => ({ url, isVideo: isVideoUrl(url) }));
  // Images first so screenshots lead; videos trail.
  return media.sort((a, b) => Number(a.isVideo) - Number(b.isVideo));
}

const TYPE_META: Record<ActivityType, { label: string; Icon: any; text: string; dot: string; accent: string; chip: string }> = {
  feature: {
    label: 'Features', Icon: PlusCircle, text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500',
    accent: 'border-l-blue-400/70 dark:border-l-blue-500/60',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  improvement: {
    label: 'Improvements', Icon: Wrench, text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500',
    accent: 'border-l-purple-400/70 dark:border-l-purple-500/60',
    chip: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
  },
  'bug-fix': {
    label: 'Bug Fixes', Icon: Bug, text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500',
    accent: 'border-l-red-400/70 dark:border-l-red-500/60',
    chip: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  },
};
const TYPES: ActivityType[] = ['feature', 'improvement', 'bug-fix'];

type Slide = { kind: 'summary' } | { kind: 'product'; data: any } | { kind: 'thanks' };

export function PresentationMode({
  report,
  periodLabel,
  onClose,
  monthMode = false,
  isFetching = false,
  canPrevMonth = false,
  canNextMonth = false,
  onPrevMonth,
  onNextMonth,
}: {
  report: any;
  periodLabel: string;
  onClose: () => void;
  monthMode?: boolean;
  isFetching?: boolean;
  canPrevMonth?: boolean;
  canNextMonth?: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState<Media | null>(null);

  // Company branding + reporter for the deck.
  const { data: branding } = useQuery({ queryKey: ['branding'], queryFn: getBranding });
  const { user } = useAuth();
  const brand = {
    name: branding?.companyName?.trim() || 'ATRS',
    logo: branding?.logoUrl?.trim() || '/favicon.svg',
    accent: branding?.accentColor?.trim() || '',
  };
  const dynamicAccent = !!branding?.accentDynamic;

  // Dynamic accent: derive a color per product from its banner (or logo).
  const [productAccents, setProductAccents] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!dynamicAccent) { setProductAccents({}); return; }
    let cancelled = false;
    const products: any[] = report?.products || [];
    (async () => {
      const pairs = await Promise.all(
        products.map(async (p) => {
          const art = p?.product?.banner || p?.product?.icon;
          const id = p?.product?._id;
          if (!id || !art) return null;
          const hex = await extractAccentColor(art);
          return hex ? ([id, hex] as const) : null;
        }),
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const pair of pairs) if (pair) map[pair[0]] = pair[1];
      setProductAccents(map);
    })();
    return () => { cancelled = true; };
  }, [dynamicAccent, report]);
  const reporter = user?.name || '';
  const reporterTitle = user?.jobTitle?.trim() || '';
  const thankYou = {
    enabled: branding?.thankYouEnabled !== false,
    title: branding?.thankYouTitle?.trim() || 'Thank you',
    message: branding?.thankYouMessage?.trim() || '',
  };

  // Jump back to the summary slide whenever the period changes (a new month's
  // report has a different product count, so the old index may be out of range).
  // Render-time adjustment (React's recommended pattern) rather than an effect.
  const [prevPeriod, setPrevPeriod] = useState(periodLabel);
  if (periodLabel !== prevPeriod) {
    setPrevPeriod(periodLabel);
    setIndex(0);
    setDirection(0);
  }

  const slides: Slide[] = [
    { kind: 'summary' },
    ...(report?.products || []).map((p: any) => ({ kind: 'product' as const, data: p })),
    ...(thankYou.enabled ? [{ kind: 'thanks' as const }] : []),
  ];
  const total = slides.length;

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1));
    },
    [total],
  );

  // Wheel-to-advance. Priority is the slide's own content: while it can still
  // scroll in the wheel direction, we let it. A slide that fits the viewport
  // advances on a single decisive scroll. A taller slide lets you read to the
  // edge, then "arms" (one absorbed tick) so a second scroll advances — you
  // never jump the instant you hit the bottom. A cooldown absorbs inertia.
  const wheelCooldownUntil = useRef(0);
  const edgeArmed = useRef(false);
  const nav = (delta: number) => {
    wheelCooldownUntil.current = Date.now() + 650;
    edgeArmed.current = false;
    go(delta);
  };
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (zoom) return;
    const delta = e.deltaY;
    if (Math.abs(delta) < 4) return;
    if (Date.now() < wheelCooldownUntil.current) return;

    const el = e.currentTarget;
    const dir = delta > 0 ? 1 : -1;
    const canAdvance = dir === 1 ? index < total - 1 : index > 0;
    if (!canAdvance) return;

    const fits = el.scrollHeight <= el.clientHeight + 1;
    if (fits) { nav(dir); return; }

    const atEdge = dir === 1
      ? el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      : el.scrollTop <= 0;
    if (!atEdge) { edgeArmed.current = false; return; } // let the slide scroll

    if (!edgeArmed.current) {
      // Just reached the edge — absorb this tick so we don't jump immediately.
      edgeArmed.current = true;
      wheelCooldownUntil.current = Date.now() + 300;
      return;
    }
    nav(dir);
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* fullscreen is best-effort; the fixed overlay covers the viewport regardless */
    }
  }, []);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While an image is zoomed, Escape just closes the lightbox and other
      // keys are inert (so navigation doesn't happen behind it).
      if (zoom) {
        if (e.key === 'Escape') { e.preventDefault(); setZoom(null); }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') { if (!document.fullscreenElement) onClose(); }
      else if (e.key.toLowerCase() === 'f') { toggleFullscreen(); }
      else if (e.key === '[') { if (monthMode && canPrevMonth) onPrevMonth?.(); }
      else if (e.key === ']') { if (monthMode && canNextMonth) onNextMonth?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose, toggleFullscreen, zoom, monthMode, canPrevMonth, canNextMonth, onPrevMonth, onNextMonth]);

  // Enter fullscreen on open (best-effort — the click that opened us is the gesture).
  useEffect(() => {
    void containerRef.current?.requestFullscreen?.().catch(() => {});
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Lock body scroll while presenting.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const slide = slides[index];
  const summary = report?.summary || {};

  // The accent in play for the current slide. In dynamic mode a product slide
  // uses its derived color; other slides (and any product still resolving) fall
  // back to the fixed accent. In fixed mode it's always the configured color.
  const activeAccent = (() => {
    if (!dynamicAccent) return brand.accent;
    if (slide?.kind === 'product') {
      const pid = slide.data?.product?._id;
      return productAccents[pid] || brand.accent;
    }
    return brand.accent;
  })();
  const activeBrand = { ...brand, accent: activeAccent };

  // Portal to <body> so the fixed overlay escapes any transformed/filtered
  // ancestor (PageTransition uses transform + blur, which would otherwise
  // become the containing block for position: fixed).
  const accentBg = activeAccent || undefined;
  const glow = activeAccent || '#146ef5';

  return createPortal(
    <MotionConfig reducedMotion="user">
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Ambient accent glow — subtle depth, SaaS-style. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(1100px 560px at 50% -12%, color-mix(in srgb, ${glow} 9%, transparent), transparent 72%)`,
          transition: 'background 0.6s ease',
        }}
      />

      {/* Progress bar — fills as you advance through the deck. */}
      <div className="h-1 shrink-0 bg-border/30 relative overflow-hidden">
        <motion.div
          className={`h-full rounded-r-full ${accentBg ? '' : 'bg-primary'}`}
          style={accentBg ? { backgroundColor: accentBg } : undefined}
          animate={{ width: `${((index + 1) / total) * 100}%` }}
          transition={{ ease: EASE, duration: 0.5 }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Brand mark */}
          <img src={brand.logo} alt="" className="h-6 w-6 rounded object-contain shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span className="font-semibold hidden sm:inline truncate max-w-[10rem]">{brand.name}</span>
          <span className="mx-1 h-5 w-px bg-border hidden sm:inline-block" />
          {monthMode ? (
            <div className="inline-flex items-center rounded-full border bg-background/70 shadow-sm h-8">
              <button
                onClick={onPrevMonth}
                disabled={!canPrevMonth}
                className="h-full pl-2.5 pr-1.5 rounded-l-full hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Previous month ([)"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-semibold tabular-nums text-center min-w-[8.5rem]">{periodLabel}</span>
              <button
                onClick={onNextMonth}
                disabled={!canNextMonth}
                className="h-full pr-2.5 pl-1.5 rounded-r-full hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Next month (])"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-sm font-semibold">{periodLabel}</span>
          )}
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-label="Loading" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums mr-1">{index + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="p-2 rounded-md hover:bg-accent transition-colors" title="Toggle fullscreen (F)" aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-accent transition-colors" title="Exit presentation (Esc)" aria-label="Exit presentation">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 48 : -48, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: direction >= 0 ? -48 : 48, filter: 'blur(6px)' }}
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-0 overflow-y-auto"
            onWheel={onWheel}
          >
            <div className="max-w-5xl mx-auto px-8 py-10 min-h-full flex flex-col">
              {slide.kind === 'summary' ? (
                <SummarySlide
                  periodLabel={periodLabel}
                  summary={summary}
                  productCount={(report?.products || []).length}
                  brand={activeBrand}
                  reporter={reporter}
                  reporterTitle={reporterTitle}
                />
              ) : slide.kind === 'thanks' ? (
                <ThankYouSlide thankYou={thankYou} brand={activeBrand} reporter={reporter} reporterTitle={reporterTitle} />
              ) : (
                <ProductSlide pData={slide.data} onZoom={setZoom} accent={activeAccent} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-6 py-3 border-t bg-card/60 backdrop-blur-sm shrink-0">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] px-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'}`}
            />
          ))}
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Click-to-zoom lightbox */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setZoom(null)}
          >
            {zoom.isVideo ? (
              <video
                src={zoom.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img src={zoom.url} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
            )}
            <button
              onClick={() => setZoom(null)}
              className="absolute top-4 right-4 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>,
    document.body,
  );
}

function StatBlock({ Icon, value, label, color, index }: { Icon: any; value: number; label: string; color: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.12 + index * 0.08 }}
      whileHover={{ y: -3 }}
      className="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border bg-card/70 backdrop-blur-sm p-8 shadow-sm hover:shadow-md transition-shadow"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted/60">
        <Icon className={`w-6 h-6 ${color}`} />
      </span>
      <div className="text-5xl font-bold tabular-nums"><AnimatedNumber value={value ?? 0} /></div>
      <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function SummarySlide({
  periodLabel, summary, productCount, brand, reporter, reporterTitle,
}: {
  periodLabel: string; summary: any; productCount: number;
  brand: { name: string; logo: string; accent: string }; reporter: string; reporterTitle: string;
}) {
  const accentStyle = brand.accent ? { color: brand.accent } : undefined;
  return (
    <div className="flex-1 flex flex-col justify-center">
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <motion.img
          src={brand.logo}
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="h-16 w-16 mx-auto rounded-2xl object-contain mb-5"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <p className={`text-sm uppercase tracking-[0.2em] font-semibold ${brand.accent ? '' : 'text-primary'}`} style={accentStyle}>
          {brand.name} · Monthly Report
        </p>
        <h1 className="text-5xl font-bold tracking-tight mt-2">{periodLabel}</h1>
        <p className="text-muted-foreground mt-3">
          {productCount} {productCount === 1 ? 'product' : 'products'} updated this period
        </p>
      </motion.div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBlock index={0} Icon={Package} value={summary.products} label="Products Updated" color="text-muted-foreground" />
        <StatBlock index={1} Icon={PlusCircle} value={summary.features} label="Features Delivered" color="text-blue-500" />
        <StatBlock index={2} Icon={Wrench} value={summary.improvements} label="Improvements Made" color="text-purple-500" />
        <StatBlock index={3} Icon={Bug} value={summary.bugFixes} label="Bug Fixes Resolved" color="text-red-500" />
      </div>
      {reporter && (
        <motion.div
          className="text-center mt-10 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
        >
          Prepared by <span className="text-foreground font-medium">{reporter}</span>
          {reporterTitle && <span className="block text-xs mt-0.5">{reporterTitle}</span>}
        </motion.div>
      )}
    </div>
  );
}

function ThankYouSlide({
  thankYou, brand, reporter, reporterTitle,
}: {
  thankYou: { enabled: boolean; title: string; message: string };
  brand: { name: string; logo: string; accent: string };
  reporter: string; reporterTitle: string;
}) {
  const accentStyle = brand.accent ? { color: brand.accent } : undefined;
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <motion.img
        src={brand.logo}
        alt=""
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="h-16 w-16 rounded-2xl object-contain mb-6"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className={`text-6xl font-bold tracking-tight ${brand.accent ? '' : 'text-primary'}`}
        style={accentStyle}
      >
        {thankYou.title}
      </motion.h1>
      {thankYou.message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.22 }}
          className="text-xl text-muted-foreground mt-4 max-w-2xl"
        >
          {thankYou.message}
        </motion.p>
      )}
      {reporter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.36 }}
          className="mt-10 text-sm text-muted-foreground"
        >
          <span className="text-foreground font-medium">{reporter}</span>
          {reporterTitle && <span> · {reporterTitle}</span>}
          <span className="block text-xs mt-1">{brand.name}</span>
        </motion.div>
      )}
    </div>
  );
}

/** A tidy row of media thumbnails for an activity; click to zoom. */
function ActivityMedia({ media, onZoom }: { media: Media[]; onZoom: (m: Media) => void }) {
  if (media.length === 0) return null;
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;
  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {shown.map((m, i) => (
        <button
          key={m.url + i}
          onClick={() => onZoom(m)}
          className="group relative h-24 w-36 rounded-lg overflow-hidden border bg-muted shrink-0 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Enlarge media"
        >
          {m.isVideo ? (
            <>
              <video src={m.url} muted preload="metadata" className="w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-7 h-7 text-white drop-shadow" fill="currentColor" />
              </span>
            </>
          ) : (
            <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          )}
          {i === shown.length - 1 && extra > 0 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-lg font-semibold">
              +{extra}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function CountChip({ dot, children }: { dot: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${dot}`} /> {children}
    </span>
  );
}

function ActivityCard({ act, meta, onZoom, index }: { act: any; meta: typeof TYPE_META[ActivityType]; onZoom: (m: Media) => void; index: number }) {
  const desc = toCleanText(act.shortDescription);
  const showDesc = desc && !isPlaceholderDesc(desc);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(index, 10) * 0.05 }}
      whileHover={{ y: -2 }}
      className={`rounded-xl border border-l-4 ${meta.accent} bg-card/60 p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-[15px] leading-snug">{act.title}</h4>
        {act.versionId?.label && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${meta.chip}`}>
            {act.versionId.label}
          </span>
        )}
      </div>
      {showDesc && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">{desc}</p>
      )}
      <ActivityMedia media={gatherMedia(act)} onZoom={onZoom} />
    </motion.div>
  );
}

function ProductSlide({ pData, onZoom, accent }: { pData: any; onZoom: (m: Media) => void; accent?: string }) {
  const { product, activities, counts } = pData;
  return (
    <>
      {/* Product header */}
      <motion.div
        className="flex items-start gap-4 pb-5 mb-7 border-b"
        style={accent ? { borderBottomColor: `color-mix(in srgb, ${accent} 45%, transparent)` } : undefined}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        {product.icon
          ? <img src={product.icon} alt="" className="w-14 h-14 rounded-xl bg-muted object-cover border shrink-0" />
          : <div
              className="w-14 h-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl font-bold shrink-0"
              style={accent
                ? { backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }
                : undefined}
            >{product.name?.[0]?.toUpperCase() || '?'}</div>}
        <div className="min-w-0">
          {accent && <div className="h-1 w-10 rounded-full mb-2" style={{ backgroundColor: accent }} />}
          <h2 className="text-[26px] font-bold tracking-tight leading-tight line-clamp-2">{product.name}</h2>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{product.category}</Badge>
            <CountChip dot={TYPE_META.feature.dot}>{counts.features} features</CountChip>
            <CountChip dot={TYPE_META.improvement.dot}>{counts.improvements} improvements</CountChip>
            <CountChip dot={TYPE_META['bug-fix'].dot}>{counts.bugFixes} fixes</CountChip>
          </div>
        </div>
      </motion.div>

      {/* Grouped activities as a calm card grid */}
      <div className="space-y-8 flex-1">
        {TYPES.map((type) => {
          const items = (activities || []).filter((a: any) => a.type === type);
          if (items.length === 0) return null;
          const meta = TYPE_META[type];
          return (
            <div key={type}>
              <h3 className={`flex items-center gap-2 font-semibold text-base uppercase tracking-wide ${meta.text}`}>
                <meta.Icon className="w-4 h-4" /> {meta.label}
                <span className="text-sm font-normal normal-case text-muted-foreground">· {items.length}</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 mt-4">
                {items.map((act: any, i: number) => (
                  <ActivityCard key={act._id} act={act} meta={meta} onZoom={onZoom} index={i} />
                ))}
              </div>
            </div>
          );
        })}
        {(activities || []).length === 0 && (
          <p className="text-muted-foreground">No activities for this product in this period.</p>
        )}
      </div>
    </>
  );
}
