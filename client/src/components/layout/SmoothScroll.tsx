import { ReactLenis } from 'lenis/react';

/**
 * Walks up from a wheel/touch target looking for an independently scrollable
 * ancestor (or an explicit `data-lenis-prevent`). When found, Lenis should let
 * the browser scroll that container natively instead of smooth-scrolling the
 * page — otherwise inner panels (dialogs, the sidebar, log consoles, dropdowns)
 * can't be scrolled with the mouse wheel.
 */
function isWithinScrollable(node: EventTarget | null): boolean {
  let el: Element | null = node instanceof Element ? node : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      if (el.dataset.lenisPrevent !== undefined) return true;
      const style = getComputedStyle(el);
      const canScrollY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight;
      const canScrollX =
        (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth;
      if (canScrollY || canScrollX) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.5,
        smoothWheel: true,
        // Yield to nested scrollable containers so the wheel scrolls them.
        prevent: (node: HTMLElement) => isWithinScrollable(node),
      }}
    >
      {children}
    </ReactLenis>
  );
}
