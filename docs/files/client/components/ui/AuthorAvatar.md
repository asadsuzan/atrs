# `client/src/components/ui/AuthorAvatar.tsx`
**Purpose:** Avatar for a version/activity author (typically a WordPress.org username) with a graceful fallback chain: explicit avatar URL → WP.org gravatar redirect → deterministic colored initials badge.
**Language / Size:** TSX / 1967 bytes

## Exports
- `AuthorAvatar({ author, avatarUrl, className })` (named component).

## Props
- `author: string` — display name / WP.org username; used for alt text, gravatar lookup, initials, and color hashing.
- `avatarUrl?: string` — explicit avatar URL (first source tried).
- `className?: string` — Tailwind sizing classes for the box (default `w-6 h-6`).

## Imports (Internal / External)
- Internal: `cn` (`@/lib/utils`).
- External: `useState` (react).

## Behavior / Rendering
- Builds a `sources` array from `[avatarUrl, https://wordpress.org/grav-redirect.php?user=<encoded author>]`, filtering falsy entries.
- `idx` state points at the current source; `onError` on the `<img>` advances `idx` to the next source.
- While a source exists, renders a lazy-loaded rounded `<img>` (`object-cover bg-muted flex-shrink-0`).
- When sources are exhausted (`src` undefined), renders a `<span>` initials badge with a background color chosen deterministically by `colorFor(author)`.

## Data structures / Types / Constants
- `AVATAR_COLORS` — 8 Tailwind `bg-*-500` classes.
- `authorInitials(name)` — one-word names → first 2 chars uppercased; multi-word → first char of first + first char of last, uppercased.
- `colorFor(s)` — 32-bit rolling hash (`h = (h*31 + charCode) >>> 0`) modulo `AVATAR_COLORS.length` for a stable color per name.

## Relationships
- No contexts. Presentational; used wherever version/activity authorship is displayed.

## Edge cases & known limitations
- If both `avatarUrl` and the gravatar redirect 404/error, `idx` keeps incrementing past the array end, `src` becomes `undefined`, and the initials fallback renders — the intended terminal state.
- `authorInitials` assumes non-empty parts; an all-whitespace `author` would produce empty/malformed initials (split on `\s+` after trim yields `['']`).
