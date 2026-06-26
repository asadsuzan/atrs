import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowMeta {
  id: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Initial geometry; live position/size are owned by the window component. */
  initial: WindowRect;
}

export interface OpenWindowOptions {
  /** Stable id — opening the same id again just focuses/restores the window. */
  id?: string;
  title: string;
  icon?: ReactNode;
  content: ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

interface WindowManagerContextValue {
  windows: WindowMeta[];
  open: (opts: OpenWindowOptions) => string;
  close: (id: string) => void;
  focus: (id: string) => void;
  minimize: (id: string) => void;
  restore: (id: string) => void;
  toggleMaximize: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error('useWindowManager must be used within WindowManagerProvider');
  return ctx;
}

let uid = 0;
const nextId = () => `win-${++uid}`;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowMeta[]>([]);
  const zRef = useRef(10);

  const focus = useCallback((id: string) => {
    setWindows(prev => {
      const target = prev.find(w => w.id === id);
      if (!target) return prev;
      const z = ++zRef.current;
      return prev.map(w => (w.id === id ? { ...w, z, minimized: false } : w));
    });
  }, []);

  const open = useCallback((opts: OpenWindowOptions) => {
    const id = opts.id ?? nextId();
    let created = false;
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      const z = ++zRef.current;
      if (existing) {
        // Re-focus / un-minimize and refresh content.
        return prev.map(w =>
          w.id === id ? { ...w, z, minimized: false, content: opts.content, title: opts.title } : w,
        );
      }
      created = true;
      const count = prev.length;
      const width = opts.width ?? 760;
      const height = opts.height ?? 560;
      // Cascade new windows so they don't stack exactly on top of each other.
      const x = opts.x ?? Math.min(80 + count * 28, Math.max(20, window.innerWidth - width - 40));
      const y = opts.y ?? Math.min(80 + count * 28, Math.max(20, window.innerHeight - height - 120));
      return [
        ...prev,
        {
          id,
          title: opts.title,
          icon: opts.icon,
          content: opts.content,
          z,
          minimized: false,
          maximized: false,
          initial: { x, y, width, height },
        },
      ];
    });
    void created;
    return id;
  }, []);

  const close = useCallback((id: string) => setWindows(prev => prev.filter(w => w.id !== id)), []);
  const minimize = useCallback(
    (id: string) => setWindows(prev => prev.map(w => (w.id === id ? { ...w, minimized: true } : w))),
    [],
  );
  const restore = useCallback((id: string) => focus(id), [focus]);
  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => {
      const z = ++zRef.current;
      return prev.map(w => (w.id === id ? { ...w, maximized: !w.maximized, minimized: false, z } : w));
    });
  }, []);

  return (
    <WindowManagerContext.Provider value={{ windows, open, close, focus, minimize, restore, toggleMaximize }}>
      {children}
    </WindowManagerContext.Provider>
  );
}
