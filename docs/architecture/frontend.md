# ATRS — Frontend Architecture

> Companion to `overview.md` / `data-flow.md`. How the React client
> (`client/src`) is structured. Grounded in `docs/files/client/**` and
> `docs/inventory/KNOWLEDGE-BASE.md §0`.

---

## 1. Entry & shell

- **`client/src/main.tsx`** — `createRoot(#root).render(<StrictMode>
  <ErrorBoundary><App/></ErrorBoundary></StrictMode>)`.
- **`client/src/App.tsx`** — the app shell: nested providers, the router, and
  the global streaming surfaces.

---

## 2. Provider nesting (outer → inner)

From `App.tsx` (order matters — inner providers can consume outer ones):

```
ThemeProvider(defaultTheme="todoist")
└ ConfirmProvider
  └ QueryClientProvider
    └ AuthProvider
      └ NotificationProvider
        └ WpImportProvider
          └ AddProductProvider
            └ JobStreamProvider
              └ FramerExportProvider
                └ WindowManagerProvider
                  └ ChangelogGenProvider
                    └ JobDockProvider
                      └ SmoothScroll
                        └ BrowserRouter
```

Each provider is documented under `docs/files/client/contexts/*.md`.

---

## 3. Global streaming surfaces (mounted once, persist across routes)

Because long-running jobs must survive navigation, these are mounted at the app
level (not inside a route): `WpOrgImportDialog`, `WpImportMiniPlayer`,
`JobStreamDialog`, `JobStreamMiniPlayer`, `FramerExportBoard`,
`ChangelogGenMiniPlayer`, `WindowLayer`, and the `Toaster`. Their state lives in
the corresponding root-mounted contexts (§2), so a user can start an import,
navigate away, and still see the docked mini-player.

---

## 4. Routing (`App.tsx:398–429`)

| Wrapper | Routes |
|---|---|
| **Public** (outside the shell) | `/login`, `/register`, `/forgot-password` (all `PublicOnly`), `/set-password` (self-gates on `mustChangePassword`), `/changelog` (AppChangelog — the app's own "What's New"), `/changelog/:id` (PublicChangelog — per-product), `/issues/:id` (PublicIssues), `/explore` (public product directory) |
| **`ProtectedLayout`** (requires a user; redirects to `/login`; if `mustChangePassword` → `/set-password`) | `/` (Dashboard), `/products`, `/products/:id`, `/activities`, `/media`, `/reports`, `/readme-tools`, `/changelog-generator`, `/review`, `/feature-requests`, `/audit-logs`, `/settings`, `/help`, `*` (NotFound) |
| **`RequireAdmin`** (inside ProtectedLayout) | `/users` |

- **`AppChangelog` (`/changelog`) vs `PublicChangelog` (`/changelog/:id`)** are
  distinct components with different type enums (`fix` vs `bug-fix`). The former
  renders the static `client/src/data/changelog.ts`; the latter fetches a
  product's public changelog.

---

## 5. Code-splitting

Auth pages (Login/Register/ForgotPassword/SetPassword) are eager; **all app
pages are `lazy()`** so heavy per-route dependencies (`jspdf`, `html2canvas`,
`pptxgenjs`, framer export canvas engine) load only when that route is visited,
keeping the initial bundle small. Route-level `Suspense` fallbacks come from the
skeleton library (`client/src/components/ui/skeletons.tsx`).

---

## 6. Layout & navigation

`Layout` is a collapsible desktop sidebar (persisted via
`localStorage['atrs_sidebar_collapsed']`) plus a mobile drawer. It mounts the
`CommandPalette` (⌘K), the `GetStarted` onboarding, and `StaleProductAlert`, and
auto-launches an interactive tour for new users (`client/src/lib/tour.ts`,
driver.js, gated by `localStorage['atrs_tour_seen']` and role/DOM presence).

---

## 7. Data layer

- **React Query** for all server state; stable query keys and mutation-driven
  invalidation (see `data-flow.md §4`).
- **Shared axios client** `client/src/services/api.ts` — `baseURL:"/api"`,
  Bearer token from `localStorage['atrs_token']`, 401 → clear token + redirect.
- **22 service modules** under `client/src/services/*` wrap the REST API by
  domain (products, activities, versions, issues, reports, media, github,
  changelogGen, ai, notifications, streak, auth, config, export, public, …).
- **SSE contexts** for streaming jobs (WpImport, JobStream, ChangelogGen,
  FramerExport) instead of React Query.

---

## 8. Versioning single-source

Version lists, ordering, "latest"/"unreleased" semantics, and badges are
centralized in `client/src/lib/versions.ts` (`decorateVersions`,
`compareVersionDesc`, grouping, label summary) + the
`client/src/hooks/useVersions.ts` React Query hooks (`useProductVersions` /
`useAllVersions`, shared cache key `['versions', productId]`) + the
`VersionBadge` component. **Do not re-derive version state from activity
labels** — always go through this source. (See the `versioning-single-source`
project memory.)

---

## 9. Theming

`ThemeProvider` (`client/src/contexts/ThemeProvider.tsx`) with a default
`"todoist"` theme; the `sonner` toaster and various components read the active
theme. Accent colors for product surfaces are derived client-side from product
imagery via `client/src/lib/imageColor.ts` (see
`docs/algorithms/accent-color-extraction.md`).

---

## Related docs
- `overview.md`, `data-flow.md`
- `docs/directories/client-src.md`, `client-components.md`, `client-services.md`
- `docs/files/client/App.md`, `docs/files/client/main.md`
