# `client/src/pages/FeatureRequests.tsx`

**Purpose / Route:** Feature requests page mounted at `/feature-requests`. Users submit feature ideas for ATRS; admins triage them by setting a status and leaving an optional response note. Users can withdraw their own pending requests; admins can delete any.
**Language / Size:** TSX / 12408 bytes

## Exports
- `default function FeatureRequests()` — the page component.

## Imports (Internal / External)
**External:**
- `react` — `useState`
- `@tanstack/react-query` — `useQuery`, `useMutation`, `useQueryClient`
- `sonner` — `toast`
- `date-fns` — `format`
- `lucide-react` — `Lightbulb`, `Plus`, `Trash2`, `MessageSquare`, `User`

**Internal (services):**
- `../services/featureRequests` — `getFeatureRequests`, `createFeatureRequest`, `updateFeatureRequest`, `deleteFeatureRequest`, types `FeatureRequest`, `FeatureRequestStatus`

**Internal (contexts):**
- `../contexts/AuthContext` — `useAuth`
- `../contexts/ConfirmContext` — `useConfirm`

**Internal (components):**
- `../components/layout/PageTransition` — `PageTransition` (default)
- `@/components/ui/card` — `Card`
- `@/components/ui/button` — `Button`
- `@/components/ui/input` — `Input`
- `@/components/ui/textarea` — `Textarea`
- `@/components/ui/badge` — `Badge`
- `@/components/ui/select` — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `@/components/ui/dialog` — `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`
- `@/components/ui/skeleton` — `Skeleton`

## Component tree & sub-components defined
**Module-level constants/helpers:**
- `STATUS_META: Record<FeatureRequestStatus, {label, className}>` — badge label + Tailwind class per status (pending/planned/in-progress/done/declined).
- `STATUS_ORDER: FeatureRequestStatus[]` = `['pending','planned','in-progress','done','declined']`.
- `requesterName(r)` — returns `r.requesterId.name` when `requesterId` is an object, else `''`.

**Render tree:** `PageTransition` → header (title + description that varies by admin/user + "New request" button) → loading skeletons / empty state Card / list of request Cards → "New request" `Dialog` → "Admin response" `Dialog`. No in-file sub-components.

## State / Refs / Context consumed
**Local state:**
- `formOpen` (bool) — new-request dialog open.
- `title`, `description` (strings) — new-request form fields.
- `noteTarget` (`FeatureRequest | null`) — request being responded to (opens admin note dialog).
- `noteDraft` (string) — admin note textarea content.

**Context:** `user`, `isAdmin` (AuthContext); `confirm` (ConfirmContext); `queryClient`.

## Hooks & Effects (deps, purpose, WHY)
- No `useEffect`. `invalidate()` helper invalidates `['feature-requests']`.

## Data fetching (services/endpoints; react-query keys/mutations)
- **Query** `['feature-requests']` → `getFeatureRequests` (default `requests = []`).
- **Mutation** `createMutation` → `createFeatureRequest`; success toast, closes form, clears title/description, invalidates; error toast from `err?.response?.data?.message`.
- **Mutation** `updateMutation` → `updateFeatureRequest`; success toast, clears `noteTarget`, invalidates; used both for status changes and admin note saves.
- **Mutation** `deleteMutation` → `deleteFeatureRequest`; success toast, invalidates; error toast.

## Event handlers & key functions
- `handleSubmit()` — validates `title.trim().length >= 3` (else error toast), then `createMutation.mutate({ title, description|undefined })`.
- `handleDelete(r)` — determines if request is the current user's own; confirm dialog title is "Withdraw this request?" when it's the user's own pending request, else "Delete this request?"; on confirm `deleteMutation.mutate(r._id)`.
- `canDelete(r)` — `true` for admins; otherwise only when `r.status === 'pending'` (users can withdraw only pending requests).
- Status `Select` `onValueChange` → `updateMutation.mutate({ id, status })` (admin only).
- Admin note dialog save → `updateMutation.mutate({ id: noteTarget._id, adminNote: noteDraft.trim() })`.

## Rendered UI sections
- Header: `Lightbulb` title; description text branches on `isAdmin`; "New request" button.
- Loading: 3 skeleton Cards. Empty: centered Card with "Request a feature" CTA.
- Request list: per-request Card showing title, status Badge (`STATUS_META`), description (whitespace-pre-wrap), requester name (admin only) + created date (`format 'MMM d, yyyy'`), admin response block (when `adminNote` set). Right side: admin status `Select` + respond button; delete/withdraw button gated by `canDelete`.
- New request Dialog: title `Input` (maxLength 200), description `Textarea` (rows 5, maxLength 5000), Cancel/Submit.
- Admin response Dialog: `Textarea` (rows 4, maxLength 2000), Cancel/Save; description names the requester and request title.

## Important logic & design patterns
- Role-based UI: `isAdmin` gates status select, response button, requester name, and delete permissions; non-admins see a user-facing copy and can only withdraw their own pending requests.
- Ownership check compares `r.requesterId` (object or id) against `user?._id`.
- Single `updateMutation` reused for both status and admin-note updates.
- Error messages surfaced from API response (`err?.response?.data?.message`) with fallbacks.
- Client-side title validation before submit.

## Relationships
- Consumes AuthContext (role + identity) and ConfirmContext (destructive confirmation).
- All data via `../services/featureRequests`; the `FEATURE_REQUEST` entity also appears in AuditLogs entity-type filter, indicating server-side audit logging of these actions.
- Self-contained page — no cross-links to other routes.
