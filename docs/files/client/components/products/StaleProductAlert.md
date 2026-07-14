# `client/src/components/products/StaleProductAlert.tsx`
**Purpose:** App-wide, headless alerter: when products are overdue for a changelog update it pops a rich custom toast (with sound) once per session, escalating to a sticky red alert when items are critical. Renders nothing itself.
**Language / Size:** TypeScript(React) / 5699 bytes

## Exports
- `StaleProductAlert()` (named component; returns `null`).
- `classifyStale(p: StaleProduct, days: number): Classified` — exported pure classifier.

## Props
- None.

## State / Hooks
- `useNavigate()` (react-router).
- `useQuery(['staleProducts'], getStaleProducts, { staleTime: 5m })` → `{ days, products }` (defaults 7 days / empty).
- `useEffect([products, days, navigate])`: computes the alert and fires it via a 1200ms `setTimeout` (cleaned up on unmount/change).

## Behavior / Rendering
- `classifyStale`: no `lastActivityAt` → `critical`, label "No changelog yet"; else compute day delta and mark `critical` when `>= days*2` else `warning`, label "Nd since update".
- Session de-dupe: builds `signature = "${days}:${total}:${urgent}"`, stores in `sessionStorage['atrs_stale_alert']`; skips if unchanged (re-alerts only when counts change).
- `toast.custom` renders a card: colored top bar (red critical / amber warning), icon (`AlertTriangle`/`Clock`), headline (urgent vs total count), copy, a top-3 list of products with per-item dots + labels ("+N more"), and Later/"Review now" actions (the latter dismisses and `navigate('/')`). Duration `Infinity` when critical, else 12000ms.

## Important logic / algorithms
- Critical detection: `urgent = critical.length > 0` → sticky red; otherwise transient amber.
- The 1.2s delay lets the app settle before the alert appears; `playSound('notification')` accompanies it.

## Relationships
- Service: `getStaleProducts` (types `StaleProduct`). Sound via `@/lib/sound`; toasts via `sonner`. Mounted as a global surface (like other app-root alerters) so it fires app-wide.

## Edge cases & known limitations
- Fires at most once per distinct `(days,total,urgent)` signature per browser session.
- Threshold `days` is server-provided (fallback 7).
- Headless — must be mounted somewhere persistent to work.
