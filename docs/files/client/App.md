# `client/src/App.tsx`
**Purpose:** Root application component. Establishes the full provider nesting, the router and route tree, the app shell (sidebar rail + mobile drawer + top bars), auth-gated layout routes, lazy-loaded pages, and the global streaming/overlay surfaces.
**Language / Size:** TSX / 22275 bytes

## Provider nesting order (outermost → innermost, from `App()`)
1. `ThemeProvider` (`defaultTheme="todoist"`)
2. `ConfirmProvider`
3. `QueryClientProvider` (`client = new QueryClient()`, module-level singleton)
4. `AuthProvider`
5. `NotificationProvider`
6. `WpImportProvider`
7. `AddProductProvider`
8. `JobStreamProvider`
9. `FramerExportProvider`
10. `WindowManagerProvider`
11. `ChangelogGenProvider`
12. `JobDockProvider`
13. `SmoothScroll` → `BrowserRouter` → `AnimatedRoutes` (+ `ChangelogGenMiniPlayer` inside the router so it can navigate to the generator)

After `SmoothScroll`, still inside `JobDockProvider`, sit the persistent global surfaces: `WindowLayer`, `WpOrgImportDialog`, `WpImportMiniPlayer`, `JobStreamDialog`, `JobStreamMiniPlayer`, `FramerExportBoard`, `Toaster`. These persist across route changes so minimized imports/jobs keep streaming from any page; mini-players/boards dock into one draggable non-overlapping stack (JobDockProvider).

## Routing tree (`AnimatedRoutes` → `<Routes>`)
Public / auth routes (outside the app shell):
- `/login` → `PublicOnly > Login` (eager)
- `/register` → `PublicOnly > Register` (eager)
- `/forgot-password` → `PublicOnly > ForgotPassword` (eager)
- `/set-password` → `SetPassword` (eager; self-gates on auth + `mustChangePassword`)
- `/changelog` → `AppChangelog` (lazy; ATRS's own release notes, public, no shell)
- `/changelog/:id` → `PublicChangelog` (lazy; public hosted product changelog)
- `/issues/:id` → `PublicIssues` (lazy; public hosted issue tracker)
- `/explore` → `Explore` (lazy; public product directory)

Protected routes (nested under a layout route `<Route element={<ProtectedLayout />}>`):
- `/` → `Dashboard`
- `/products` → `Products`
- `/products/:id` → `ProductDetails`
- `/activities` → `Activities`
- `/media` → `MediaManager`
- `/reports` → `Reports`
- `/readme-tools` → `ReadmeTools`
- `/changelog-generator` → `ChangelogGenerator`
- `/review` → `Review`
- `/feature-requests` → `FeatureRequests`
- `/audit-logs` → `AuditLogs`
- `/settings` → `Settings`
- `/help` → `Help`
- `/users` → `RequireAdmin > Users`
- `*` → `NotFound` (404)

## Route guards
- **`ProtectedLayout`**: reads `useAuth()`; shows `FullScreenLoader` (=`AuthBootSkeleton`) while `loading`; redirects to `/login` (with `state.from`) if no `user`; redirects to `/set-password` if `user.mustChangePassword`. Otherwise renders `Layout` wrapping `CommandPalette`, `GetStarted`, `StaleProductAlert`, and a `Suspense`(`PageSkeleton`)-wrapped `AnimatePresence mode="wait"` that renders the routed `outlet` keyed by `location.pathname` (page-content transitions only; the Layout/sidebar stays mounted).
- **`RequireAdmin`**: redirects to `/` if not `isAdmin`.
- **`PublicOnly`**: redirects authenticated users to `/`; shows `FullScreenLoader` while loading.

## Lazy loading
Eager (auth pages): `Login`, `Register`, `ForgotPassword`, `SetPassword`. All other pages are `React.lazy(() => import(...))`: Dashboard, Products, ProductDetails, Activities, Reports, AuditLogs, Settings, MediaManager, Help, Users (admin), ReadmeTools, Review, PublicChangelog, AppChangelog, PublicIssues, Explore, ChangelogGenerator, FeatureRequests. Rationale (comment): defer heavy deps (jspdf, html2canvas, pptxgenjs) until their route is visited.

## App shell / layout details
- `Layout`: desktop `glass` sidebar rail (collapsible, width `md:w-20`↔`md:w-64`, persisted via `useLocalStorage('atrs_sidebar_collapsed')`); mobile slide-in drawer (Framer Motion `AnimatePresence`, `DRAWER_EASE = [0.22,1,0.36,1]`, scrim + `x: -100% → 0`); mobile top app bar and desktop search/notifications overlay. Locks body scroll and closes on Escape while the drawer is open; closes the drawer on navigation.
- `SidebarShell`: shared content for rail + drawer; logo, `SidebarNav`, and bottom actions (What's New link to `/changelog` showing `APP_VERSION`, Settings link, user chip with role + sign-out, collapse toggle).
- `openCommandPalette()` dispatches a synthetic `Cmd/Ctrl+K` keydown that `CommandPalette` listens for.
- `AnimatedRoutes` sets `document.title` on navigation via `titleForPath(pathname)` (entity/public routes return `null` and own their own title). Comment explains `<Routes>` is intentionally NOT keyed by pathname to avoid remounting the Layout/sidebar.
- `NotFound` renders a 404 with a link back to `/`.

## Global surfaces
`CommandPalette`, `GetStarted` (onboarding), `StaleProductAlert`, `NotificationBell`, `Toaster` (sonner), plus the streaming mini-players/dialogs/boards listed under provider nesting. Interactive tour auto-starts once for new users (`startTour`/`hasSeenTour`, 700ms delay).

## Key imports
`react-router-dom` (BrowserRouter, Routes, Route, Link, useLocation, Navigate, useOutlet), `@tanstack/react-query`, `framer-motion`, `lucide-react` icons, `APP_VERSION` from `./data/changelog`, hooks (`useLocalStorage`), lib (`tour`, `pageTitle`), and many contexts/components/pages.
