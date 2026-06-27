import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Download,
  Trash2,
  Type,
  Frame as FrameIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Ruler,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getMediaKind,
  makePreviewUrl,
  frameLayout,
  FRAME_STYLES,
  type MediaFit,
  type MediaKind,
  type FrameStyle,
} from './framerExport';
import { useFramerExport, KIND_META } from '../../contexts/FramerExportContext';

interface FramedImage {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
}

/** Curated font stacks that render reliably with html2canvas (system / web-safe). */
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Segoe UI (default)', value: '"Segoe UI", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier (mono)', value: '"Courier New", Courier, monospace' },
];

const WEIGHT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extrabold', value: '800' },
];

type Align = 'left' | 'center' | 'right';

/** Output presets. Default matches the WordPress.org plugin screenshot standard (4:3, 1280×960). */
const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: 'WordPress Standard', w: 1280, h: 960 },
  { label: 'Classic 4:3', w: 1200, h: 900 },
  { label: 'Wide 16:9', w: 1920, h: 1080 },
  { label: 'Square 1:1', w: 1080, h: 1080 },
];

/** A labelled control row used throughout the settings panel. */
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Small section heading with an icon inside the settings panel. */
function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </div>
  );
}

/** A native color input paired with a text field for the hex value. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 p-1 h-9 shrink-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 font-mono text-xs" />
      </div>
    </Field>
  );
}

export function ImageFramer() {
  const [images, setImages] = useState<FramedImage[]>([]);
  const [frameTitle, setFrameTitle] = useState('Add New Video');

  // Title typography
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState('18');
  const [fontWeight, setFontWeight] = useState('700');
  const [letterSpacing, setLetterSpacing] = useState('0.5');
  const [textAlign, setTextAlign] = useState<Align>('center');
  const [titleColor, setTitleColor] = useState('#000000');

  // Frame
  const [padding, setPadding] = useState('40');
  const [outerBackground, setOuterBackground] = useState('linear-gradient(to right, #fdfbfb, #ebedee)');
  const [windowBackground, setWindowBackground] = useState('#ffffff');
  const [imageRadius, setImageRadius] = useState('12');
  const [mediaFit, setMediaFit] = useState<MediaFit>('contain');
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('macos');

  // Output size — every downloaded image is rendered to exactly these pixels.
  const [outputWidth, setOutputWidth] = useState('1280');
  const [outputHeight, setOutputHeight] = useState('960');

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The export queue + job board live in a global context so a running download
  // survives route changes and can be minimized (see FramerExportProvider).
  const { start: startExport, isRunning } = useFramerExport();

  // Download settings (Canva-style panel).
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');
  const [separateFiles, setSeparateFiles] = useState(false);

  // Measure the preview column so fixed-size (W×H) frames can be scaled to fit on screen.
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setPreviewWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(1, Number(outputWidth) || 1280);
  const H = Math.max(1, Number(outputHeight) || 960);
  const previewScale = previewWidth ? Math.min(1, previewWidth / W) : 1;
  const currentPreset = SIZE_PRESETS.find(p => p.w === W && p.h === H)?.label ?? 'Custom';

  const addFiles = async (files: FileList | File[]) => {
    const mediaFiles = Array.from(files).filter(
      f => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    if (mediaFiles.length === 0) return;
    // Build downscaled previews one at a time so a big batch of large photos
    // doesn't decode them all at full resolution simultaneously (OOM/crash).
    for (const file of mediaFiles) {
      const previewUrl = await makePreviewUrl(file);
      setImages(prev => [
        ...prev,
        { id: crypto.randomUUID(), file, previewUrl, title: frameTitle },
      ]);
    }
  };

  const updateTitle = (id: string, title: string) => {
    setImages(prev => prev.map(img => (img.id === id ? { ...img, title } : img)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const target = prev.find(img => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  // Hand the whole batch to the global export queue (which renders, encodes,
  // packages and downloads in the background and shows the job board).
  const runDownload = () => {
    if (images.length === 0) return;
    setDownloadOpen(false);
    startExport({
      chromeBase: {
        width: W,
        height: H,
        padding: Number(padding) || 0,
        style: frameStyle,
        outerBackground,
        windowBackground,
        titleColor,
        fontFamily,
        fontSize: Number(fontSize) || 16,
        fontWeight: Number(fontWeight) || 400,
        letterSpacing: Number(letterSpacing) || 0,
        textAlign,
      },
      radius: Number(imageRadius) || 0,
      fit: mediaFit,
      quality,
      separateFiles,
      items: images.map(img => ({
        id: img.id,
        file: img.file,
        previewUrl: img.previewUrl,
        title: img.title,
      })),
    });
  };

  // Counts per media kind, for the download settings summary.
  const kindCounts = images.reduce((acc, img) => {
    const k = getMediaKind(img.file);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<MediaKind, number>);

  const mediaFitClass = mediaFit === 'cover'
    ? 'w-full h-full object-cover block'
    : 'max-w-full max-h-full object-contain block';

  const titleStyle: React.CSSProperties = {
    color: titleColor,
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight: Number(fontWeight),
    letterSpacing: `${letterSpacing}px`,
    textAlign,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
      {/* ── Settings panel ───────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-5 bg-card rounded-lg border p-5">
        {/* Upload */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
        <Button onClick={() => fileInputRef.current?.click()} className="w-full">
          <UploadCloud className="w-4 h-4 mr-2" />
          Upload Media
        </Button>

        {/* Title */}
        <div className="space-y-3 pt-1">
          <SectionHeader icon={Type} title="Title" />
          <Field label="Default Title (applied to new uploads)" htmlFor="frame-title">
            <Input id="frame-title" value={frameTitle} onChange={(e) => setFrameTitle(e.target.value)} placeholder="e.g. Add New Video" />
            <p className="text-[11px] text-muted-foreground/80">Each image keeps its own title — edit it under the preview.</p>
          </Field>

          <Field label="Font Family">
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f.label} value={f.value}>
                    <span style={{ fontFamily: f.value }}>{f.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Font Size (px)" htmlFor="font-size">
              <Input id="font-size" type="number" min={8} value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
            </Field>
            <Field label="Weight">
              <Select value={fontWeight} onValueChange={setFontWeight}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEIGHT_OPTIONS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Letter Spacing (px)" htmlFor="letter-spacing">
              <Input id="letter-spacing" type="number" step="0.5" value={letterSpacing} onChange={(e) => setLetterSpacing(e.target.value)} />
            </Field>
            <Field label="Alignment">
              <div className="inline-flex items-center gap-1 p-1 rounded-md bg-muted h-9">
                {([
                  { v: 'left', icon: AlignLeft },
                  { v: 'center', icon: AlignCenter },
                  { v: 'right', icon: AlignRight },
                ] as const).map(({ v, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTextAlign(v)}
                    title={v}
                    className={`flex-1 flex items-center justify-center h-full rounded transition-colors ${
                      textAlign === v ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <ColorField label="Title Color" value={titleColor} onChange={setTitleColor} />
        </div>

        {/* Frame */}
        <div className="space-y-3 pt-3 border-t">
          <SectionHeader icon={FrameIcon} title="Frame" />
          <Field label="Frame Style">
            <Select value={frameStyle} onValueChange={(v) => setFrameStyle(v as FrameStyle)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FRAME_STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Padding (px)" htmlFor="padding">
              <Input id="padding" type="number" value={padding} onChange={(e) => setPadding(e.target.value)} />
            </Field>
            <Field label="Image Radius (px)" htmlFor="image-radius">
              <Input id="image-radius" type="number" value={imageRadius} onChange={(e) => setImageRadius(e.target.value)} />
            </Field>
          </div>

          <Field label="Media Fit">
            <div className="inline-flex items-center gap-1 p-1 rounded-md bg-muted h-9 w-full">
              {([
                { v: 'contain', label: 'Contain' },
                { v: 'cover', label: 'Cover' },
              ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMediaFit(v)}
                  className={`flex-1 flex items-center justify-center h-full rounded text-xs font-medium transition-colors ${
                    mediaFit === v ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Contain shows the whole media (letterboxed); Cover fills the window and crops overflow.
            </p>
          </Field>

          <Field label="Outer Background (CSS)" htmlFor="outer-bg">
            <Input id="outer-bg" value={outerBackground} onChange={(e) => setOuterBackground(e.target.value)} placeholder="#f3f4f6 or linear-gradient(...)" className="font-mono text-xs" />
          </Field>

          <ColorField label="Window Background" value={windowBackground} onChange={setWindowBackground} />
        </div>

        {/* Output size */}
        <div className="space-y-3 pt-3 border-t">
          <SectionHeader icon={Ruler} title="Output Size" />
          <Field label="Preset">
            <Select
              value={currentPreset}
              onValueChange={(label) => {
                const p = SIZE_PRESETS.find(x => x.label === label);
                if (p) { setOutputWidth(String(p.w)); setOutputHeight(String(p.h)); }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZE_PRESETS.map(p => (
                  <SelectItem key={p.label} value={p.label}>{p.label} ({p.w}×{p.h})</SelectItem>
                ))}
                {currentPreset === 'Custom' && (
                  <SelectItem value="Custom" disabled>Custom ({W}×{H})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width (px)" htmlFor="output-width">
              <Input id="output-width" type="number" min={1} value={outputWidth} onChange={(e) => setOutputWidth(e.target.value)} />
            </Field>
            <Field label="Height (px)" htmlFor="output-height">
              <Input id="output-height" type="number" min={1} value={outputHeight} onChange={(e) => setOutputHeight(e.target.value)} />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            All downloads are exported at exactly {W}×{H}px. Screenshots are fitted inside the frame.
          </p>
        </div>
      </aside>

      {/* ── Preview area ─────────────────────────────────────────────── */}
      <div ref={previewRef} className="space-y-4 min-w-0">
        {images.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3 bg-card rounded-lg border px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {images.length} item{images.length !== 1 ? 's' : ''} uploaded
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={isRunning}>
                  <Trash2 className="w-4 h-4 mr-2" /> Clear all
                </Button>
                <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
                  <PopoverTrigger asChild>
                    <Button disabled={isRunning}>
                      {isRunning ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" /> Download</>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <DownloadPanel
                      width={W}
                      height={H}
                      count={images.length}
                      kindCounts={kindCounts}
                      quality={quality}
                      setQuality={setQuality}
                      separateFiles={separateFiles}
                      setSeparateFiles={setSeparateFiles}
                      onDownload={runDownload}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {images.map(img => (
                <div key={img.id} className="relative group w-full">
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-destructive/90"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="mb-2">
                    <Input
                      value={img.title}
                      onChange={(e) => updateTitle(img.id, e.target.value)}
                      placeholder="Frame title for this image"
                      aria-label="Frame title for this image"
                    />
                  </div>

                  {/* WYSIWYG preview: a fixed W×H frame scaled to fit the column.
                      The actual download is drawn separately with the Canvas API
                      (renderChrome), so this is purely for display. */}
                  <div style={{ height: H * previewScale }} className="overflow-hidden">
                    <div
                      className="flex overflow-hidden"
                      style={{
                        width: `${W}px`,
                        height: `${H}px`,
                        background: outerBackground,
                        padding: `${padding}px`,
                        boxSizing: 'border-box',
                        transformOrigin: 'top left',
                        transform: `scale(${previewScale})`,
                      }}
                    >
                        <PreviewChrome
                          frameStyle={frameStyle}
                          windowBackground={windowBackground}
                          titleStyle={titleStyle}
                          title={img.title}
                          isVideo={getMediaKind(img.file) === 'video'}
                          previewUrl={img.previewUrl}
                          mediaFitClass={mediaFitClass}
                          imageRadius={imageRadius}
                        />
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[400px] ${
              isDragging ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground bg-card/50 hover:border-primary/50 hover:bg-accent/30'
            }`}
          >
            <UploadCloud className="w-12 h-12 mb-4 opacity-60" />
            <p className="text-lg font-medium text-foreground">Drop media here or click to upload</p>
            <p className="text-sm mt-1">Images, GIFs &amp; videos — wrapped in a macOS-style window frame.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Canva-style download settings popover. */
function DownloadPanel({
  width,
  height,
  count,
  kindCounts,
  quality,
  setQuality,
  separateFiles,
  setSeparateFiles,
  onDownload,
}: {
  width: number;
  height: number;
  count: number;
  kindCounts: Record<MediaKind, number>;
  quality: 'standard' | 'high';
  setQuality: (q: 'standard' | 'high') => void;
  separateFiles: boolean;
  setSeparateFiles: (v: boolean) => void;
  onDownload: () => void;
}) {
  const hasMotion = (kindCounts.gif ?? 0) > 0 || (kindCounts.video ?? 0) > 0;
  return (
    <div className="text-sm">
      <div className="px-4 py-3 border-b font-semibold">Download</div>

      <div className="p-4 space-y-4">
        {/* What will be exported */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">File types</Label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(kindCounts) as MediaKind[]).map(kind => {
              const { label, Icon } = KIND_META[kind];
              return (
                <span key={kind} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs">
                  <Icon className="w-3.5 h-3.5" />
                  {label} ×{kindCounts[kind]}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/80">Each item keeps its original type.</p>
        </div>

        {/* Quality (affects GIF/video re-encode) */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Quality</Label>
          <Select value={quality} onValueChange={(v) => setQuality(v as 'standard' | 'high')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard — faster, smaller</SelectItem>
              <SelectItem value="high">High — slower, larger</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground/80">
            {width} × {height} px{hasMotion ? ' · applies to GIF & video' : ''}
          </p>
        </div>

        {/* Packaging */}
        {count > 1 && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={separateFiles} onCheckedChange={(v) => setSeparateFiles(v === true)} />
            <span>Download as separate files</span>
          </label>
        )}

        <Button className="w-full" onClick={onDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download {count > 1 ? (separateFiles ? `${count} files` : 'ZIP') : ''}
        </Button>
      </div>
    </div>
  );
}

/** Live WYSIWYG preview of the frame chrome, matching renderChrome per style. */
function PreviewChrome({
  frameStyle,
  windowBackground,
  titleStyle,
  title,
  isVideo,
  previewUrl,
  mediaFitClass,
  imageRadius,
}: {
  frameStyle: FrameStyle;
  windowBackground: string;
  titleStyle: React.CSSProperties;
  title: string;
  isVideo: boolean;
  previewUrl: string;
  mediaFitClass: string;
  imageRadius: string;
}) {
  const { hasWindow, headerH } = frameLayout(frameStyle);

  const media = isVideo ? (
    <video src={previewUrl} muted loop autoPlay playsInline className={mediaFitClass} style={{ borderRadius: `${imageRadius}px` }} />
  ) : (
    <img src={previewUrl} alt="Preview" decoding="async" loading="lazy" className={mediaFitClass} style={{ borderRadius: `${imageRadius}px` }} />
  );

  const dots = (size: string) => (
    <div className="flex gap-2">
      <div className={`${size} rounded-full bg-[#ff5f56]`} />
      <div className={`${size} rounded-full bg-[#ffbd2e]`} />
      <div className={`${size} rounded-full bg-[#27c93f]`} />
    </div>
  );

  let bar: React.ReactNode = null;
  if (frameStyle === 'macos') {
    bar = (
      <div className="flex items-center px-4 relative shrink-0" style={{ height: headerH }}>
        <div className="absolute left-4">{dots('w-3 h-3')}</div>
        <div className="flex-1 px-16" style={titleStyle}>{title}</div>
      </div>
    );
  } else if (frameStyle === 'windows') {
    bar = (
      <div className="flex items-center gap-2 px-3 shrink-0" style={{ height: headerH }}>
        <div className="flex-1 truncate" style={{ ...titleStyle, textAlign: 'left' }}>{title}</div>
        <div className="flex items-center gap-3 text-base leading-none shrink-0" style={{ color: titleStyle.color }}>
          <span>—</span>
          <span className="text-xs">▢</span>
          <span>✕</span>
        </div>
      </div>
    );
  } else if (frameStyle === 'browser') {
    bar = (
      <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: headerH }}>
        {dots('w-2.5 h-2.5')}
        <div className="flex-1 h-6 rounded-full bg-foreground/10 flex items-center px-3 overflow-hidden">
          <span className="truncate w-full" style={{ ...titleStyle, textAlign: titleStyle.textAlign === 'left' ? 'left' : 'center' }}>{title}</span>
        </div>
      </div>
    );
  }

  const mediaArea = (
    <div className={`flex-1 min-h-0 flex items-center justify-center ${headerH > 0 ? 'px-8 pb-8' : hasWindow ? 'p-8' : ''}`}>
      {media}
    </div>
  );

  if (!hasWindow) {
    return <div className="w-full h-full flex flex-col">{mediaArea}</div>;
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col w-full h-full shadow-2xl" style={{ backgroundColor: windowBackground }}>
      {bar}
      {mediaArea}
    </div>
  );
}

