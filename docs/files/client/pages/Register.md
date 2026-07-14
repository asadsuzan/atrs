# `client/src/pages/Register.tsx`

**Purpose:** Account sign-up page. Creates a new account (pending admin approval) via `AuthContext.register`, then shows an "awaiting approval" confirmation.

**Language / Size:** TypeScript(React) / 3866 bytes

## Route
- Mounted in `App.tsx` at `path="/register"` wrapped in `<PublicOnly>` (authenticated users redirect to `/`). Eagerly imported (auth page).
- Reached from `Login.tsx` ("Sign up") and `Register`'s own "Sign in" link.

## Exports
- **Default export:** `Register()`.
- No named exports.

## Imports (Internal / External)
**Internal:**
- `useAuth` from `@/contexts/AuthContext`
- `Button` (`@/components/ui/button`), `Input` (`@/components/ui/input`), `PasswordInput` (`@/components/ui/PasswordInput`), `Label` (`@/components/ui/label`)
- `playSound` from `@/lib/sound`

**External:**
- `react` (`useState`)
- `react-router-dom` (`Link`)
- `sonner` (`toast`)
- `lucide-react` (`CheckCircle2`)

## State / Hooks / Contexts
- `useAuth()` → `{ register }`.
- `useState('')` → `name`, `email`, `password`.
- `useState(false)` → `submitting`, `done`.
- No react-query, no navigation (stays on page, swaps to success panel).

## Services & data (query keys, mutations, endpoints hit)
- `register(name, email, password)` from `AuthContext` (calls the auth service / register endpoint). No react-query.

## Behavior / Rendering
- Centered card with "A" logo + "ATRS".
- **When `done`:** green CheckCircle2, "Registration successful", message that the account awaits admin approval, and a "Back to sign in" button (`/login`).
- **Otherwise:** "Create your account" heading, note that accounts need admin approval, and a form with Name (autoFocus, required), Email (required, type email), Password (`PasswordInput`, required, `minLength={8}`, "At least 8 characters." hint), and a submit button showing "Creating…" while `submitting`. Below: "Already have an account? Sign in" link.
- **`handleSubmit(e)`** — `preventDefault`; set `submitting`; `await register(...)`; on success `playSound('success')` and `setDone(true)`; on error `playSound('error')` + `toast.error(err?.response?.data?.message || 'Registration failed')`; `finally` clears `submitting`.

## Important logic / algorithms
- **Approval-gated onboarding:** success does NOT log the user in — it flips to the `done` panel explaining the account is pending admin approval (fulfilled in `admin/Users.tsx`). This matches `Help.tsx`'s "New accounts must be approved by an administrator".
- **Client-side password floor:** `minLength={8}` on the input (HTML validation); server enforces the real policy.
- **Error surfacing:** prefers server message with a generic fallback.

## Relationships
- `contexts/AuthContext` → `register`.
- `admin/Users.tsx` — admins later approve the pending account created here (pending users appear in its "Pending approval" table).
- Links to `/login` (`Login`).

## Edge cases & known limitations
- No inline field validation beyond HTML `required`/`minLength`; relies on server response for duplicates/policy.
- After success the form fields remain in state but are unmounted (success panel shown); no auto-navigation.
- `err` is loosely typed (`as any`).
