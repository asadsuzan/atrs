// ─────────────────────────────────────────────────────────────────────────────
// ATRS product changelog — single source of truth for the /changelog page.
//
// HOW TO ADD A RELEASE (do this as part of the release/CI step):
//   1. Bump APP_VERSION below to the version you're shipping.
//   2. Add a new entry to the TOP of RELEASES with that version, a `date`
//      (YYYY-MM-DD) or `null` while it's still unreleased, and its changes.
//   3. Group changes with the `type` field — the page renders them by type.
//
// Keep the newest release first; the page shows them in array order. The
// "current version" badge is derived from the first released entry.
// ─────────────────────────────────────────────────────────────────────────────

export type ChangeType = 'feature' | 'improvement' | 'fix' | 'security';

export interface ChangeEntry {
  type: ChangeType;
  title: string;
  /** Optional one-line elaboration shown after the title. */
  description?: string;
}

export interface Release {
  /** Semantic version, e.g. "1.1.0". Use "Unreleased" for in-progress work. */
  version: string;
  /** ISO date (YYYY-MM-DD) the version shipped, or null if not yet released. */
  date: string | null;
  /** Optional short headline for the release. */
  title?: string;
  /** Optional summary paragraph shown under the version heading. */
  summary?: string;
  entries: ChangeEntry[];
}

/** The version currently deployed. Bump this on every release. */
export const APP_VERSION = '1.0.0';

export const RELEASES: Release[] = [
  {
    version: 'Unreleased',
    date: null,
    title: 'Hardening, cloud deploy & import reliability',
    summary:
      'A broad reliability and security pass from a full codebase audit, first-class Vercel deployment, and a fix for duplicate changelog entries on WordPress.org import.',
    entries: [
      {
        type: 'feature',
        title: 'One-click Vercel deployment',
        description:
          'The API now runs as a single serverless function and the client as static assets on one domain, with MongoDB-backed runtime config. See DEPLOY.md.',
      },
      {
        type: 'feature',
        title: 'Dedicated product changelog page',
        description: 'This page — release notes for ATRS itself, updated on every release.',
      },
      {
        type: 'security',
        title: 'Locked down the local folder picker & git access',
        description:
          'Browsing and changelog git commands are confined to a configurable repository root instead of the whole host filesystem.',
      },
      {
        type: 'security',
        title: 'Closed cross-account data paths',
        description:
          'Ownership is enforced on changelog generation, cross-tenant re-parenting of entries is blocked, and releases are scoped to their owner.',
      },
      {
        type: 'security',
        title: 'Tightened auth',
        description:
          'JWTs are pinned to HS256, kept out of URLs/logs, invalidated on password change, and password hashing was strengthened.',
      },
      {
        type: 'security',
        title: 'Safer uploads and proxied content',
        description:
          'Uploads are verified by file signature, and the readme-validator proxy is sandboxed so third-party markup can’t run on our origin.',
      },
      {
        type: 'fix',
        title: 'No more duplicate entries on WordPress.org import',
        description:
          'A unique constraint plus an in-flight guard make imports idempotent even under double-clicks or overlapping runs.',
      },
      {
        type: 'fix',
        title: 'Reliable job cancellation across instances',
        description: 'Import/bulk-job cancellation now works even on multi-instance serverless deployments.',
      },
      {
        type: 'improvement',
        title: 'Accurate monthly report bucketing',
        description: 'Report months are bucketed consistently in UTC, so entries no longer land in the wrong month.',
      },
      {
        type: 'improvement',
        title: 'Steadier real-time notifications',
        description: 'The live notification stream backs off on errors and falls back to polling so updates keep arriving.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-02',
    title: 'Initial release',
    summary: 'The first public release of the Automated Townhall Reporting System.',
    entries: [
      {
        type: 'feature',
        title: 'Products, versions & changelog activities',
        description: 'Track every product’s releases and per-version changelog entries in one place.',
      },
      { type: 'feature', title: 'Monthly, trend & annual reports with a presentation mode' },
      {
        type: 'feature',
        title: 'WordPress.org import',
        description: 'Pull products, versions and changelogs straight from a plugin’s readme and SVN tags.',
      },
      {
        type: 'feature',
        title: 'AI-assisted git changelog generator',
        description: 'Turn a repo’s commit range into drafted, categorized changelog entries.',
      },
      { type: 'feature', title: 'Public hosted changelog & issue pages per product' },
      { type: 'feature', title: 'Cloudflare R2 media storage, GitHub release sync, and a review queue' },
      { type: 'feature', title: 'Team accounts with roles, approvals and audit logs' },
    ],
  },
];
