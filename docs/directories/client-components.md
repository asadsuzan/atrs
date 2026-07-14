# Directory Guide — `client/src/components`

> Component taxonomy for the SPA. Two tiers: a domain-agnostic **`ui/`**
> primitive kit and **feature folders** grouped by domain. Docs for each
> component live under [`../files/client/components/`](../files/client/components/).

## Two tiers

1. **`ui/` (30 primitives)** — shadcn/Radix-style building blocks with no ATRS
   domain knowledge. Reused everywhere.
2. **Feature folders** — components that know about ATRS entities (products,
   activities, versions, issues, marketing, jobs, …). They compose `ui/`
   primitives.

## `ui/` — primitive kit

Radix-wrapped and custom primitives (all under
[`../files/client/components/ui/`](../files/client/components/ui/)):

- **Radix wrappers:** [`alert-dialog`](../files/client/components/ui/alert-dialog.md),
  [`dialog`](../files/client/components/ui/dialog.md),
  [`dropdown-menu`](../files/client/components/ui/dropdown-menu.md),
  [`popover`](../files/client/components/ui/popover.md),
  [`select`](../files/client/components/ui/select.md),
  [`checkbox`](../files/client/components/ui/checkbox.md),
  [`label`](../files/client/components/ui/label.md),
  [`slider`](../files/client/components/ui/slider.md),
  [`tabs`](../files/client/components/ui/tabs.md),
  [`command`](../files/client/components/ui/command.md) (cmdk).
- **Form kit:** [`form`](../files/client/components/ui/form.md) (react-hook-form),
  [`input`](../files/client/components/ui/input.md),
  [`textarea`](../files/client/components/ui/textarea.md),
  [`PasswordInput`](../files/client/components/ui/PasswordInput.md),
  [`DatePicker`](../files/client/components/ui/DatePicker.md).
- **Display:** [`button`](../files/client/components/ui/button.md),
  [`badge`](../files/client/components/ui/badge.md),
  [`card`](../files/client/components/ui/card.md),
  [`table`](../files/client/components/ui/table.md),
  [`skeleton`](../files/client/components/ui/skeleton.md) /
  [`skeletons`](../files/client/components/ui/skeletons.md),
  [`Pagination`](../files/client/components/ui/Pagination.md),
  [`ViewToggle`](../files/client/components/ui/ViewToggle.md),
  [`AuthorAvatar`](../files/client/components/ui/AuthorAvatar.md),
  [`sonner`](../files/client/components/ui/sonner.md) (toasts).
- **Rich text & media:** [`RichText`](../files/client/components/ui/RichText.md),
  [`RichTextEditor`](../files/client/components/ui/RichTextEditor.md),
  [`MediaUploader`](../files/client/components/ui/MediaUploader.md),
  [`media-carousel`](../files/client/components/ui/media-carousel.md),
  [`media-lightbox`](../files/client/components/ui/media-lightbox.md).

## Feature folders

| Folder | Domain | Key components |
|---|---|---|
| `activities/` | Changelog entry authoring | [`ActivityForm`](../files/client/components/activities/ActivityForm.md) |
| `versions/` | Version display & management (single-source) | [`VersionBadge`](../files/client/components/versions/VersionBadge.md), [`VersionManager`](../files/client/components/versions/VersionManager.md) |
| `products/` | Product CRUD, WP.org import, release publish | [`ProductForm`](../files/client/components/products/ProductForm.md), [`AddProductDialog`](../files/client/components/products/AddProductDialog.md), [`WpOrgImportDialog`](../files/client/components/products/WpOrgImportDialog.md), [`WpImportMiniPlayer`](../files/client/components/products/WpImportMiniPlayer.md), [`ReleasePublish`](../files/client/components/products/ReleasePublish.md), [`ProductWpStats`](../files/client/components/products/ProductWpStats.md), [`RepoPathBrowser`](../files/client/components/products/RepoPathBrowser.md), [`WpReadmeViewer`](../files/client/components/products/WpReadmeViewer.md), [`StaleProductAlert`](../files/client/components/products/StaleProductAlert.md), [`ProductsEmptyState`](../files/client/components/products/ProductsEmptyState.md), [`NeedProductFirstDialog`](../files/client/components/products/NeedProductFirstDialog.md) |
| `issues/` | Bug/issue tracking (internal + public) | [`IssueManager`](../files/client/components/issues/IssueManager.md), [`QuickIssueDialog`](../files/client/components/issues/QuickIssueDialog.md), [`ReportIssueDialog`](../files/client/components/issues/ReportIssueDialog.md) |
| `marketing/` | Marketing Hub content authoring | [`MarketingManager`](../files/client/components/marketing/MarketingManager.md), [`SmartParser`](../files/client/components/marketing/SmartParser.md) |
| `tools/` | Image/GIF & Framer export utilities | [`ImageFramer`](../files/client/components/tools/ImageFramer.md), [`FramerExportBoard`](../files/client/components/tools/FramerExportBoard.md), [`framerExport`](../files/client/components/tools/framerExport.md) |
| `reports/` | Charts & presentation mode | [`DonutChart`](../files/client/components/reports/DonutChart.md), [`TrendChart`](../files/client/components/reports/TrendChart.md), [`PresentationMode`](../files/client/components/reports/PresentationMode.md) |
| `layout/` | App shell chrome | [`SidebarNav`](../files/client/components/layout/SidebarNav.md), [`CommandPalette`](../files/client/components/layout/CommandPalette.md) (⌘K), [`NotificationBell`](../files/client/components/layout/NotificationBell.md), [`PageTransition`](../files/client/components/layout/PageTransition.md), [`SmoothScroll`](../files/client/components/layout/SmoothScroll.md) |
| `windows/` | Floating desktop-window manager | [`DesktopWindow`](../files/client/components/windows/DesktopWindow.md), [`WindowLayer`](../files/client/components/windows/WindowLayer.md) |
| `jobs/` | SSE streaming-job UI (dialogs + mini-players) | [`JobStreamDialog`](../files/client/components/jobs/JobStreamDialog.md), [`JobStreamMiniPlayer`](../files/client/components/jobs/JobStreamMiniPlayer.md), [`ChangelogGenMiniPlayer`](../files/client/components/jobs/ChangelogGenMiniPlayer.md) |
| `ai/` | AI assistance | [`AiAssist`](../files/client/components/ai/AiAssist.md) |
| `dashboard/` | Dashboard widgets | [`StreakCard`](../files/client/components/dashboard/StreakCard.md) |
| `media/` | Media picker | [`MediaLibraryDialog`](../files/client/components/media/MediaLibraryDialog.md) |
| `onboarding/` | First-run guidance | [`GetStarted`](../files/client/components/onboarding/GetStarted.md) |

Top-level: [`ErrorBoundary`](../files/client/components/ErrorBoundary.md) (wraps
`App` in `main.tsx`).

## Conventions

- **`ui/` has no domain imports.** Feature folders may import `ui/`, never the
  other way round.
- **Mini-player pattern:** every long-running SSE job has a `*MiniPlayer` (jobs,
  products/WpImportMiniPlayer) mounted once in `App.tsx` and driven by a context
  so progress persists across route changes. See
  [conventions](../appendix/conventions.md) and [glossary](../glossary/glossary.md)
  ("mini-player").
- **Versioning UI:** always render version state via `VersionBadge` fed from
  `useVersions`, never hand-parsing labels (single-source pattern).
- **Forms:** feature dialogs (`ActivityForm`, `ProductForm`, …) build on the
  react-hook-form `ui/form` kit + Zod resolvers.
