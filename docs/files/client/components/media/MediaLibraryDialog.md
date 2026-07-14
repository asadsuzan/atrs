# `client/src/components/media/MediaLibraryDialog.tsx`
**Purpose:** Modal media picker: browse/search the media library, filter by product and accept-type, select one or many assets, and return their URLs to the caller.
**Language / Size:** TSX / 9483 bytes

## Exports
- `MediaLibraryDialog(props: MediaLibraryDialogProps)` (named component).

## Imports (Internal / External)
- Internal: `getMediaList, type IMediaFile` from `../../services/media`; `getProducts` from `../../services/products`; UI `Dialog…`, `Button`, `Input`, `Select…`.
- External: `useState` (react); `useQuery` (@tanstack/react-query); icons `Search, Image as ImageIcon, Video as VideoIcon, Check, FileQuestion` (lucide-react).

## Props
- `open: boolean`, `onOpenChange: (open:boolean)=>void`, `onSelect: (urls: string | string[])=>void`, `multiple?: boolean` (default false), `accept?: string` (default `'image/*,video/*'`).

## State / Refs / Context consumed
- State: `search`, `selectedUrls: string[]`, `productFilter` (default `'all'`).
- No context.

## Hooks & Effects (deps, purpose)
- `useQuery(['products', { limit: 100 }])` → `getProducts({ limit: 100 })` (`enabled: open`; distinct key avoids colliding with the default 1000-item `['products']` cache).
- `useQuery<IMediaFile[]>(['mediaList'])` → `getMediaList` (`enabled: open`).

## Functions & handlers
- `getMediaType(mime)`: gif / image / video / other.
- `isAccepted(item)`: matches media type against `accept` (wildcards, `image/*`, `video/*`, `gif`).
- `filteredMedia`: `isAccepted` → filename contains `search` → product filter (`references.some(ref => ref.productId === productFilter)` unless 'all').
- `handleMediaClick(url)`: toggles in `selectedUrls` when `multiple`, else replaces with single.
- `handleSelectConfirm()`: no-op if none; calls `onSelect(array | single)`, closes, resets selection.
- `handleClose()`: closes and clears selection.

## Rendered UI
- `Dialog`/`DialogContent` (`max-w-4xl h-[80vh]`): header, search input + product `Select`, a responsive media grid (skeletons while loading; `FileQuestion` empty state), and a footer with selection count + Cancel / Select Media buttons.
- Grid cell: image thumbnail, video (icon + faded muted preview), or file fallback; selected cells show a ring + check overlay; filename appears on hover.

## Important logic & design patterns
- Queries gated on `open` so nothing fetches until shown.
- Deliberately distinct products query key to avoid cache collision with list views.
- Single vs multi-select governed by `multiple`; `onSelect` receives a string or string[] accordingly.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No app contexts. A controlled dialog invoked by feature forms/pages (not an App.tsx global surface). Depends on media + products services.
