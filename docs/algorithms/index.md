# ATRS — Algorithms Reference

Non-trivial algorithms across the ATRS codebase, each documented with inputs/
outputs, step-by-step logic, complexity, edge cases, and source references.

## Import & external data
- [WordPress.org import pipeline](wporg-import-pipeline.md) — the end-to-end
  SSE-streamed catalogue import (fetch → upsert → version sync → changelog
  reconciliation → cancel/rollback).
- [SVN version metadata fetch](svn-version-metadata-fetch.md) — WebDAV
  PROPFIND/REPORT scraping of `plugins.svn.wordpress.org` for version tags,
  dates, authors, and release notes.
- [readme changelog parsing](readme-changelog-parsing.md) — parse a WordPress
  `== Changelog ==` block into typed entries with a confidence model.
- [WP.org ecosystem stats aggregation](wp-stats-scraping.md) — multi-source
  (JSON API + regex-scraped HTML) stat merge with 6h cache and 8s timeouts.

## Domain logic
- [Slug generation & disambiguation](slug-disambiguation.md) — per-owner unique,
  collision-tolerant product slugs.
- [Timezone-aware streak calculation](streak-calculation.md) — current/best
  streak with a same-day grace period.
- [Changelog metrics aggregation](metrics-aggregation.md) — monthly/trend/annual
  counts by type with UTC-consistent bucketing.
- [Release assembly & export](release-assembly-and-export.md) — versions +
  activities → readme + Markdown, engineered to round-trip.

## AI
- [AI generation (Ollama)](ai-generation.md) — grounded JSON-mode title/
  description suggestions with output guardrails.

## Client rendering
- [Image Framer compositing & export](framer-export-compositing.md) — Canvas
  scene build, 3D homography warp, GIF/WebM export.
- [Accent color extraction](accent-color-extraction.md) — saturation-weighted
  dominant color from a downsampled canvas.

## Boot
- [Boot-time seed & migration](seed-and-migrate.md) — idempotent index/dedupe/
  root-admin/ownership back-fill on every start.

---
See also: [`../architecture/`](../architecture/overview.md) for how these fit
into the request lifecycle, and [`../features/`](../features/index.md) for the
user-facing features they power.
