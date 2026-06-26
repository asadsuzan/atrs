import { createPortal } from 'react-dom';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { DesktopWindow } from './DesktopWindow';

/**
 * Renders all open desktop windows plus a taskbar, portaled to <body> so they
 * float above the routed page on any route. Empty (and invisible) when no
 * windows are open.
 */
export function WindowLayer() {
  const { windows, close, focus, minimize, restore, toggleMaximize } = useWindowManager();
  if (windows.length === 0) return null;

  const hasTaskbar = windows.length > 0;

  return createPortal(
    <>
      {/* Window surface — click-through where there are no windows. */}
      <div className="fixed inset-0 z-[80] pointer-events-none">
        {windows.map(w => (
          <DesktopWindow
            key={w.id}
            meta={w}
            onFocus={() => focus(w.id)}
            onMinimize={() => minimize(w.id)}
            onToggleMaximize={() => toggleMaximize(w.id)}
            onClose={() => close(w.id)}
          />
        ))}
      </div>

      {/* Taskbar */}
      {hasTaskbar && (
        <div className="fixed bottom-0 left-0 right-0 z-[85] h-11 flex items-center gap-1 px-2 border-t bg-card/95 backdrop-blur shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pointer-events-auto overflow-x-auto">
          {windows
            .slice()
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(w => {
              const topZ = Math.max(...windows.map(x => x.z));
              const isActive = !w.minimized && w.z === topZ;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => (w.minimized ? restore(w.id) : isActive ? minimize(w.id) : focus(w.id))}
                  title={w.title}
                  className={`group inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium max-w-[200px] transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : w.minimized
                        ? 'text-muted-foreground hover:bg-accent'
                        : 'text-foreground/80 hover:bg-accent'
                  }`}
                >
                  {w.icon && <span className="shrink-0">{w.icon}</span>}
                  <span className="truncate">{w.title}</span>
                </button>
              );
            })}
        </div>
      )}
    </>,
    document.body,
  );
}
