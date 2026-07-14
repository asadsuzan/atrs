# `client/src/pages/Login.tsx`

**Purpose:** Sign-in page. Authenticates the user via `AuthContext.login`, then redirects to the originally-requested page (or `/`).

**Language / Size:** TypeScript(React) / 3431 bytes

## Route
- Mounted in `App.tsx` at `path="/login"` wrapped in `<PublicOnly>` (redirects authenticated users to `/`). Eagerly imported (not lazy) so auth pages load before the heavy app shell.

## Exports
- **Default export:** `Login()`.
- No named exports.

## Imports (Internal / External)
**Internal:**
- `useAuth` from `@/contexts/AuthContext`
- `Button` (`@/components/ui/button`), `Input` (`@/components/ui/input`), `PasswordInput` (`@/components/ui/PasswordInput`), `Label` (`@/components/ui/label`)
- `playSound` from `@/lib/sound`
- `APP_VERSION` from `@/data/changelog`

**External:**
- `react` (`useState`)
- `react-router-dom` (`useNavigate, Link, useLocation`)
- `sonner` (`toast`)
- `lucide-react` (`Sparkles`)

## State / Hooks / Contexts
- `useAuth()` → `{ login }`.
- `useNavigate()` → `navigate`; `useLocation()` → `location`.
- `useState('')` → `email`, `password`.
- `useState(false)` → `submitting`.
- `from = (location.state as any)?.from?.pathname || '/'` — the path the user was redirected from (set by `ProtectedLayout`'s `<Navigate state={{ from: location }}>`).

## Services & data (query keys, mutations, endpoints hit)
- `login(email, password)` from `AuthContext` (which calls the auth service / login endpoint). No react-query.

## Behavior / Rendering
- Centered card: "A" logo + "ATRS", "Welcome back" heading.
- Form: email `Input` (autoFocus, required), password `PasswordInput` (required) with a "Forgot password?" link to `/forgot-password`, and a submit `Button` showing "Signing in…" while `submitting`.
- Below: "Don't have an account? Sign up" link to `/register`.
- Below the card: a "What's new · v{APP_VERSION}" link to `/changelog` (Sparkles icon).
- **`handleSubmit(e)`** — `preventDefault`; set `submitting`; `await login(...)`; on success `playSound('success')` and `navigate(from, { replace: true })`; on error `playSound('error')` and `toast.error(err?.response?.data?.message || 'Login failed')`; `finally` clears `submitting`.

## Important logic / algorithms
- **Return-to-origin redirect:** reads `location.state.from.pathname` to send the user back to their intended destination after login, defaulting to `/`. `replace: true` avoids leaving `/login` in history.
- **Error surfacing:** prefers the server message (`err.response.data.message`) with a generic fallback.

## Relationships
- `contexts/AuthContext` → `login` (token/session establishment; `App.tsx`'s `PublicOnly`/`ProtectedLayout` react to the resulting `user`).
- `data/changelog` → `APP_VERSION` (also used by `App.tsx`, `AppChangelog`).
- Links to `/forgot-password` (`ForgotPassword`), `/register` (`Register`), `/changelog` (`AppChangelog`).

## Edge cases & known limitations
- On success it does not itself handle `mustChangePassword` — that redirect to `/set-password` is enforced downstream by `ProtectedLayout` in `App.tsx`.
- No client-side validation beyond `required`; server errors drive the toast.
- `location.state` is loosely typed (`as any`).
