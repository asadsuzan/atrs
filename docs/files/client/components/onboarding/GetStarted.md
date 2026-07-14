# `client/src/components/onboarding/GetStarted.tsx`
**Purpose:** First-run onboarding dialog: when a signed-in user has no products, offers a one-step WordPress.org import (by author username or by plugin slug) so they land on real data. Auto-opens once, dismissable and remembered per user.
**Language / Size:** TSX / 6891 bytes

## Exports
- `GetStarted()` (named component, no props).

## Imports (Internal / External)
- Internal: `getProducts, wpOrgPreview` from `../../services/products`; `useWpImport` from `../../contexts/WpImportContext`; `useAuth` from `../../contexts/AuthContext`; `useLocalStorage` from `../../hooks/useLocalStorage`; UI `Dialog…`, `Button`, `Input`; `cn` from `@/lib/utils`.
- External: `useEffect, useState` (react); `useQuery` (@tanstack/react-query); icons `Loader2, Globe, Package, Sparkles, ArrowRight` (lucide-react); `toast` (sonner).

## Props
None.

## State / Refs / Context consumed
- Type `Mode = 'username' | 'slug'`.
- State: `open`, `mode` (default 'username'), `value`, `resolving`.
- `dismissed` via `useLocalStorage('atrs_getstarted_dismissed', false)`.
- Context: `useAuth()` → `user`; `useWpImport()` → `quickImport, isImporting`.

## Hooks & Effects (deps, purpose)
- `useQuery(['products'])` → `getProducts()` (`enabled: !!user`); `productCount = productsData?.data?.length ?? 0`.
- `useEffect([user, isLoading, productCount, dismissed, isImporting])`: auto-opens once when a signed-in user has no products, hasn't dismissed, and no import is streaming.

## Functions & handlers
- `handleClose()`: closes and sets `dismissed = true`.
- `handleSubmit()`:
  - username mode: `wpOrgPreview(trimmed)`; if none found → info toast; else set dismissed, close, `quickImport({ username, slugs })`; network failure → error toast; always clears `resolving`.
  - slug mode: splits input on whitespace/commas into slugs; sets dismissed, closes, `quickImport({ slugs })`.
- Input Enter → `handleSubmit` (when not resolving).

## Rendered UI
- Returns `null` when `!open`.
- `Dialog`/`DialogContent` (`max-w-lg`): personalized welcome title, description, a two-button mode switch (By username / By plugin slug), input with mode-specific placeholder + helper text, and footer ("I'll do this later" vs "Import & get started" with loading state).

## Important logic & design patterns
- Per-user dismissal persisted in localStorage prevents re-nagging.
- Username import resolves the author's plugin slugs first (via `wpOrgPreview`) then bulk-imports.
- Multiple slugs accepted (comma/space/newline separated).
- Guards against reopening while an import is already running (`isImporting`).

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- Consumes `WpImportContext` and `AuthContext`. A global onboarding surface (rendered in App.tsx layout); hands off streaming import to the WP-import mini-player system.
