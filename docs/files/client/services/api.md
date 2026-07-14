# `client/src/services/api.ts`
**Purpose:** Base HTTP client for the whole app. Creates the shared axios instance, manages the JWT in `localStorage`, injects the bearer token on every request, and globally handles 401 by clearing the session and redirecting to `/login`. Also exposes a generic file-upload helper.
**Language / Size:** TS / 1307 bytes

## Exports (functions)
- `getToken()` — reads the JWT from `localStorage`.
- `setToken(token: string)` — writes the JWT to `localStorage`.
- `clearToken()` — removes the JWT from `localStorage`.
- `api` — the shared axios instance (imported by nearly every other service).
- `uploadFile(file: File)` — multipart upload helper.

## Imports (note the shared axios/fetch client from api.ts)
- `axios` — this file *is* the source of the shared client; it creates it here.
- No import of another service; this is the root.

## Configuration details
- Token storage key: `const TOKEN_KEY = 'atrs_token'` (localStorage key `atrs_token`).
- `api = axios.create({ baseURL: '/api', timeout: 30000 })`.
  - **baseURL is the literal string `/api`** — a relative path, not read from any env var (no `VITE_API_URL` / `import.meta.env` reference in this file). All requests are same-origin and rely on the dev/prod proxy to route `/api` to the backend.
  - **timeout: 30000 ms** (30s) default for all axios requests.

## Functions
- **`getToken(): string | null`** — `localStorage.getItem('atrs_token')`. No HTTP.
- **`setToken(token: string): void`** — `localStorage.setItem('atrs_token', token)`. No HTTP.
- **`clearToken(): void`** — `localStorage.removeItem('atrs_token')`. No HTTP.
- **`uploadFile(file: File): Promise<string>`** — builds a `FormData` with field name `file`; `POST /api/upload` with header `Content-Type: multipart/form-data`; returns `response.data.url` (the uploaded file's URL string). No explicit try/catch — axios errors propagate to the caller (and pass through the response interceptor).

## Interceptors (auth + error handling — precise)
- **Request interceptor** (`api.interceptors.request.use`): on every request reads `getToken()`; if a token exists, ensures `config.headers` exists (`config.headers = config.headers || {}`) and sets `config.headers.Authorization = \`Bearer ${token}\``. Returns `config`. If no token, request goes out with no Authorization header.
- **Response interceptor** (`api.interceptors.response.use`): success handler passes the response through unchanged. Error handler: if `error?.response?.status === 401`, it calls `clearToken()`, and — when `window` is defined and the current `window.location.pathname` does **not** start with `/login` — sets `window.location.href = '/login'` (full-page redirect). In all cases it re-throws via `return Promise.reject(error)` so callers still see the error.

## Relationships
- Consumed by every other service in this folder that imports `{ api }` (activities, ai, auditLogs, auth, config, export, featureRequests, github, issues, jobStream, marketing, media, notifications, products, release, reports, streak, users, versions).
- `getToken` is additionally imported by the SSE/fetch-based services (changelogGen, jobStream, products) to set the Authorization header manually on raw `fetch` calls.
- `setToken` is imported by `auth.ts` (login/changePassword token rotation).
- Backend target: any route mounted under `/api` on the ATRS backend; `uploadFile` targets `POST /api/upload`.
