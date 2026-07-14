# `client/src/pages/admin/Users.tsx`

**Purpose:** Admin-only user management. Lists users (pending approvals separated from the rest), and provides approve/suspend/reactivate, role toggle (admin↔user), admin-driven password reset, and destructive user+data deletion (streamed job).

**Language / Size:** TypeScript(React) / 12809 bytes

## Route
- Mounted in `App.tsx` at `path="/users"` as `<RequireAdmin><Users /></RequireAdmin>`, inside `ProtectedLayout`. `RequireAdmin` redirects non-admins to `/`. Lazy-loaded (`./pages/admin/Users`).

## Exports
- **Default export:** `Users()`.
- No named exports.
- Module-local (not exported): `statusVariant` (status→class map), `Row` (in-component sub-component).

## Imports (Internal / External)
**Internal:**
- `getUsers, approveUser, suspendUser, reactivateUser, setUserRole, resetUserPassword` from `@/services/users`
- type `AuthUser` from `@/services/auth`
- shadcn UI: `Button`, `Badge`, `Input`, `Label`; `Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter`
- `useConfirm` from `@/contexts/ConfirmContext`
- `useJobStream` from `@/contexts/JobStreamContext`
- `playSound` from `@/lib/sound`
- `UsersTableSkeleton` from `@/components/ui/skeletons`
- `Pagination` from `@/components/ui/Pagination`

**External:**
- `react` (`useState, useEffect`)
- `@tanstack/react-query` (`useQuery, useMutation, useQueryClient`)
- `sonner` (`toast`)
- `lucide-react` icons: `ShieldCheck, UserCheck, UserX, Trash2, Crown, KeyRound, RefreshCw, Copy, Check`

## State / Hooks / Contexts
**Context/clients:** `useQueryClient()` → `queryClient`; `useConfirm()` → `confirm`; `useJobStream()` → `runJob`.

**useState:**
- `resetTarget: AuthUser | null` — user being reset (opens the reset dialog).
- `newPassword` — the reset password value (typed or generated).
- `copied` — clipboard-copied checkmark flag.
- `resetting` — reset submit in-flight.
- `othersPage` (1), `othersLimit` (10) — client-side pagination for the main table.

**useEffect:**
- `useEffect(..., [othersPage, othersTotalPages])` — clamps `othersPage` down to `othersTotalPages` if the current page exceeds the total (e.g. after items leave the list).

## Services & data (query keys, mutations, endpoints hit)
**Query:**
- `['users']` → `getUsers()` → `AuthUser[]` (default `[]`).

**Mutations (react-query `useMutation`):**
- `approve` → `approveUser`
- `suspend` → `suspendUser`
- `reactivate` → `reactivateUser`
- `role` → `({ id, r }) => setUserRole(id, r)`
- `resetUserPassword(id, password)` — called directly (not via a declared mutation) in `submitReset`.

**Streamed job (not react-query):**
- `handleDelete` → `runJob({ title, url: `/users/${id}/delete-stream`, noun: 'product', onDone })` — a server-sent streaming delete of the user and all their data; `onDone` invalidates `['users']` and `['products']`.

## Behavior / Rendering
- **Header:** "Users" title + subtitle.
- **Loading:** `UsersTableSkeleton`.
- **Pending approval table** (only if `pending.length > 0`): amber header with count, headerless table of pending `Row`s.
- **Main users table:** headers User/Role/Status/(actions). Shows `pagedOthers`; "No active users yet." when `others` empty.
- **Pagination** (when `others.length > 0`): `Pagination` bound to `othersPage`/`othersLimit`; changing limit resets to page 1.
- **Reset-password `Dialog`** (open when `resetTarget`): text input for the new password with a copy button, a "Generate a strong password" link, and Cancel / "Set new password" (disabled while resetting or `newPassword.length < 8`).

**`Row({ u })`** renders per user:
- Name (+ amber `Crown` if `u.isRoot`) and email.
- Role `Badge` (primary-styled when admin).
- Status pill (color from `statusVariant`) + a "Reset requested" amber pill when `u.passwordResetRequested`.
- Actions (right-aligned): if `u.isRoot` → "Protected" (no actions). Else context-dependent buttons: **Approve** (status pending), **Suspend** (active), **Reactivate** (suspended), **Make user/Make admin** (role toggle), **Reset password** (opens dialog), and a red **Trash** delete.

**Helpers:**
- `invalidate()` — invalidates `['users']`.
- `run(fn, success, sound='success')` — runs an async action; on success plays sound, toasts `success`, invalidates; on error plays `'error'` and toasts `err?.response?.data?.message || 'Action failed'`. Used by approve/suspend/reactivate/role buttons via `*.mutateAsync`.
- `generatePassword()` — builds a 16-char password from a fixed charset using `crypto.getRandomValues(Uint32Array(16))` (each value mod charset length); resets `copied`.
- `copyPassword()` — `navigator.clipboard.writeText`, sets `copied` true for 2000ms.
- `closeReset()` — resets all reset-dialog state.
- `submitReset()` — validates `newPassword.length >= 8`; sets `resetting`; `await resetUserPassword(resetTarget._id, newPassword)`; on success plays sound, toasts, `invalidate()` (clears the "Reset requested" badge), `closeReset()`; on error toasts and re-enables (`setResetting(false)`).
- `handleDelete(u)` — `confirm(...)` (destructive copy: removes user AND all their products/changelogs/versions/marketing/files); on confirm launches the streamed delete job.

**Derived:** `pending = users.filter(status==='pending')`; `others = users.filter(status!=='pending')`; `othersTotalPages = max(1, ceil(others.length/othersLimit))`; `pagedOthers = others.slice(...)`.

## Important logic / algorithms
- **Root protection:** `u.isRoot` users show a Crown and "Protected" — no mutating actions rendered for them.
- **Cryptographically-random password generation** using `crypto.getRandomValues` over a curated charset (ambiguous characters like O/0/1/l excluded).
- **Two data-mutation patterns:** ordinary actions via `run` + `mutateAsync` (optimistic-ish: invalidate on success); deletion via the JobStream streaming endpoint because it cascades across many collections/files.
- **Page clamping effect** prevents landing on an out-of-range page after the list shrinks.
- **"Reset requested" workflow:** `passwordResetRequested` (set by `ForgotPassword`'s request flow) surfaces a badge; completing a reset invalidates to clear it.

## Relationships
- `services/users` → approve/suspend/reactivate/setUserRole/resetUserPassword/getUsers.
- `services/auth` → `AuthUser` type.
- `contexts/JobStreamContext` (`runJob`) → streamed delete at `/users/:id/delete-stream`.
- `contexts/ConfirmContext` (`confirm`) → destructive confirmation.
- Downstream of `Register.tsx` (creates pending users) and `ForgotPassword.tsx` (sets `passwordResetRequested`); admin-issued temp passwords lead users into `SetPassword.tsx` (`mustChangePassword`).
- `App.tsx` `RequireAdmin` gates access.

## Edge cases & known limitations
- Pagination is client-side over the full `getUsers()` result — no server paging; large user counts fetch everything.
- The reset password is displayed in plaintext (type="text") and only shown once — admins must share it securely (per dialog copy).
- `resetUserPassword` is invoked directly rather than through a declared `useMutation`, so it has no react-query cache/dedupe (it manually invalidates via `invalidate()`).
- Deletion is irreversible and cascades; guarded only by the confirm dialog.
- No search/filter for the users list.
