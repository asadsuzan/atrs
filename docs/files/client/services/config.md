# `client/src/services/config.ts`
**Purpose:** App configuration API: read/write global config, test Cloudflare R2 storage credentials, and read nav-mode + presentation-deck branding settings.
**Language / Size:** TS / 1639 bytes

## Exports
Types: `R2TestResult` (`{ ok, message }`), `NavMode` (`'expanded'|'collapsed'|'disabled'`), `Branding`.
Functions: `getAppConfig`, `updateAppConfig`, `testStorageConnection`, `getNavSettings`, `getBranding`.

### `Branding`
`{ companyName, logoUrl, accentColor, accentDynamic, thankYouEnabled, thankYouTitle, thankYouMessage }`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getAppConfig(): Promise<any>`** — `GET /api/config`.
- **`updateAppConfig(config: any): Promise<any>`** — `POST /api/config`; body = config.
- **`testStorageConnection(r2: { accountId, bucket, publicBaseUrl, accessKeyId, secretAccessKey }): Promise<R2TestResult>`** — `POST /api/config/storage/test`; body = r2 credentials. Server does a write/read/delete round-trip; blank fields fall back to stored settings.
- **`getNavSettings(): Promise<{ mode: NavMode }>`** — `GET /api/notifications/nav-settings` (note: served under `/notifications`, readable by any authenticated user).
- **`getBranding(): Promise<Branding>`** — `GET /api/notifications/branding` (also under `/notifications`, any authenticated user).

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by the Settings page (config + R2 storage test), the sidebar/nav (nav settings), and the presentation deck / public surfaces (branding).
- Backend targets: `/api/config/*` and `/api/notifications/{nav-settings,branding}`.
