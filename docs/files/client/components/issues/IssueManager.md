# `client/src/components/issues/IssueManager.tsx`
**Purpose:** Full issue-tracker panel for a single product: summary stats, a public-page publish toggle, a filterable/paginated issues table, deep-link focus, and an add/edit dialog. Also approves public-submitted issues for publication.
**Language / Size:** TypeScript(React) / 25760 bytes

## Exports
- `IssueManager({ productId, focusIssueId?, onFocusHandled? })` (named component).
- `STATUS_BADGE: Record<IssueStatus, string>` and `SEVERITY_BADGE: Record<IssueSeverity, string>` — exported class-name maps reused elsewhere.

## Props
- `productId: string` — the product whose issues are managed.
- `focusIssueId?: string | null` — an issue to scroll to and briefly highlight (deep-link from a changelog card).
- `onFocusHandled?: () => void` — callback fired once the focus target has been located/handled.

## State / Hooks
- Local: `isOpen` (create dialog), `editingIssue`, `formData` (seeded from `emptyForm`), `statusFilter` ('all' default), `copiedUrl`, `page`, `limit`.
- Queries: `useQuery(['product', productId])` (for name + `publicIssuesEnabled`); `useQuery(['issues', productId])`; `useQuery(['versions', productId])` → `versionLabels`.
- Mutations (all play sound + toast, then invalidate): `createMutation`(`createIssue`), `updateMutation`(`updateIssue`), `deleteMutation`(`deleteIssue`), `approveMutation`(`updateIssue({id, needsReview:false})`), `publishMutation`(`updateProduct({publicIssuesEnabled})` — invalidates `['product', productId]`).
- `useConfirm()` for delete confirmation; `useQueryClient` for `invalidate()`.
- Effects: clamp `page` to `totalPages`; reset `page` to 1 on filter change; clear filter to 'all' when `focusIssueId` set; a focus effect that finds the issue index, jumps to its page, then after 80ms `scrollIntoView` + adds/removes a temporary `ring-2 ring-primary ring-inset` highlight (2s), then calls `onFocusHandled`.

## Behavior / Rendering
- Header + three stat cards: open / in-progress / resolved(+closed) counts derived from `allIssues`.
- Public issues card: a switch calling `publishMutation`; when published shows the `${origin}/issues/${productId}` URL with copy (`navigator.clipboard`) and open-in-new-tab buttons.
- Toolbar: status `Select` filter + "Report Issue" button.
- Table (`Table` primitives): columns Issue / Severity / Status / Version / Reporter / Found / Actions. Loading → 5 `TableRowSkeleton` rows (cols=7); empty → prompt; filtered-empty → message. Each row (`id="issue-<id>"`) shows title with optional "Needs review" badge, a "public" marker (`issue.source === 'public'`), attachment count, plain-text description, and up to 4 media thumbnails (`isVideoUrl` → paperclip placeholder else `<img>`, "+N" overflow). Actions: approve (only when `needsReview`), edit, delete (confirm-gated).
- `Pagination` below the table when `filtered.length > 0`.
- Add/Edit `Dialog`: title, description (RichTextEditor), severity + status selects, affected-version select (keeps a stale label selectable), reporter, date-found (`DatePicker`), attachments (`MediaUploader` multiple). Submit routes to update or create.

## Important logic / algorithms
- Client-side filtering (`statusFilter`) then client-side pagination (`slice`).
- `handleSubmit` builds payload with `foundAt || undefined`; edit sends `{ id, productId, ...payload }`.
- Local `Badge` helper component; `STATUS_LABEL`/`STATUS_OPTIONS`/`SEVERITY_OPTIONS` constants; `isVideoUrl` regex `/\.(mp4|webm|ogg)$/i`.
- AI assist: `SuggestTitleButton` / `GenerateDescriptionButton` with context (product name, severity, versionLabel, existing description).

## Relationships
- Services: `issues` (get/create/update/delete), `products` (getProductById/updateProduct), `versions` (getVersions). Contexts: `ConfirmContext`. Sound via `@/lib/sound`. Consumes the shared `focusIssueId` deep-link contract used by changelog cards. The public page it publishes to is `/issues/:productId`.

## Edge cases & known limitations
- Pagination and filtering are entirely client-side — large issue lists load fully.
- Approve/publish rely on `updateIssue`/`updateProduct` shapes; `needsReview` is the review-queue flag (see review-queue memory).
- Version select preserves a previously-set label even if its version was deleted, to avoid data loss on edit.
