# `client/src/lib/pageTitle.ts`
**Purpose:** Centralized page-title logic. Maps static routes to their tab title, brand-formats titles, and flags dynamic/entity routes that title themselves so a central setter can leave them alone.
**Language / Size:** TypeScript / 1725 bytes

## Exports
- `BRAND` — const string `'ATRS'`.
- `formatTitle(title?: string | null): string` — appends the brand.
- `titleForPath(pathname: string): string | null` — the brand-formatted title for a route, or `null` when the page owns its title.

## API / Signature
- `formatTitle(title)` → `"<title> · ATRS"` when truthy, else `"ATRS"`.
- `titleForPath(pathname)` → brand-formatted string, or `null` (page-owned), or `formatTitle('Page not found')` for unknown paths.

## Imports (Internal / External)
None.

## Behavior / Implementation
- `formatTitle`: `title ? \`${title} · ${BRAND}\` : BRAND`.
- `titleForPath`:
  1. If `pathname` is a key in `STATIC_TITLES`, return `formatTitle(STATIC_TITLES[pathname])`.
  2. Else if any `PAGE_OWNED` regex matches, return `null` (the page sets its own title, typically via `useDocumentTitle`).
  3. Else return `formatTitle('Page not found')` (catch-all route).

## Data structures / Types / Constants
- `BRAND = 'ATRS'`.
- `STATIC_TITLES: Record<string,string>` — exact-path → title map, including: `/`→Dashboard, `/login`→Sign in, `/register`→Create account, `/forgot-password`→Reset password, `/set-password`→Set password, `/products`→Products, `/activities`→Activities, `/media`→Media Library, `/reports`→Reports, `/readme-tools`→Readme Tools, `/changelog-generator`→Git Changelog, `/review`→Review queue, `/feature-requests`→Feature Requests, `/audit-logs`→Audit Logs, `/settings`→Settings, `/help`→Help, `/users`→Users.
- `PAGE_OWNED: RegExp[]` — routes that self-title: `^/explore/?$`, `^/products/[^/]+`, `^/changelog/?$`, `^/changelog/[^/]+`, `^/issues/[^/]+`.

## Relationships
- `formatTitle` is used by `hooks/useDocumentTitle` for entity/dynamic pages.
- `titleForPath` is consumed by a central route-change title effect (App shell) for static routes; page-owned routes return `null` so `useDocumentTitle` on those pages controls the title.

## Edge cases & known limitations
- `STATIC_TITLES` lookup is exact-match (no trailing-slash normalization) — `/products/` would not match the static map (but the `PAGE_OWNED` product regex would return `null`).
- Any path not in the static map and not page-owned yields "Page not found · ATRS", matching the catch-all route.
