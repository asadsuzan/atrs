# `client/src/pages/SetPassword.tsx`

**Purpose:** Forced password change after an admin issues a one-time/temporary password. The user enters the temp password and chooses a new one. Self-gated: only reachable by an authenticated user whose account has `mustChangePassword`.

**Language / Size:** TypeScript(React) / 4458 bytes

## Route
- Mounted in `App.tsx` at `path="/set-password"` **without** a `PublicOnly`/`ProtectedLayout` wrapper — the component gates itself (see below). `App.tsx`'s `ProtectedLayout` also redirects any `mustChangePassword` user here.
- Eagerly imported (auth-adjacent).

## Exports
- **Default export:** `SetPassword()`.
- No named exports.

## Imports (Internal / External)
**Internal:**
- `useAuth` from `@/contexts/AuthContext`
- `Button` (`@/components/ui/button`), `PasswordInput` (`@/components/ui/PasswordInput`), `Label` (`@/components/ui/label`)
- `playSound` from `@/lib/sound`
- `changePassword` from `@/services/auth`

**External:**
- `react` (`useState`)
- `react-router-dom` (`Navigate, useNavigate`)
- `sonner` (`toast`)
- `lucide-react` icons: `ShieldCheck, LogOut, Loader2`

## State / Hooks / Contexts
- `useAuth()` → `{ user, loading, refreshMe, logout }`.
- `useNavigate()` → `navigate`.
- `useState('')` → `currentPassword`, `newPassword`, `confirm`.
- `useState(false)` → `submitting`.

## Services & data (query keys, mutations, endpoints hit)
- `changePassword(currentPassword, newPassword)` from `services/auth`. No react-query.
- `refreshMe()` from `AuthContext` (re-fetches the current user so `mustChangePassword` clears).

## Behavior / Rendering
**Self-gating (before any hooks that follow are irrelevant — these are early returns after state hooks):**
- `if (loading) return null;`
- `if (!user) return <Navigate to="/login" replace />;`
- `if (!user.mustChangePassword) return <Navigate to="/" replace />;` — users who don't need a change are bounced home.

**UI:** centered card, ShieldCheck badge, "Choose a new password" explanation. Form fields: Temporary password (`autoFocus`, `autoComplete="current-password"`), New password (`autoComplete="new-password"`, placeholder "At least 8 characters"), Confirm new password. Submit button shows "Updating…" spinner while `submitting`. A "Sign out" button (`logout()` then `navigate('/login', { replace })`).

**`handleSubmit(e)`** — `preventDefault`; validates `newPassword.length >= 8` (toast error otherwise) and `newPassword === confirm` (toast error otherwise); sets `submitting`; `await changePassword(...)`; on success `playSound('success')`, toast "Password updated — welcome back!", `await refreshMe()`, `navigate('/', { replace: true })`; on error `playSound('error')` + `toast.error(err?.response?.data?.message || 'Failed to update password')`; `finally` clears `submitting`.

## Important logic / algorithms
- **Three-way self-gate** ensures the page is only usable in the intended state (authenticated + `mustChangePassword`), redundantly with `ProtectedLayout`'s redirect so a direct URL hit still behaves.
- **Client-side validation** of length (≥8) and match before calling the API.
- **`refreshMe` before navigating** so the freshly-cleared `mustChangePassword` flag propagates and `ProtectedLayout` won't bounce the user straight back.

## Relationships
- `contexts/AuthContext` → `user`, `loading`, `refreshMe`, `logout`.
- `services/auth` → `changePassword`.
- Complements `ForgotPassword.tsx` (requests the reset) and `admin/Users.tsx` (admin sets the temp password / issues `mustChangePassword`), and `App.tsx`'s `ProtectedLayout` (which routes such users here).

## Edge cases & known limitations
- Returns `null` during `loading` (blank screen briefly) rather than a skeleton.
- Validation floor is 8 chars client-side; server enforces the real policy and verifies the temp password.
- If `refreshMe` still reports `mustChangePassword` (e.g. server didn't clear it), `ProtectedLayout` would redirect back to `/set-password` after navigation.
