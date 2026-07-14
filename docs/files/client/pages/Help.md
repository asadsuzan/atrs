# `client/src/pages/Help.tsx`

**Purpose:** In-app help / documentation page. Renders a static, sectioned "How to use ATRS" guide with a sticky table of contents, plus buttons to launch/replay the interactive product tour.

**Language / Size:** TypeScript(React) / 11169 bytes

## Route
- Mounted in `App.tsx` at `path="/help"` inside `ProtectedLayout` (requires auth, rendered inside the app shell with sidebar). Lazy-loaded.
- Linked from `AppChangelog` footer ("Help & docs").

## Exports
- **Default export:** `Help()`.
- No named exports.
- Module-local (not exported): `Section` interface, `SECTIONS` array (the static content).

## Imports (Internal / External)
**Internal:**
- `Button` (`@/components/ui/button`)
- `useAuth` from `@/contexts/AuthContext`
- `startTour` from `@/lib/tour`

**External:**
- `react` (`useState`)
- `react-router-dom` (`Link`)
- `lucide-react` icons: `PlayCircle, Rocket, Package, Activity, GitBranch, Megaphone, BarChart2, Image as ImageIcon, History, Settings as SettingsIcon, Users as UsersIcon, Sparkles, KeyRound, HelpCircle, ChevronRight`

## State / Hooks / Contexts
- `useAuth()` → `{ isAdmin }` — gates admin-only sections.
- `useState('getting-started')` → `active` — currently highlighted TOC entry.
- No data fetching, no refs, no effects.

## Services & data (query keys, mutations, endpoints hit)
- None. Content is the compile-time `SECTIONS` array. The only external action is `startTour({ isAdmin })` from `lib/tour`.

## Behavior / Rendering
- **`SECTIONS`** is a static list of guide sections, each `{ id, icon, title, intro, steps[], adminOnly? }`. Topics: Getting started, Managing products, Logging activities, Tracking versions, Marketing Hub, Reports, Media Library, Audit logs, Settings & appearance, User management (admin-only), The Smart Parser.
- `sections = SECTIONS.filter(s => !s.adminOnly || isAdmin)` — non-admins never see the admin sections.
- **Hero:** HelpCircle badge, "How to use ATRS" title, blurb, and two buttons: "Start interactive tour" (`startTour({ isAdmin })`) and "Go to my products" (`Link` to `/products`).
- **Two-column grid** (`lg:grid-cols-[220px_1fr]`):
  - **Aside TOC** (desktop only, `sticky top-6`): one button per section; clicking calls `scrollTo(id)`. Active section highlighted via `active` state.
  - **Sections column:** each section renders a card with icon, title, an "Admin" pill when `adminOnly`, the `intro`, and an ordered list of numbered `steps`.
- Trailing static cards: "Accounts & privacy" note (KeyRound), and a "Replay tour" callout (`startTour`).
- `scrollTo(id)` — sets `active` then `document.getElementById('help-'+id)?.scrollIntoView({ behavior:'smooth', block:'start' })`.

## Important logic / algorithms
- **Admin gating:** both the section filter and the per-section "Admin" pill derive from `isAdmin`.
- **Anchor scrolling:** each section has `id={"help-"+s.id}` with `scroll-mt-6`; TOC uses smooth `scrollIntoView`. `active` is set on click only — it does NOT track scroll position (no scroll-spy/IntersectionObserver), so highlight can drift from the visible section when the user scrolls manually.
- **`dangerouslySetInnerHTML` on step text:** each step string is injected via `dangerouslySetInnerHTML` after a regex replace that wraps `⌘/Ctrl + K` in a `<kbd>` element. Content is hard-coded in this file (not user input), so the injection is trusted, but it is the mechanism used to render the keyboard-shortcut chip.

## Relationships
- `contexts/AuthContext` → `isAdmin`.
- `lib/tour` → `startTour` (the same interactive tour auto-launched for new users in `App.tsx`'s `Layout`).
- Navigation link to `/products`.
- Purely presentational otherwise — no services.

## Edge cases & known limitations
- TOC highlight uses click-only state; scrolling doesn't update `active` (no scroll-spy).
- Steps use `dangerouslySetInnerHTML`; only safe because all content is static in-file.
- Content is hard-coded — keeping the guide in sync with features is manual.
- TOC is hidden below the `lg` breakpoint.
