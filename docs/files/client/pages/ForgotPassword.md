# `client/src/pages/ForgotPassword.tsx`

**Purpose:** Password-reset request flow. Because only admins can reset passwords in ATRS, this page verifies the email exists, then lets the user submit a reset *request* that notifies an administrator (it does NOT send a reset link).

**Language / Size:** TypeScript(React) / 5547 bytes

## Route
- Mounted in `App.tsx` at `path="/forgot-password"` wrapped in `<PublicOnly>` — redirects to `/` if already authenticated. Auth page kept eager (not lazy) in `App.tsx`.
- Reached from `Login.tsx` via the "Forgot password?" link.

## Exports
- **Default export:** `ForgotPassword()`.
- No named exports.
- Module-local type: `Stage = 'enter-email' | 'found' | 'not-found' | 'requested'`.

## Imports (Internal / External)
**Internal:**
- `Button` (`@/components/ui/button`), `Input` (`@/components/ui/input`), `Label` (`@/components/ui/label`)
- `checkEmail, requestPasswordReset` from `@/services/auth`
- `playSound` from `@/lib/sound`

**External:**
- `react` (`useState`)
- `react-router-dom` (`Link`)
- `lucide-react` icons: `KeyRound, ArrowLeft, UserCheck, MailQuestion, CheckCircle2, Loader2`

## State / Hooks / Contexts
- `useState('')` → `email`.
- `useState<Stage>('enter-email')` → `stage` (a 4-state machine driving which panel renders).
- `useState('')` → `foundName` (name returned when the account exists).
- `useState(false)` → `busy` (in-flight flag disabling buttons + showing spinners).
- No contexts, no react-query (uses raw service calls).

## Services & data (query keys, mutations, endpoints hit)
- `checkEmail(email)` → `{ exists, name }` (from `services/auth`) — called in `handleCheck`.
- `requestPasswordReset(email)` (from `services/auth`) — called in `handleRequest`.
- No query keys/mutations (plain async calls, no react-query).

## Behavior / Rendering
Single card that swaps content by `stage`:
1. **`enter-email`** (initial): KeyRound icon, email form. Submit → `handleCheck`.
2. **`not-found`**: amber MailQuestion, "No account found" for `{email}`, "Try a different email" button → back to `enter-email`.
3. **`found`**: UserCheck, "Account found[: name]", explains only an admin can reset; "Request password reset" button → `handleRequest`.
4. **`requested`**: green CheckCircle2, "Request sent" confirmation.
- A persistent "Back to sign in" link (`/login`) appears in all stages.

**Handlers:**
- `handleCheck(e)` — `preventDefault`; no-op if email blank; sets `busy`; calls `checkEmail`. If `exists`: stores name, `stage='found'`, `playSound('success')`. Else `stage='not-found'`, `playSound('error')`. On thrown error, falls to `not-found` (no sound). Always clears `busy` in `finally`.
- `handleRequest()` — sets `busy`; `await requestPasswordReset`; `stage='requested'`, `playSound('success')`; clears `busy` in `finally` (no explicit catch — an error would reject unhandled but still clear busy).

## Important logic / algorithms
- **Stage machine:** the whole UI is driven by a single `Stage` union; there are no separate routes for each step.
- **Admin-mediated reset by design:** this page never emails a reset token. `found` explains an admin will set a temporary password; the user later completes the change on `SetPassword` after signing in with `mustChangePassword`.
- **Fail-safe on check error:** a `checkEmail` failure is treated as "not found" so the flow degrades gracefully rather than showing a raw error.

## Relationships
- `services/auth` → `checkEmail`, `requestPasswordReset`.
- `lib/sound` → `playSound` for success/error cues.
- Pairs with `SetPassword.tsx` (the forced change after an admin issues a temp password) and `admin/Users.tsx` (where admins fulfill the request — the "Reset requested" badge there is driven by `passwordResetRequested`).

## Edge cases & known limitations
- Reveals whether an email is registered (account enumeration) — the `found`/`not-found` distinction is intentional UX but leaks existence.
- `handleRequest` has no `catch`: a failed request rejects (unhandled) though `busy` still resets; the user sees no explicit error toast for that specific call.
- No rate limiting client-side; relies on backend.
