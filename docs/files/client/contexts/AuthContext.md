# `client/src/contexts/AuthContext.tsx`
**Purpose:** Authentication context — holds the current user, exposes login/register/logout/refresh, and bootstraps the session from a stored token on mount.
**Language / Size:** TSX / 2133 bytes

## Exports (Provider, hook, types, functions)
- `AuthProvider({ children }: { children: React.ReactNode })` — provider component.
- `useAuth()` — hook returning `AuthContextValue`; throws `'useAuth must be used within an AuthProvider'` if outside.
- `AuthContextValue` — interface (internal, not exported).

## Imports (Internal / External)
Internal:
- `getMe`, `login as loginApi`, `register as registerApi`, `type AuthUser` from `@/services/auth`
- `getToken`, `setToken`, `clearToken` from `@/services/api`

External:
- `react` (`createContext`, `useContext`, `useEffect`, `useState`, `useCallback`)

## Context shape (the value object)
```ts
interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;                                          // derived: user?.role === 'admin'
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<{ message: string }>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}
```

## State managed & how it's updated
- `user: AuthUser | null` (`useState`, init `null`) — the current user; set by `refreshMe` (from `getMe`), `login`, cleared by `logout` and on refresh failure.
- `loading: boolean` (`useState`, init `true`) — true until the initial `refreshMe` settles.
- `isAdmin` — not state; computed inline in the value as `user?.role === 'admin'`.

## Hooks & Effects (deps, purpose, WHY)
- `refreshMe = useCallback(async () => …, [])` — if no token: clear user, `loading=false`, return. Else `getMe()`; on success set user; on error `clearToken()` + null user; `finally` `loading=false`.
- `useEffect(() => { refreshMe(); }, [refreshMe])` — bootstraps auth once on mount (refreshMe is stable via empty deps).
- `login = useCallback(...)` — calls `loginApi`, `setToken(token)`, `setUser(u)`, returns user.
- `register = useCallback(...)` — calls `registerApi`, returns its result (does not log in).
- `logout = useCallback(...)` — `clearToken()`, `setUser(null)`.

## Functions (purpose, algorithm, side effects)
See hooks above. Side effects: token read/write/clear via the api-service token helpers; network calls to auth endpoints.

## Consumed by
`useAuth`: `App.tsx`, `components/layout/CommandPalette.tsx`, `components/onboarding/GetStarted.tsx`, `components/reports/PresentationMode.tsx`, `pages/Activities.tsx`, `pages/AuditLogs.tsx`, `pages/FeatureRequests.tsx`, `pages/Help.tsx`, and others (also `NotificationContext` consumes it internally). Not exhaustively listed.

## Important logic & design patterns
- Token is the source of truth for "logged in"; `refreshMe` short-circuits when absent.
- All action callbacks memoized with `useCallback([])` for stable identity.
- `register` intentionally does not set a token/user (registration likely requires approval — see notification password/access flows).
