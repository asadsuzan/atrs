# ATRS — Data Flow Traces

> Companion to `overview.md`. Numbered end-to-end traces of the major runtime
> data flows. Every step cites a source file. See also
> `docs/inventory/KNOWLEDGE-BASE.md §0`.

---

## 1. Normal authenticated CRUD request

Example: `PATCH /api/products/:id`.

1. **Client call.** A page/component calls a service module (e.g.
   `client/src/services/products.ts`) which uses the shared axios instance
   `api` (`client/src/services/api.ts`, `baseURL: "/api"`). The request
   interceptor attaches `Authorization: Bearer <localStorage['atrs_token']>`.
2. **Transport.** Same-origin request; in dev the Vite proxy forwards `/api`
   to the Express server, in prod `vercel.json` rewrites `/api/:path*` →
   `/api/index`.
3. **Middleware chain** (`server/src/app.ts`): `helmet` → `cors` (allow-list)
   → `apiLimiter` (1000/IP/15min) → `customLogger` → `express.json` (5mb).
4. **Mount guards.** `/api/products` is mounted with `requireAuth` →
   `requireActive` (`server/src/app.ts`, `server/src/middlewares/auth.ts`).
   `requireActive` re-loads the user, enforces `status==='active'`, invalidates
   tokens older than `passwordChangedAt`, and syncs role/name/email onto
   `req.user`.
5. **Route + validation.** `productRoutes.ts` runs `validate(updateProductSchema)`
   (`server/src/middlewares/validate.ts`) — validates and mutates
   `req.body`/`req.params`/`req.query`, forwarding any `ZodError` to `next()`.
6. **Controller.** `ProductController.updateProduct` reads `req.params.id`,
   `req.body`, `req.user`; delegates to the service; returns `200` (or `404`).
7. **Service.** `ProductService.updateProduct` enforces ownership (`assertOwner`
   / non-admin 404), strips non-editable fields (`ownerId`), recomputes the slug
   if the name changed, persists via `ProductRepository`, and writes an audit log
   (`AuditLogService`, action `UPDATE/PRODUCT`).
8. **Persistence.** Repository → Mongoose model → MongoDB.
9. **Error path.** Any thrown error bubbles to `errorHandler`
   (`server/src/middlewares/errorHandler.ts`): `ZodError`→400, Mongo dup key
   `11000`→409, else `err.statusCode||500` (prod hides 5xx message/stack unless
   `err.expose`).
10. **Client 401 handling.** The axios response interceptor turns any `401`
    into `clearToken()` + hard redirect to `/login` (`client/src/services/api.ts`).

---

## 2. SSE streaming job (long-running, cancellable)

Example: WordPress.org catalogue import (`POST /api/products/import-from-wporg`).
The bulk-delete / purge-orphaned / users delete-stream flows follow the same
shape via `utils/sseStream.runStreamJob`; the WP.org import uses a hand-rolled
SSE stream because it needs cross-instance cancellation.

1. **Client starts the job.** `WpImportContext`
   (`client/src/contexts/WpImportContext.tsx`, mounted at the app root so it
   survives navigation) POSTs the request and begins consuming the response as
   a stream. An overlap guard prevents a second concurrent import.
2. **Controller opens the stream.** `ProductController.importFromWpOrg` writes
   SSE headers, a keep-alive, and flushes `: ok`. It creates a cancellable
   session `importSessionManager.create(randomUUID(), userId)` and emits a
   `session` event so the client learns the `sessionId`.
3. **Cross-instance cancel plumbing.** `ImportSessionManager`
   (`server/src/services/ImportSessionManager.ts`) keeps a process-local
   cancellation flag and, on serverless, mirrors it to the `JobSession` Mongo
   collection. The controller polls `refreshFromStore` every 2s so a cancel
   issued on a *different* Vercel instance is observed. `req.on('close')`
   treats a client disconnect as a cancel.
4. **Service runs the pipeline.** `ProductService.importFromWpOrg(username,
   slugs, user, onProgress, isCancelled)` executes the pipeline (see
   `docs/algorithms/wporg-import-pipeline.md`), calling `onProgress(evt)` for
   every step; the controller relays each as a `progress` SSE event.
   Cancellation is checked between plugins.
5. **Client renders progress.** `WpImportContext` accumulates events and drives
   the `WpOrgImportDialog` console + the docked `WpImportMiniPlayer` (visible
   after the dialog is minimized).
6. **Completion.** The controller sends a `complete` event
   `{created, updated, errors, cancelled, rolledBack}` (or `error`), then cleans
   up the poll interval and the session in `finally`. On cancel the service
   rolls back newly-created products (updates are kept).
7. **Cache refresh.** On success the client invalidates the relevant React
   Query keys (products / activities / versions) so the UI reflects imported data.

**SSE endpoints in the system:** products `bulk-delete-stream` &
`import-from-wporg`, activities `bulk-delete-stream`, media
`purge-orphaned-stream`, users `:id/delete-stream`, `changelog-gen/generate`,
and `notifications/subscribe`. All except the notification subscription are job
streams; the notification one is a persistent push channel (§3).

---

## 3. Notification pipeline (server push)

1. **Subscribe.** The client opens an `EventSource` to
   `GET /api/notifications/subscribe` (guarded by `requireAuthSSE` — token via
   header *or* `?token=` query, since `EventSource` can't set headers).
2. **Registry.** `NotificationManager`
   (`server/src/services/NotificationManager.ts`) — a process-local, in-memory
   singleton — registers the response socket keyed by user, sends a 30s
   (unref'd) heartbeat ping, and reaps dead sockets on write failure.
3. **Emit.** When a domain event occurs (e.g. a public issue is reported), the
   relevant service asks `NotificationManager` to dispatch — targeted
   (user/root/admin) or broadcast (all) — writing an SSE `notification` event to
   each matching live socket, and persisting a `Notification` document.
4. **Client surface.** `NotificationContext` +
   `client/src/components/layout/NotificationBell.tsx` consume the stream, show
   unread counts, and support `read`/`read-all`/`delete` via the REST endpoints.
5. **Serverless caveat.** The registry is per-instance and in-memory — durable
   delivery is not guaranteed across serverless cold starts; the persisted
   `Notification` collection is the source of truth for the bell list.

---

## 4. Client data fetching (React Query)

1. **Providers.** `QueryClientProvider` wraps the app (`client/src/App.tsx`).
2. **Reads.** Pages/hooks call `useQuery` with stable, documented keys, e.g.
   `['products']`, `['dashboardActivities']`, `['public-changelog', id]`,
   `['versions', productId]` (the versioning single-source, via
   `client/src/hooks/useVersions.ts` + `client/src/lib/versions.ts`),
   `['users']`, `['allIssues']`.
3. **Query fns** call the axios service modules (`client/src/services/*`).
4. **Writes.** `useMutation` calls a service, then invalidates the affected
   keys so dependent views refetch (e.g. assigning a version invalidates
   `dashboardActivities`, `['release', productId]`, and `allVersions`).
5. **Streaming vs query.** Long jobs bypass React Query and use the SSE
   contexts (§2); their `complete` handlers invalidate the relevant query keys
   to reconcile the cache with server state.

---

## Related docs
- `overview.md` — components, deployment modes, auth, storage, integrations.
- `frontend.md` — provider nesting, routing, lazy-loading, global surfaces.
- `docs/algorithms/wporg-import-pipeline.md` — the import pipeline internals.
- `docs/api/server-api-endpoints.md` — full endpoint reference.
