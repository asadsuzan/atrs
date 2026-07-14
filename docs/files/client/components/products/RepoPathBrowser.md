# `client/src/components/products/RepoPathBrowser.tsx`
**Purpose:** Server-side folder picker dialog for choosing a product's local Git repo path. Browses directories on the server machine (drive list on Windows / `/` on POSIX) with an editable path box, up/home navigation, and a select action.
**Language / Size:** TypeScript(React) / 6127 bytes

## Exports
- `RepoPathBrowser({ open, onOpenChange, initialPath?, onSelect })` (named component).

## Props
- `open: boolean`, `onOpenChange: (open) => void` — controlled visibility.
- `initialPath?: string` — path to start at (also seeds the editable box).
- `onSelect: (path: string) => void` — called with the chosen folder; dialog closes.

## State / Hooks
- `current` (browsed path; `''` = root view) and `pathInput` (editable text box).
- `useEffect([open, initialPath])`: on open, resets both to `initialPath`.
- `useQuery(['browse-dirs', current], () => browseDirs(current || undefined), { enabled: open, retry: false })`.
- `useEffect([data, isError])`: syncs `pathInput` to the resolved `data.path`.

## Behavior / Rendering
- Editable path form ("Go" submits `current = pathInput.trim()`).
- Toolbar: Up (disabled when `data.parent === null`), Home (when `data.home`), and a right-aligned current-path label.
- Listing (h-72 scroll): loading spinner / error message (from `error.response.data.message` or fallback) / drive chips (`data.drives`) + directory buttons (`data.dirs`, click or double-click to enter) / "no sub-folders — you can still select this folder" note.
- Footer: Cancel and "Use this folder" (enabled only when `selectable` = has a non-root `data.path`).

## Important logic / algorithms
- `atRoot = !data || data.isRoot`; `selectable = !!data && !data.isRoot && !!data.path`.
- Navigation is driven entirely by re-querying `browseDirs(current)`.

## Relationships
- Service: `browseDirs` (`../../services/products`). Embedded in `ProductForm` to populate the `repoPath` field used by the Git Changelog Generator.

## Edge cases & known limitations
- Requires a server able to enumerate its own filesystem — only meaningful for local/self-hosted deployments.
- Root cannot be selected as a repo path (`isRoot` blocks selection).
