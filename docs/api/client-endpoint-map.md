# API — Client → Endpoint Map

Source: `client/src/services/*.ts` (documented per-file under `docs/files/client/services/`).
This is the **client-observed** API surface (what the SPA calls). The server-side
route definitions (mount + middleware + controller handler) are documented separately
in `docs/api/routes.md` once the controllers/routes agent lands. Cross-reference the two
for a complete contract.

## HTTP client — `client/src/services/api.ts`
- Axios instance: `baseURL: '/api'`, `timeout: 30000`. **No env var** for base URL (no `VITE_API_URL`/`import.meta.env`); all calls are same-origin `/api/...` behind a dev/prod proxy.
- **Request interceptor:** reads JWT from `localStorage['atrs_token']` (`getToken()`); if present sets `Authorization: Bearer <token>`.
- **Response interceptor:** on `401`, clears token and full-page-redirects to `/login` (unless already there), then re-rejects.
- **Bypass axios (raw `fetch`)**: SSE/streaming (`changelogGen.generateChangelog`, `jobStream.streamJob`, `products.importFromWpOrgStream`) and public endpoints (`public.*`, `issues.getPublicIssues`, `issues.reportPublicIssue`, `release.getPublicChangelog`). Authed streams add the Bearer header manually.

## Endpoint table

| Service.fn | Method | Path | Notes |
|---|---|---|---|
| api.uploadFile | POST | /api/upload | multipart, field `file` |
| activities.getActivities | GET | /api/activities | |
| activities.getActivityById | GET | /api/activities/:id | |
| activities.createActivity | POST | /api/activities | |
| activities.updateActivity | PATCH | /api/activities/:id | |
| activities.deleteActivity | DELETE | /api/activities/:id | |
| activities.bulkUpdateActivities | POST | /api/activities/bulk-update | |
| activities.bulkDeleteActivities | DELETE | /api/activities/bulk-delete | ids in body |
| activities.reorderActivity | PATCH | /api/activities/:id/reorder | |
| ai.suggestTitles | POST | /api/ai/suggest | task:'title' |
| ai.suggestDescription | POST | /api/ai/suggest | task:'description' |
| auditLogs.getAuditLogs | GET | /api/audit-logs | |
| auth.login | POST | /api/auth/login | |
| auth.register | POST | /api/auth/register | |
| auth.getMe | GET | /api/auth/me | |
| auth.updateMe | PATCH | /api/auth/me | |
| auth.checkEmail | POST | /api/auth/check-email | |
| auth.requestPasswordReset | POST | /api/auth/password-reset-request | |
| auth.changePassword | POST | /api/auth/change-password | rotates token + setToken |
| changelogGen.generateChangelog | POST | /api/changelog-gen/generate | SSE via fetch |
| changelogGen.getProductTags | GET | /api/changelog-gen/tags/:productId | |
| changelogGen.getProductModels | GET | /api/changelog-gen/models | |
| config.getAppConfig | GET | /api/config | |
| config.updateAppConfig | POST | /api/config | |
| config.testStorageConnection | POST | /api/config/storage/test | |
| config.getNavSettings | GET | /api/notifications/nav-settings | (served under notifications mount) |
| config.getBranding | GET | /api/notifications/branding | (served under notifications mount) |
| export.exportAllData | GET | /api/export | blob download, admin |
| featureRequests.getFeatureRequests | GET | /api/feature-requests | |
| featureRequests.createFeatureRequest | POST | /api/feature-requests | |
| featureRequests.updateFeatureRequest | PATCH | /api/feature-requests/:id | |
| featureRequests.deleteFeatureRequest | DELETE | /api/feature-requests/:id | |
| github.getGithubStatus | GET | /api/github/status | |
| github.connectGithub | POST | /api/github/connect | |
| github.disconnectGithub | DELETE | /api/github/connect | |
| github.syncProductReleases | POST | /api/github/products/:productId/sync-releases | |
| issues.getIssues | GET | /api/issues | ?productId |
| issues.getAllIssues | GET | /api/issues | |
| issues.getPendingReviewIssues | GET | /api/issues/pending-review | |
| issues.createIssue | POST | /api/issues | |
| issues.updateIssue | PATCH | /api/issues/:id | |
| issues.deleteIssue | DELETE | /api/issues/:id | |
| issues.getPublicIssues | GET | /api/public/issues/:id | raw fetch, no auth |
| issues.reportPublicIssue | POST | /api/public/products/:id/issues | raw fetch, no auth |
| jobStream.streamJob | POST/DELETE | /api/<url> | SSE via fetch |
| jobStream.cancelJob | POST | /api/jobs/cancel | |
| marketing.getMarketingData | GET | /api/products/:productId/marketing | |
| marketing.updateMarketingData | PUT | /api/products/:productId/marketing | |
| marketing.deleteMarketingData | DELETE | /api/products/:productId/marketing | |
| media.getMediaList | GET | /api/media | |
| media.deleteMedia | DELETE | /api/media/:filename | ?force |
| media.bulkDeleteMedia | POST | /api/media/bulk-delete | |
| media.purgeOrphanedMedia | POST | /api/media/purge-orphaned | |
| notifications.getMyNotifications | GET | /api/notifications | |
| notifications.markAsRead | PATCH | /api/notifications/:id/read | |
| notifications.markAllAsRead | PATCH | /api/notifications/read-all | |
| notifications.deleteNotification | DELETE | /api/notifications/:id | |
| products.browseDirs | GET | /api/products/browse-dirs | ?path |
| products.getProducts | GET | /api/products | default limit:1000 |
| products.getProductById | GET | /api/products/:id | |
| products.getProductWpStats | GET | /api/products/:id/wp-stats | |
| products.getStaleProducts | GET | /api/products/stale | |
| products.createProduct | POST | /api/products | |
| products.updateProduct | PATCH | /api/products/:id | |
| products.deleteProduct | DELETE | /api/products/:id | |
| products.bulkDeleteProducts | DELETE | /api/products/bulk | ids in body |
| products.wpOrgPreview | GET | /api/products/wporg-preview | ?username |
| products.wpOrgPreviewBySlug | GET | /api/products/wporg-preview-by-slug | ?slugs=csv |
| products.importFromWpOrg | POST | /api/products/import-from-wporg | timeout 120s |
| products.importFromWpOrgStream | POST | /api/products/import-from-wporg | SSE via fetch |
| products.cancelImportSession | POST | /api/products/import-from-wporg/cancel | |
| public.getPublicProducts | GET | /api/public/products | raw fetch, no auth |
| release.getProductRelease | GET | /api/products/:id/release | |
| release.getPublicChangelog | GET | /api/public/changelog/:id | raw fetch, no auth |
| reports.getMonthlyReport | GET | /api/reports/monthly | |
| reports.getTrendData | GET | /api/reports/trend | |
| reports.getAnnualReport | GET | /api/reports/annual | |
| streak.getLoggingStreak | GET | /api/streak | ?tzOffset |
| streak.logToday | POST | /api/streak/log | |
| streak.deleteLog | DELETE | /api/streak/log/:id | |
| users.getUsers | GET | /api/users | admin |
| users.approveUser | PATCH | /api/users/:id/approve | admin |
| users.suspendUser | PATCH | /api/users/:id/suspend | admin |
| users.reactivateUser | PATCH | /api/users/:id/reactivate | admin |
| users.setUserRole | PATCH | /api/users/:id/role | admin |
| users.deleteUser | DELETE | /api/users/:id | ?reassignTo, admin |
| users.resetUserPassword | POST | /api/users/:id/reset-password | admin |
| versions.getVersions | GET | /api/versions | ?productId |
| versions.getAllVersions | GET | /api/versions | |
| versions.createVersion | POST | /api/versions | |
| versions.updateVersion | PATCH | /api/versions/:id | |
| versions.deleteVersion | DELETE | /api/versions/:id | |

## Notable cross-cutting facts
- `config.getNavSettings` and `config.getBranding` hit the **`/api/notifications` mount** (public-ish), not `/api/config` — explains why `/api/notifications` has no app-level guard in `app.ts`.
- `client/src/App.css` is an **unused Vite starter remnant** (not imported). Only `index.css` is imported (design tokens, 7 `.theme-*` themes, light/`.dark`, `.glass`, `.rich-content`).
