import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Download,
  Trash2,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Loader2,
  Palette,
  AppWindow,
  Sparkles,
  Box,
  Image as ImageIcon,
  RotateCcw,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  getMediaKind,
  makePreviewUrl,
  frameLayout,
  FRAME_STYLES,
  type MediaFit,
  type MediaKind,
  type FrameStyle,
  type BackgroundType,
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
  { label: 'Vertical 9:16', w: 1080, h: 1920 },
  { label: 'Twitter / X', w: 1600, h: 900 },
];

/** Background gradient presets (deg form so the custom editor can parse them). */
const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #30cfd0, #330867)',
  'linear-gradient(135deg, #a8edea, #fed6e3)',
  'linear-gradient(135deg, #ff9a9e, #fecfef)',
  'linear-gradient(90deg, #fdfbfb, #ebedee)',
  'linear-gradient(135deg, #0f2027, #2c5364)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
  'linear-gradient(135deg, #f6d365, #fda085)',
];

const SOLID_PRESETS = ['#ffffff', '#0f172a', '#f1f5f9', '#1e293b', '#0ea5e9', '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];

/** 3D tilt presets (rotateX, rotateY, rotateZ). */
const TILT_PRESETS: { label: string; x: number; y: number; z: number }[] = [
  { label: 'Flat', x: 0, y: 0, z: 0 },
  { label: 'Left', x: 4, y: 18, z: 0 },
  { label: 'Right', x: 4, y: -18, z: 0 },
  { label: 'Up', x: 18, y: 0, z: 0 },
  { label: 'Dynamic', x: 12, y: -16, z: -2 },
];

/** Soft transparent checkerboard, drawn behind a transparent scene in the preview. */
const CHECKER_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%), linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)',
  backgroundSize: '24px 24px',
  backgroundPosition: '0 0, 12px 12px',
};

function hexToRgba(hex: string, a: number): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function parseGradient(css: string): { angle: number; c1: string; c2: string } | null {
  const m = css.match(/linear-gradient\(\s*(-?[\d.]+)deg\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/i);
  if (!m) return null;
  return { angle: parseFloat(m[1]), c1: m[2].trim(), c2: m[3].trim() };
}

/** A labelled control row used throughout the settings panel. */
function Field({ label, htmlFor, children }: { label: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Section heading with an icon inside a tab. */
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

/** Label + live value + range slider. */
function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-[11px] tabular-nums text-foreground/70">{fmt ? fmt(value) : value}</span>
      </div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} />
    </div>
  );
}

/** A compact segmented toggle. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: React.ReactNode; icon?: any; title?: string }[];
}) {
  return (
    <div className="inline-flex w-full items-center gap-1 rounded-md bg-muted p-1 h-9">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 h-full rounded text-xs font-medium transition-colors',
            value === o.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.icon && <o.icon className="w-4 h-4" />}
          {o.label}
        </button>
      ))}
    </div>
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

  // Frame / window
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('macos');
  const [windowBackground, setWindowBackground] = useState('#ffffff');
  const [windowRadius, setWindowRadius] = useState(12);
  const [imageRadius, setImageRadius] = useState(12);
  const [mediaFit, setMediaFit] = useState<MediaFit>('contain');
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState('#e5e7eb');
  const [browserUrl, setBrowserUrl] = useState('');

  // Scene background
  const [bgType, setBgType] = useState<BackgroundType>('gradient');
  const [gradAngle, setGradAngle] = useState(90);
  const [gradC1, setGradC1] = useState('#fdfbfb');
  const [gradC2, setGradC2] = useState('#ebedee');
  const [solidColor, setSolidColor] = useState('#0f172a');
  const [advancedCss, setAdvancedCss] = useState('');
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgImageFit, setBgImageFit] = useState<MediaFit>('cover');
  const [padding, setPadding] = useState(40);

  // Shadow
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(60);
  const [shadowSpread, setShadowSpread] = useState(0);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(30);
  const [shadowOpacity, setShadowOpacity] = useState(0.25);

  // 3D tilt
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [rotateZ, setRotateZ] = useState(0);
  const [perspective, setPerspective] = useState(1500);

  // Output size — every downloaded image is rendered to exactly these pixels.
  const [outputWidth, setOutputWidth] = useState('1280');
  const [outputHeight, setOutputHeight] = useState('960');

  const [activeTab, setActiveTab] = useState('canvas');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

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

  // Resolved CSS background (advanced CSS overrides the gradient builder).
  const outerBackground =
    bgType === 'solid'
      ? solidColor
      : bgType === 'none'
        ? 'transparent'
        : bgType === 'image'
          ? 'transparent'
          : advancedCss.trim() || `linear-gradient(${gradAngle}deg, ${gradC1}, ${gradC2})`;

  const applyGradientPreset = (preset: string) => {
    setBgType('gradient');
    setAdvancedCss('');
    const p = parseGradient(preset);
    if (p) {
      setGradAngle(p.angle);
      setGradC1(p.c1);
      setGradC2(p.c2);
    }
  };

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

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);
      setBgImageUrl(URL.createObjectURL(file));
      setBgType('image');
    }
    e.target.value = '';
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
        padding,
        style: frameStyle,
        outerBackground,
        windowBackground,
        windowRadius,
        titleColor,
        fontFamily,
        fontSize: Number(fontSize) || 16,
        fontWeight: Number(fontWeight) || 400,
        letterSpacing: Number(letterSpacing) || 0,
        textAlign,
        browserUrl: frameStyle === 'browser' ? browserUrl : undefined,
        backgroundImageUrl: bgType === 'image' && bgImageUrl ? bgImageUrl : undefined,
        backgroundImageFit: bgImageFit,
        shadow: {
          enabled: shadowEnabled,
          color: shadowColor,
          blur: shadowBlur,
          spread: shadowSpread,
          offsetX: shadowX,
          offsetY: shadowY,
          opacity: shadowOpacity,
        },
        border: { width: borderWidth, color: borderColor },
        tilt: { rotateX, rotateY, rotateZ, perspective },
      },
      radius: imageRadius,
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

  // Composed box-shadow (drop shadow + inset "border") for the preview window.
  const dropShadow = shadowEnabled && shadowOpacity > 0
    ? `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowOpacity)}`
    : '';
  const insetBorder = borderWidth > 0 ? `inset 0 0 0 ${borderWidth}px ${borderColor}` : '';
  const windowBoxShadow = [dropShadow, insetBorder].filter(Boolean).join(', ') || 'none';

  const tiltTransform = rotateX || rotateY || rotateZ
    ? `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`
    : undefined;

  // Outer scene background style in the preview.
  const sceneStyle: React.CSSProperties =
    bgType === 'image' && bgImageUrl
      ? {
          backgroundImage: `url("${bgImageUrl}")`,
          backgroundSize: bgImageFit === 'contain' ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : bgType === 'none'
        ? CHECKER_STYLE
        : { background: outerBackground };

  const resetEffects = () => {
    setShadowEnabled(true);
    setShadowColor('#000000');
    setShadowBlur(60);
    setShadowSpread(0);
    setShadowX(0);
    setShadowY(30);
    setShadowOpacity(0.25);
    setRotateX(0);
    setRotateY(0);
    setRotateZ(0);
    setPerspective(1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      {/* ── Settings panel ───────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-4 lg:self-start space-y-4 bg-card rounded-lg border p-4">
        {/* Upload */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
        />
        <input type="file" ref={bgFileInputRef} className="hidden" accept="image/*" onChange={handleBgFileChange} />
        <Button onClick={() => fileInputRef.current?.click()} className="w-full">
          <UploadCloud className="w-4 h-4 mr-2" />
          Upload Media
        </Button>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="canvas" title="Background & size"><Palette className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="frame" title="Window frame"><AppWindow className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="effects" title="Shadow & 3D"><Sparkles className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="text" title="Title text"><Type className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          {/* ── Canvas: background + size + padding ─────────────────── */}
          <TabsContent value="canvas" className="space-y-4 pt-4">
            <SectionHeader icon={Palette} title="Background" />
            <Segmented<BackgroundType>
              value={bgType}
              onChange={setBgType}
              options={[
                { value: 'gradient', label: 'Gradient' },
                { value: 'solid', label: 'Solid' },
                { value: 'image', label: 'Image' },
                { value: 'none', label: 'None' },
              ]}
            />

            {bgType === 'gradient' && (
              <>
                <div className="grid grid-cols-6 gap-1.5">
                  {GRADIENT_PRESETS.map(g => (
                    <button
                      key={g}
                      type="button"
                      title="Apply gradient"
                      onClick={() => applyGradientPreset(g)}
                      style={{ background: g }}
                      className={cn(
                        'aspect-square rounded-md border transition-transform hover:scale-105',
                        outerBackground === g ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'border-border',
                      )}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ColorField label="Color 1" value={gradC1} onChange={(v) => { setAdvancedCss(''); setGradC1(v); }} />
                  <ColorField label="Color 2" value={gradC2} onChange={(v) => { setAdvancedCss(''); setGradC2(v); }} />
                </div>
                <SliderRow label="Angle" value={gradAngle} min={0} max={360} onChange={(v) => { setAdvancedCss(''); setGradAngle(v); }} fmt={(v) => `${v}°`} />
                <Field label="Advanced CSS (overrides above)">
                  <Input
                    value={advancedCss}
                    onChange={(e) => setAdvancedCss(e.target.value)}
                    placeholder="e.g. radial-gradient(...) or #f3f4f6"
                    className="font-mono text-xs"
                  />
                </Field>
              </>
            )}

            {bgType === 'solid' && (
              <>
                <div className="grid grid-cols-10 gap-1.5">
                  {SOLID_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSolidColor(c)}
                      style={{ background: c }}
                      className={cn(
                        'aspect-square rounded-md border transition-transform hover:scale-105',
                        solidColor === c ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'border-border',
                      )}
                    />
                  ))}
                </div>
                <ColorField label="Color" value={solidColor} onChange={setSolidColor} />
              </>
            )}

            {bgType === 'image' && (
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => bgFileInputRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {bgImageUrl ? 'Replace background image' : 'Upload background image'}
                </Button>
                {bgImageUrl && (
                  <Segmented<MediaFit>
                    value={bgImageFit}
                    onChange={setBgImageFit}
                    options={[
                      { value: 'cover', label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                    ]}
                  />
                )}
                <p className="text-[11px] text-muted-foreground/80">The uploaded image fills the whole canvas behind the frame.</p>
              </div>
            )}

            {bgType === 'none' && (
              <p className="text-[11px] text-muted-foreground/80">
                Transparent background. PNG exports keep the alpha channel; JPG/GIF/video fall back to opaque.
              </p>
            )}

            <SliderRow label="Padding" value={padding} min={0} max={240} onChange={setPadding} fmt={(v) => `${v}px`} />

            <div className="pt-3 border-t space-y-3">
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
              <p className="text-[11px] text-muted-foreground/80">All downloads export at exactly {W}×{H}px.</p>
            </div>
          </TabsContent>

          {/* ── Frame: window styling ──────────────────────────────── */}
          <TabsContent value="frame" className="space-y-4 pt-4">
            <SectionHeader icon={AppWindow} title="Window" />
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

            {frameStyle === 'browser' && (
              <Field label="Address Bar URL" htmlFor="browser-url">
                <Input id="browser-url" value={browserUrl} onChange={(e) => setBrowserUrl(e.target.value)} placeholder="example.com" />
              </Field>
            )}

            <ColorField label="Window Background" value={windowBackground} onChange={setWindowBackground} />

            <SliderRow label="Window Corner Radius" value={windowRadius} min={0} max={48} onChange={setWindowRadius} fmt={(v) => `${v}px`} />
            <SliderRow label="Image Corner Radius" value={imageRadius} min={0} max={48} onChange={setImageRadius} fmt={(v) => `${v}px`} />

            <Field label="Media Fit">
              <Segmented<MediaFit>
                value={mediaFit}
                onChange={setMediaFit}
                options={[
                  { value: 'contain', label: 'Contain' },
                  { value: 'cover', label: 'Cover' },
                ]}
              />
              <p className="text-[11px] text-muted-foreground/80">
                Contain shows the whole media (letterboxed); Cover fills the window and crops overflow.
              </p>
            </Field>

            <div className="pt-3 border-t space-y-3">
              <SectionHeader icon={Box} title="Border" />
              <SliderRow label="Border Width" value={borderWidth} min={0} max={16} onChange={setBorderWidth} fmt={(v) => (v === 0 ? 'Off' : `${v}px`)} />
              {borderWidth > 0 && <ColorField label="Border Color" value={borderColor} onChange={setBorderColor} />}
            </div>
          </TabsContent>

          {/* ── Effects: shadow + 3D tilt ──────────────────────────── */}
          <TabsContent value="effects" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <SectionHeader icon={Sparkles} title="Shadow" />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox checked={shadowEnabled} onCheckedChange={(v) => setShadowEnabled(v === true)} />
                Enabled
              </label>
            </div>
            {shadowEnabled && (
              <>
                <SliderRow label="Blur" value={shadowBlur} min={0} max={200} onChange={setShadowBlur} fmt={(v) => `${v}px`} />
                <SliderRow label="Spread" value={shadowSpread} min={-40} max={80} onChange={setShadowSpread} fmt={(v) => `${v}px`} />
                <div className="grid grid-cols-2 gap-3">
                  <SliderRow label="Offset X" value={shadowX} min={-120} max={120} onChange={setShadowX} fmt={(v) => `${v}px`} />
                  <SliderRow label="Offset Y" value={shadowY} min={-120} max={120} onChange={setShadowY} fmt={(v) => `${v}px`} />
                </div>
                <SliderRow label="Opacity" value={shadowOpacity} min={0} max={1} step={0.01} onChange={setShadowOpacity} fmt={(v) => `${Math.round(v * 100)}%`} />
                <ColorField label="Shadow Color" value={shadowColor} onChange={setShadowColor} />
              </>
            )}

            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <SectionHeader icon={Box} title="3D Tilt" />
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetEffects}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {TILT_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setRotateX(p.x); setRotateY(p.y); setRotateZ(p.z); }}
                    className={cn(
                      'rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors',
                      rotateX === p.x && rotateY === p.y && rotateZ === p.z
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <SliderRow label="Rotate X (tilt up/down)" value={rotateX} min={-45} max={45} onChange={setRotateX} fmt={(v) => `${v}°`} />
              <SliderRow label="Rotate Y (turn left/right)" value={rotateY} min={-45} max={45} onChange={setRotateY} fmt={(v) => `${v}°`} />
              <SliderRow label="Rotate Z (roll)" value={rotateZ} min={-45} max={45} onChange={setRotateZ} fmt={(v) => `${v}°`} />
              <SliderRow label="Perspective" value={perspective} min={400} max={4000} step={50} onChange={setPerspective} fmt={(v) => `${v}px`} />
            </div>
          </TabsContent>

          {/* ── Text: title typography ─────────────────────────────── */}
          <TabsContent value="text" className="space-y-3 pt-4">
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
                <Segmented<Align>
                  value={textAlign}
                  onChange={setTextAlign}
                  options={[
                    { value: 'left', icon: AlignLeft, title: 'Left' },
                    { value: 'center', icon: AlignCenter, title: 'Center' },
                    { value: 'right', icon: AlignRight, title: 'Right' },
                  ]}
                />
              </Field>
            </div>

            <ColorField label="Title Color" value={titleColor} onChange={setTitleColor} />
          </TabsContent>
        </Tabs>
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

                  {/* WYSIWYG preview: a fixed W×H scene scaled to fit the column.
                      The actual download is drawn separately with the Canvas API
                      (renderChrome), so this is purely for display. */}
                  <div style={{ height: H * previewScale }} className="overflow-hidden">
                    <div
                      className="flex overflow-hidden"
                      style={{
                        width: `${W}px`,
                        height: `${H}px`,
                        padding: `${padding}px`,
                        boxSizing: 'border-box',
                        transformOrigin: 'top left',
                        transform: `scale(${previewScale})`,
                        ...sceneStyle,
                      }}
                    >
                        <PreviewChrome
                          frameStyle={frameStyle}
                          windowBackground={windowBackground}
                          windowRadius={windowRadius}
                          boxShadow={windowBoxShadow}
                          tiltTransform={tiltTransform}
                          titleStyle={titleStyle}
                          title={img.title}
                          browserUrl={browserUrl}
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
            <p className="text-sm mt-1">Images, GIFs &amp; videos — wrapped in a window frame, ready to share.</p>
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
  windowRadius,
  boxShadow,
  tiltTransform,
  titleStyle,
  title,
  browserUrl,
  isVideo,
  previewUrl,
  mediaFitClass,
  imageRadius,
}: {
  frameStyle: FrameStyle;
  windowBackground: string;
  windowRadius: number;
  boxShadow: string;
  tiltTransform?: string;
  titleStyle: React.CSSProperties;
  title: string;
  browserUrl: string;
  isVideo: boolean;
  previewUrl: string;
  mediaFitClass: string;
  imageRadius: number;
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
          <span className="truncate w-full" style={{ ...titleStyle, textAlign: titleStyle.textAlign === 'left' ? 'left' : 'center' }}>
            {browserUrl.trim() || title}
          </span>
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
    <div
      className="overflow-hidden flex flex-col w-full h-full"
      style={{
        backgroundColor: windowBackground,
        borderRadius: `${windowRadius}px`,
        boxShadow,
        transform: tiltTransform,
        transformStyle: 'preserve-3d',
      }}
    >
      {bar}
      {mediaArea}
    </div>
  );
}
