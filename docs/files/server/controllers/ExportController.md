# `server/src/controllers/ExportController.ts`
**Purpose:** Export all core data (products, activities, marketing, versions) as a downloadable JSON file.
**Language / Size:** TypeScript / 943 bytes
## Exports
Named export: `exportAllData`.
## Imports (Internal / External)
- Internal models: `../models/Product` (`Product`), `../models/Activity` (`Activity`), `../models/ProductMarketing` (`ProductMarketing`), `../models/Version` (`Version`).
- External: `express`.
## Handlers / Functions
- **exportAllData(req,res,next)** — GET /api/export. No inputs read. Queries `Product.find({})`, `Activity.find({})`, `ProductMarketing.find({})`, `Version.find({})`. Builds `{exportDate: ISO, products, activities, marketing, versions}`. Sets `Content-Type: application/json` and `Content-Disposition: attachment; filename="atrs-export.json"`; `200` sends `JSON.stringify(data, null, 2)`. Errors via `next`.
## Important logic & design patterns
- Global unscoped export (`find({})` — all records, not owner-scoped); mounted admin-only in app.ts.
- Attachment download response, pretty-printed JSON.
## Relationships
- Mounted directly in `app.ts` as `GET /api/export` behind `requireAuth`+`requireActive`+`requireAdmin` (not via a route file).
- Reads Product/Activity/ProductMarketing/Version models directly (no service layer).
