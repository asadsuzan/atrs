# `server/src/routes/readmeToolsRoutes.ts`
**Purpose:** Express router that reverse-proxies the WordPress.org readme validator so it can be embedded in an `<iframe>`; mounted at `/api/tools` (app.ts: `app.use('/api/tools', readmeToolsRoutes)` — **public**, no auth, because an iframe navigation can't send the JWT header).
**Language / Size:** TypeScript / 427 bytes
## Middleware applied (router-level)
- None.
## Endpoints
| Method | Path | Middleware | Validation schema | Controller handler |
|--------|------|-----------|-------------------|--------------------|
| GET | `/readme-validator` | — | — | `ReadmeToolsController.readmeValidatorProxy` |
| POST | `/readme-validator` | — | — | `ReadmeToolsController.readmeValidatorProxy` |
## Relationships
- Controller: `../controllers/ReadmeToolsController` (`readmeValidatorProxy`).
## Notes
- Public router. GET serves the proxied validator page; POST forwards the form submission. Both hit the same `readmeValidatorProxy` handler.
- Relies on the app-level CORS behavior that allows plain (non-XHR) navigations from a `null`/disallowed origin so the iframe's form POST proceeds (see `app.ts` CORS comment).
