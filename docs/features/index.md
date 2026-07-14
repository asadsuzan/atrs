# ATRS Feature Documentation

End-to-end (client → server) synthesis docs for each product feature of ATRS
(**Automated Townhall Report System**). Each page ties together the client
pages/components/services and the server routes/controllers/services/models that
make one feature work, and links back to the per-file docs under
[`docs/files/**`](../files/).

For system-wide context see
[`docs/architecture/overview.md`](../architecture/overview.md),
[`docs/api/server-api-endpoints.md`](../api/server-api-endpoints.md), and
[`docs/inventory/KNOWLEDGE-BASE.md`](../inventory/KNOWLEDGE-BASE.md).

## Products & catalog
- [Product management](product-management.md) — CRUD for tracked products (plugins/blocks/themes/standalone), slug generation, stale-product alerts, and repo-path browsing/jailing.
- [WordPress.org import](wporg-import.md) — SSE pipeline that imports products from WP.org via the plugin-info API + SVN, with cancel/rollback and dedupe.
- [Marketing hub](marketing-hub.md) — per-product marketing content (key/all features, demos, screenshots, FAQs) with a paste-to-structure SmartParser.

## Changelogs & versions
- [Changelog management](changelog-management.md) — the Activities collection = changelog entries; CRUD, filters, bulk update/delete (SSE), reorder, release flags, review queue.
- [Version management](version-management.md) — product versions as the single source of truth (lib/versions + useVersions + VersionBadge); version CRUD and badges.
- [Changelog generator](changelog-generator.md) — AI (Ollama) pipeline turning git diffs into a dev changelog, user release notes, GitHub notes, and a QA checklist.
- [Releases](releases.md) — release payload/export-format assembly, the public hosted changelog, and GitHub Releases → Versions sync.

## Feedback & tracking
- [Issues & feature requests](issues-and-feature-requests.md) — per-product bug tracker (with public reporting + owner review queue) and platform-level feature requests with admin triage.
- [Streak tracking](streak-tracking.md) — personal private daily-log work journal and streak stats.
- [Reports & dashboard](dashboard-and-insights.md) — the "Command Center" dashboard plus monthly/annual/trend reports and presentation mode.

## Media & tooling
- [Media library](media-library.md) — uploads (allow-listed, magic-byte sniffed, R2 or local), media browsing, admin delete/bulk-delete, and orphan purge.
- [Image framer](image-framer.md) — client-only screenshot beautifier that frames images and exports PNG/GIF.

## Platform & AI
- [AI assist](ai-assist.md) — inline "suggest title / generate description" powered by Ollama.
- [Notifications](notifications.md) — in-app notification bell backed by a live SSE stream and per-user notification records.
- [Auth & users](auth-and-users.md) — JWT auth, registration with admin approval, forgot/forced password flows, admin user management, and audit logs.
