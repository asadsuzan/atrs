# `client/src/components/versions/VersionManager.tsx`
**Purpose:** CRUD manager for a product's versions: a searchable/filterable/paginated table (with author avatars and status badges), an add/edit dialog, deep-linkable status filter, and a "Sync from GitHub" action that pulls GitHub Releases into versions.
**Language / Size:** TypeScript(React) / 14524 bytes

## Exports
- `VersionManager({ productId, wpData?, githubUrl? })` (named component).

## Props
- `productId: string`.
- `wpData?: any` — WP.org data; used to map contributor usernames → avatar URLs.
- `githubUrl?: string` — enables the GitHub sync button when it includes `github.com`.

## State / Hooks
- `isOpen`, `editingVersion`, `formData` ({ label, notes, status, releasedAt, author }), `statusFilter`, `search`, `page`, `limit`.
- `useProductVersions(productId)` → `{ versions, isLoading }` (single source: decorated + canonically ordered, exactly one `isLatest`).
- `useSearchParams()` — reads `?versionStatus=` to seed/sync `statusFilter` (unreleased/released).
- Mutations (sound + toast + invalidate `['versions', productId]`): `createVersion`, `updateVersion`, `deleteVersion`, and `syncMutation`(`syncProductReleases(productId)` → toasts created/updated/total from `res`).
- `useConfirm()` for delete; effects clamp `page` and reset it on filter/search change.

## Behavior / Rendering
- Header: "Sync from GitHub" (when `githubUrl` is a github URL) + "Add Version".
- Toolbar: search input (matches label/author/plain-text notes) + status `Select` (all/released/unreleased).
- Table: Label / Status / Release Date / Author / Notes / Actions. Loading → 5 `TableRowSkeleton` (cols=6); empty and filtered-empty states. Status cell shows `VersionBadge` (unreleased vs released) plus a `latest` badge when `isLatest`. Author cell uses `AuthorAvatar` with a WP.org avatar when the author matches a contributor. Actions: edit, delete (confirm-gated). `Pagination` when results exist.
- Add/Edit dialog: label (required), status select (released/unreleased), release date (`DatePicker`, only when released), author, release notes (`RichTextEditor`).

## Important logic / algorithms
- Filtering (`statusFilter` + case-insensitive `search` across label/author/notes) then client-side pagination (`slice`).
- `handleSubmit`: an unreleased version sends `releasedAt: null` (clears any date); released sends the date or `undefined`. Routes to update (`{ id, productId, ...payload }`) or create.
- `contribAvatars`/`avatarFor`: lowercase-keyed map of `wpData.contributors[*].avatar` for exact WP.org author avatars.
- Status/date are the source-of-truth for a version's released/unreleased state; the manager relies on `useProductVersions` for ordering and the `isLatest` flag rather than re-deriving.

## Relationships
- Services: `versions` (create/update/delete), `github` (`syncProductReleases`). Hook: `useVersions` (single source). UI: `VersionBadge`, `AuthorAvatar`, `Pagination`, `RichTextEditor`, `DatePicker`. Contexts: `ConfirmContext`. Sound via `@/lib/sound`.

## Edge cases & known limitations
- `wpData`/version rows are typed `any`.
- GitHub sync depends on a parseable `github.com` URL and server support; errors surface `err.response.data.message`.
- Filtering/pagination are client-side over the full decorated list.
