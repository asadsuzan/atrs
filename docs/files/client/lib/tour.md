# `client/src/lib/tour.ts`
**Purpose:** Interactive onboarding product tour built on driver.js. Defines the step content, filters steps by role and DOM presence, tracks whether the tour has been seen (localStorage), and launches it.
**Language / Size:** TypeScript / 4642 bytes

## Exports
- `TOUR_SEEN_KEY` — const string `'atrs_tour_seen'`.
- `hasSeenTour(): boolean` — whether the tour was completed/dismissed before.
- `markTourSeen(): void` — record completion.
- `startTour(options?: TourOptions)` — build, launch, and return the driver.js instance.

## API / Signature
- `startTour({ isAdmin = false, onFinish }?: TourOptions)` → the driver.js instance (after calling `.drive()`).
- `TourOptions` (internal): `{ isAdmin?: boolean; onFinish?: () => void }`.

## Imports (Internal / External)
Internal: none.
External: `driver.js` (`driver`, type `DriveStep`); `driver.js/dist/driver.css` (side-effect CSS import).

## Behavior / Implementation
- **Seen tracking:** `hasSeenTour` → `localStorage.getItem(TOUR_SEEN_KEY) === '1'`; `markTourSeen` writes `'1'`.
- **`startTour`:**
  - Builds `candidateSteps` — each a `DriveStep` plus a private `_selector`, anchored to `[data-tour="…"]` elements in the app shell (logo, nav items for `/`, `/products`, `/activities`, `/media`, `/reports`, `/audit-logs`, `/users`, plus `search`, `/help`, `user-menu`), with title/description popovers (HTML allowed in descriptions, e.g. `<kbd>⌘</kbd>`).
  - **Filters** candidate steps: drops the `[data-tour="nav-/users"]` step when `!isAdmin`, and drops any step whose `_selector` doesn't currently match a DOM element (`document.querySelector(...) === null`) — so missing anchors are skipped gracefully.
  - Creates `driver({ showProgress: true, allowClose: true, nextBtnText: 'Next →', prevBtnText: '← Back', doneBtnText: 'Finish', steps, onDestroyed })`.
  - `onDestroyed` (fires on finish or skip) calls `markTourSeen()` then `onFinish?.()`.
  - Calls `d.drive()` and returns `d`.

## Data structures / Types / Constants
- `TOUR_SEEN_KEY = 'atrs_tour_seen'` (localStorage; value `'1'`).
- `candidateSteps`: `Array<DriveStep & { _selector?: string }>`.
- `TourOptions` interface.

## Relationships
- Anchored to `data-tour="…"` attributes rendered by the app shell/nav components.
- Launched from onboarding (e.g. GetStarted) and re-launchable from Help & Demos.
- Uses driver.js styling via the imported CSS.

## Edge cases & known limitations
- Steps only appear for elements present in the DOM at launch time; admin-only `/users` step is additionally gated on `isAdmin`.
- `hasSeenTour`/`markTourSeen` are the seen-state gate but `startTour` itself doesn't check it — callers decide whether to auto-launch.
- Popover descriptions contain raw HTML (trusted, hardcoded here).
- Browser-only (localStorage + DOM).
