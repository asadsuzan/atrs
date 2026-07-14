# `server/src/controllers/ReadmeToolsController.ts`
**Purpose:** Reverse proxy for the WordPress.org readme validator so it can be embedded in an iframe on our origin.
**Language / Size:** TypeScript / 2918 bytes
## Exports
Named export: `readmeValidatorProxy`. Module constant `VALIDATOR_URL = 'https://wordpress.org/plugins/developers/readme-validator/'`.
## Imports (Internal / External)
- External: `express`. (No internal imports.)
## Handlers / Functions
- **readmeValidatorProxy(req,res,next)** — GET & POST. Builds a `fetch` `RequestInit` mirroring `req.method`, forwarding `user-agent` and an html `accept` header, `redirect:'follow'`. On POST, serializes `req.body` into `application/x-www-form-urlencoded` (`URLSearchParams`, arrays joined by comma). Fetches `VALIDATOR_URL`, reads `text()`. Removes `X-Frame-Options`, `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy` headers; sets `Content-Security-Policy: sandbox allow-forms allow-scripts allow-popups`. Responds with upstream status, `Content-Type: text/html; charset=utf-8`, and the HTML body. Errors via `next`.
## Important logic & design patterns
- Security via CSP `sandbox` (deliberately omits `allow-same-origin`) so the reflected upstream page runs in an opaque origin and cannot read our storage/JWT or reach `window.parent`.
- No HTML rewriting needed (validator uses `action=""` and absolute https asset URLs); no CSRF/session involved.
## Relationships
- Routed by `readmeToolsRoutes.ts` (mounted `/api/tools`, public / no auth so an iframe navigation works).
- No service/model dependencies.
