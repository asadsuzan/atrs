import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';

/**
 * A global, draggable "dock" that hosts every floating job board (WP import,
 * bulk jobs, image-framer exports, …). Boards portal themselves into one shared
 * stack via <DockBoard>, so they:
 *   • are reachable on any page (the dock lives at the app root),
 *   • never overlap / fight for the same corner (they stack sequentially),
 *   • move together when the user drags the dock anywhere in the viewport.
 *
 * Adding a new board later is just: render <DockBoard id="x" order={n}>…</DockBoard>
 * somewhere under <JobDockProvider> (conventionally at the app root).
 */
interface JobDockContextValue {
  node: HTMLElement | null;
  startDrag: (e: React.PointerEvent) => void;
  register: (id: string) => void;
  unregister: (id: string) => void;
}

const JobDockContext = createContext<JobDockContextValue | null>(null);

function useJobDock() {
  const ctx = useContext(JobDockContext);
  if (!ctx) throw new Error('useJobDock must be used within JobDockProvider');
  return ctx;
}

const POS_KEY = 'jobDock.pos';
const MARGIN = 16;

type Pos = { x: number; y: number } | null;

export function JobDockProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [count, setCount] = useState(0);
  const dockRef = useRef<HTMLDivElement | null>(null);

  // null = default anchor (bottom-right); otherwise an explicit viewport coord.
  const [pos, setPos] = useState<Pos>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      return raw ? (JSON.parse(raw) as Pos) : null;
    } catch {
      return null;
    }
  });

  const setDockRef = useCallback((el: HTMLDivElement | null) => {
    dockRef.current = el;
    setNode(el);
  }, []);

  const register = useCallback((_id: string) => setCount(c => c + 1), []);
  const unregister = useCallback((_id: string) => setCount(c => Math.max(0, c - 1)), []);

  // Keep the dock on-screen if the viewport shrinks below a stored position.
  useEffect(() => {
    if (!pos) return;
    const clamp = () => {
      const el = dockRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setPos(p =>
        p
          ? {
              x: Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - w)),
              y: Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - h)),
            }
          : p,
      );
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [pos]);

  const startDrag = useCallback((e: React.PointerEvent) => {
    const el = dockRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const onMove = (ev: PointerEvent) => {
      const x = Math.min(Math.max(0, ev.clientX - offX), Math.max(0, window.innerWidth - w));
      const y = Math.min(Math.max(0, ev.clientY - offY), Math.max(0, window.innerHeight - h));
      setPos({ x, y });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPos(p => {
        if (p) {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            /* ignore quota / privacy errors */
          }
        }
        return p;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const dockStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: MARGIN, bottom: MARGIN };

  return (
    <JobDockContext.Provider value={{ node, startDrag, register, unregister }}>
      {children}
      {createPortal(
        <div
          ref={setDockRef}
          style={dockStyle}
          className="fixed z-[100] flex flex-col items-end gap-2 pointer-events-none"
        >
          {/* Drag handle — only visible while at least one board is docked. */}
          {count > 0 && (
            <div
              onPointerDown={startDrag}
              style={{ order: -1 }}
              className="pointer-events-auto cursor-grab active:cursor-grabbing rounded-md border bg-card/90 backdrop-blur px-2 py-1 shadow-md flex items-center gap-1 text-[11px] text-muted-foreground select-none touch-none"
              title="Drag to move"
            >
              <GripVertical className="w-3.5 h-3.5" />
              <span>{count} job{count !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </JobDockContext.Provider>
  );
}

/**
 * Renders its children inside the shared dock stack. Mount it only when the
 * board has something to show (return null otherwise); presence drives the
 * dock's job counter and drag handle.
 */
export function DockBoard({ id, order = 0, children }: { id: string; order?: number; children: ReactNode }) {
  const { node, register, unregister } = useJobDock();

  useEffect(() => {
    register(id);
    return () => unregister(id);
  }, [id, register, unregister]);

  if (!node) return null;
  return createPortal(
    <div style={{ order }} className="pointer-events-auto w-80 max-w-[calc(100vw-2rem)]">
      {children}
    </div>,
    node,
  );
}
