# Directory Guide — `client/src`

> The React + Vite single-page app (npm workspace `client`). Entry
> `client/src/main.tsx` mounts `App.tsx`, which wires the provider stack and
> router. Every claim below is traceable to the per-file docs under
> `../files/client/**` and to `../architecture/overview.md`.

## Role

`client/src` is the entire browser-facing application: a JWT-authenticated SPA
that manages products, changelogs ("activities"), versions, issues, feature
requests, media, marketing pages, reports, and AI-assisted tooling. It talks to
the Express API exclusively through the shared axios client in `services/api.ts`
(baseURL `/api`, bearer token from `localStorage['atrs_token']`) plus a few raw
`fetch`/`EventSource` streams for SSE jobs.

## Layout

| Subfolder | Role | Guide / key docs |
|---|---|---|
| `components/` | All React components: a `ui/` primitive kit (30 files) plus feature folders | see [client-components.md](client-components.md) |
| `contexts/` | 11 React context providers (global cross-route state) | [`AuthContext`](../files/client/contexts/AuthContext.md), [`JobStreamContext`](../files/client/contexts/JobStreamContext.md), [`ChangelogGenContext`](../files/client/contexts/ChangelogGenContext.md) |
| `hooks/` | 5 reusable hooks | [`useVersions`](../files/client/hooks/useVersions.md), [`useDebouncedValue`](../files/client/hooks/useDebouncedValue.md), [`useLocalStorage`](../files/client/hooks/useLocalStorage.md), [`useFormDraft`](../files/client/hooks/useFormDraft.md), [`useDocumentTitle`](../files/client/hooks/useDocumentTitle.md) |
| `lib/` | Framework-agnostic helpers (no React) | [`versions`](../files/client/lib/versions.md), [`utils`](../files/client/lib/utils.md), [`richText`](../files/client/lib/richText.md), [`tour`](../files/client/lib/tour.md), [`sound`](../files/client/lib/sound.md), [`imageColor`](../files/client/lib/imageColor.md), [`pageTitle`](../files/client/lib/pageTitle.md) |
| `pages/` | 21 route-level page components + `admin/Users` | [client-src pages below](#pages) |
| `services/` | 22 API-client modules (21 domain + shared `api.ts`) | see [client-services.md](client-services.md) |
| `data/` | Static in-app data | [`changelog`](../files/client/data/changelog.md) (the app's own release notes for `/changelog`) |
| `types/` | Ambient TypeScript declarations | [`gif.js.d`](../files/client/types/gif.js.d.md) |
| `assets/` | Static image/font assets | — |

Top-level files: [`main.tsx`](../files/client/main.md) (React root: `StrictMode` →
`ErrorBoundary` → `App`), [`App.tsx`](../files/client/App.md) (provider stack +
router), [`index.css`](../files/client/index-css.md) and
[`App.css`](../files/client/App-css.md) (Tailwind layers + theme tokens).

## The provider stack (`App.tsx`)

Providers nest outer→inner: `ThemeProvider(defaultTheme="todoist")` →
`ConfirmProvider` → `QueryClientProvider` → `AuthProvider` →
`NotificationProvider` → `WpImportProvider` → `AddProductProvider` →
`JobStreamProvider` → `FramerExportProvider` → `WindowManagerProvider` →
`ChangelogGenProvider` → `JobDockProvider` → `SmoothScroll` → `BrowserRouter`.

Global streaming surfaces are mounted **once** so they survive route changes
(mini-players + dialogs): `WpOrgImportDialog`, `WpImportMiniPlayer`,
`JobStreamDialog`, `JobStreamMiniPlayer`, `FramerExportBoard`,
`ChangelogGenMiniPlayer`, `WindowLayer`, `Toaster`.

## Routing (`App.tsx`)

- **Public** (outside the app shell): `/login`, `/register`, `/forgot-password`
  (`PublicOnly`), `/set-password`, `/changelog` (`AppChangelog`), `/changelog/:id`
  (`PublicChangelog`), `/issues/:id` (`PublicIssues`), `/explore` (`Explore`).
- **Protected** (`ProtectedLayout`, requires user; redirects to `/login`; forces
  `/set-password` when `mustChangePassword`): `/` (Dashboard), `/products`,
  `/products/:id`, `/activities`, `/media`, `/reports`, `/readme-tools`,
  `/changelog-generator`, `/review`, `/feature-requests`, `/audit-logs`,
  `/settings`, `/help`, `/users` (admin-only), `*` (NotFound).

Auth pages are eager-loaded; all app pages are `lazy()` so heavy per-route deps
(`jspdf`, `html2canvas`, `pptxgenjs`) don't bloat the initial bundle.

<a id="pages"></a>
## Pages

Route pages live in `pages/*.tsx` (docs under
[`../files/client/pages/`](../files/client/pages/)). Notable ones:
[`Dashboard`](../files/client/pages/Dashboard.md) ("Command Center" triage),
[`Products`](../files/client/pages/Products.md) /
[`ProductDetails`](../files/client/pages/ProductDetails.md),
[`Activities`](../files/client/pages/Activities.md) (titled "Changelogs"),
[`ChangelogGenerator`](../files/client/pages/ChangelogGenerator.md),
[`Reports`](../files/client/pages/Reports.md),
[`Review`](../files/client/pages/Review.md) (import review queue),
[`MediaManager`](../files/client/pages/MediaManager.md),
[`Settings`](../files/client/pages/Settings.md),
[`AuditLogs`](../files/client/pages/AuditLogs.md), and the public
[`Explore`](../files/client/pages/Explore.md) /
[`PublicChangelog`](../files/client/pages/PublicChangelog.md) /
[`PublicIssues`](../files/client/pages/PublicIssues.md). Admin: `admin/Users`.

## Conventions

- **Data fetching:** TanStack React Query everywhere (`QueryClientProvider` in
  `App.tsx`); query keys are namespaced by feature (e.g. `dashboardActivities`,
  `['release', productId]`, `allVersions`) and invalidated on mutation.
- **Versioning:** never re-derive version order/labels from activity strings —
  use `lib/versions` + `hooks/useVersions` + the `VersionBadge` component (see
  the versioning single-source pattern in [conventions](../appendix/conventions.md)).
- **Auth/session:** the token lives in `localStorage['atrs_token']`; the axios
  response interceptor turns any 401 into `clearToken()` + redirect to `/login`.
- **SSE jobs:** long-running work (WP.org import, bulk delete, changelog
  generation, media purge, Framer export) runs through context-backed
  mini-players so it persists across navigation.
- **Component split:** primitives in `components/ui` (shadcn/Radix style),
  feature components grouped by domain folder — see
  [client-components.md](client-components.md).
