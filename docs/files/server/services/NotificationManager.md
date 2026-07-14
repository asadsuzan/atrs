# `server/src/services/NotificationManager.ts`
**Purpose:** Singleton in-memory registry of Server-Sent-Events (SSE) client connections with targeted/broadcast dispatch (per-user, root admins, admins, all) and a keep-alive heartbeat.
**Language / Size:** TypeScript / 3182 bytes

## Exports
- `interface NotificationClient` — `{ userId: string; isRoot: boolean; isAdmin: boolean; res: Response }`.
- `class NotificationManager` — singleton (private constructor, `getInstance()`).
- `const notificationManager` — the eagerly-created singleton (`NotificationManager.getInstance()`).

## Imports (Internal / External)
External: `express` (`Response` type). No internal imports, no DB. Uses `setInterval` + `JSON.stringify`.

## Functions / Methods
- **constructor()** (private) — starts a 30000ms `setInterval` calling `broadcastPing()`; the timer is `.unref()`ed so it doesn't keep the process alive.
- **static getInstance(): NotificationManager** — lazy singleton accessor.
- **addClient(userId, isRoot, res, isAdmin=false): () => void** — builds a `NotificationClient` (`isAdmin: isAdmin || isRoot` — root always counts as admin), adds to the `clients` Set, immediately sends a `handshake` event `{connected:true, userId}`, and returns a cleanup closure that deletes the client from the Set (call on socket close).
- **sendEventToClient(client, event, data)** (private) — writes SSE frame `event: <event>\ndata: <json>\n\n` to `client.res`; on write error logs and removes the client from the Set (dead-connection reaping).
- **sendToUser(userId, event, data)** — dispatches to every client whose `userId` matches.
- **sendToRootAdmins(event, data)** — dispatches to clients with `isRoot`.
- **sendToAdmins(event, data)** — dispatches to clients with `isAdmin` (role admin or root).
- **broadcast(event, data)** — dispatches to all clients.
- **broadcastPing()** (private) — writes SSE comment `: ping\n\n` to each client to keep connections alive; removes any client whose write throws.

## Data structures / Types / Constants
- `clients: Set<NotificationClient>` (private instance field).
- `static instance` (private singleton holder).
- Heartbeat interval: 30000ms; handshake event name `'handshake'`.

## Important algorithms
- **Dead-connection reaping:** any `res.write` failure (in `sendEventToClient` or `broadcastPing`) deletes the client from the Set, so broken sockets are pruned on the next write/ping instead of accumulating.
- **Heartbeat:** an unref'd 30s interval emits an SSE comment line to defeat TCP/proxy idle timeouts.
- **Targeting:** simple linear scans over the Set filtered by userId / isRoot / isAdmin.

## Relationships
- Consumers: SSE notification route (registers a client via `addClient`, wires cleanup on `req` close) and any service emitting real-time notifications (import progress, admin alerts) via `sendToUser` / `sendToAdmins` / `sendToRootAdmins` / `broadcast`.
- Depends only on the Express `Response` handle held per client.

## Edge cases & known limitations
- Purely in-memory and process-local: does not fan out across multiple server instances (serverless/multi-node deployments won't share clients).
- Client identity/role is captured at `addClient` time; role changes mid-connection are not reflected.
- Dead sockets are only detected on the next write or ping (up to ~30s of staleness).
- No backpressure handling — a slow client's `res.write` return value is ignored.
