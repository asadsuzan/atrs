import { useRef, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import type { WindowMeta } from '../../contexts/WindowManagerContext';

const MIN_W = 320;
const MIN_H = 200;

/**
 * A single draggable / resizable / minimizable / maximizable window. Its live
 * position & size live in local state so dragging never re-renders the rest of
 * the app; only focus/min/max (infrequent) touch the manager context.
 */
export function DesktopWindow({
  meta,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onClose,
}: {
  meta: WindowMeta;
  onFocus: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}) {
  const [rect, setRect] = useState(meta.initial);
  const dragRef = useRef<{ startX: number; startY: number; orig: typeof rect } | null>(null);

  if (meta.minimized) return null;

  const beginDrag = (e: React.PointerEvent) => {
    if (meta.maximized) return;
    onFocus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, orig: rect };
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const x = Math.min(
        Math.max(0, d.orig.x + (ev.clientX - d.startX)),
        Math.max(0, window.innerWidth - rect.width),
      );
      const y = Math.min(
        Math.max(0, d.orig.y + (ev.clientY - d.startY)),
        Math.max(0, window.innerHeight - 48),
      );
      setRect(r => ({ ...r, x, y }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const beginResize = (e: React.PointerEvent, dir: 'e' | 's' | 'se') => {
    if (meta.maximized) return;
    e.stopPropagation();
    onFocus();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = rect;
    const onMove = (ev: PointerEvent) => {
      setRect(r => ({
        ...r,
        width: dir === 's' ? r.width : Math.max(MIN_W, Math.min(orig.width + (ev.clientX - startX), window.innerWidth - orig.x)),
        height: dir === 'e' ? r.height : Math.max(MIN_H, Math.min(orig.height + (ev.clientY - startY), window.innerHeight - orig.y)),
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const style: React.CSSProperties = meta.maximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 44px)', zIndex: meta.z }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: meta.z };

  return (
    <div
      role="dialog"
      aria-label={meta.title}
      onPointerDown={onFocus}
      style={style}
      className="pointer-events-auto absolute flex flex-col rounded-lg border bg-card shadow-2xl overflow-hidden"
    >
      {/* Title bar / drag handle */}
      <div
        onPointerDown={beginDrag}
        onDoubleClick={onToggleMaximize}
        className={`flex items-center gap-2 px-3 py-2 border-b bg-muted/40 select-none ${meta.maximized ? '' : 'cursor-grab active:cursor-grabbing'}`}
      >
        {meta.icon && <span className="shrink-0 text-muted-foreground">{meta.icon}</span>}
        <span className="text-sm font-medium truncate flex-1">{meta.title}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <WinButton title="Minimize" onClick={onMinimize}><Minus className="w-3.5 h-3.5" /></WinButton>
          <WinButton title={meta.maximized ? 'Restore' : 'Maximize'} onClick={onToggleMaximize}>
            {meta.maximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </WinButton>
          <WinButton title="Close" danger onClick={onClose}><X className="w-3.5 h-3.5" /></WinButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-4">{meta.content}</div>

      {/* Resize handles (hidden when maximized) */}
      {!meta.maximized && (
        <>
          <div onPointerDown={e => beginResize(e, 'e')} className="absolute top-8 bottom-3 right-0 w-1.5 cursor-ew-resize" />
          <div onPointerDown={e => beginResize(e, 's')} className="absolute left-3 right-3 bottom-0 h-1.5 cursor-ns-resize" />
          <div onPointerDown={e => beginResize(e, 'se')} className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-nwse-resize" />
        </>
      )}
    </div>
  );
}

function WinButton({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onPointerDown={e => e.stopPropagation()}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors ${
        danger ? 'hover:bg-destructive hover:text-destructive-foreground' : 'hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
