# Marketing Hub

**Summary:** A per-product landing-page content editor that lets an owner author and persist hero copy, feature lists, screenshots, demos, and FAQs, with a paste-to-structure "Smart Import" helper and multi-format export (TXT/JSON/HTML/Word/PDF/PPT). Marketing data is stored 1-to-1 with a product and served under an envelope-shaped, product-nested API.

## User-facing entry points
- Surfaced as the Marketing tab/section of the Product Details page, rendered by `MarketingManager` for a given `productId`.
- In-editor UI surfaces: a toolbar (Smart Import dialog, Export dropdown with 6 formats, Clear DB, Reset, Save Hub) and editor cards for Hero Section, Media & Links, Why Choose (problem/solution lists), Key Features (top 4), All Features, Screenshots, Demos, and FAQs.

## Client pieces
- **Component:** `client/src/components/marketing/MarketingManager.tsx` — the full editor. Holds `formData` (untyped `any` mirror of the marketing document), `importText`, `isImportOpen`.
- **Parser:** `client/src/components/marketing/SmartParser.ts` — `parseMarketingText(text)`, a pure regex-driven parser (no `eval`) turning a loose "Landing Page Data" template into the structured marketing shape.
- **Service:** `client/src/services/marketing.ts` — `getMarketingData(productId)` (GET), `updateMarketingData({ productId, ...fields })` (PUT, productId used in path and stripped from body), `deleteMarketingData(productId)` (DELETE). All go through the shared axios client (`client/src/services/api.ts`).
- **React Query:** query key `['marketing', productId]` (`useQuery`); save and delete mutations both invalidate that key, play a sound, and toast.
- **Contexts:** `ConfirmContext` (`useConfirm`) gates the destructive Clear/Reset actions. AI hero copy via `GenerateDescriptionButton`.
- **Export libs:** `jspdf` (PDF with manual line-wrap/pagination), `pptxgenjs` (PPT slides); HTML/Word/JSON/TXT built via Blob + object-URL download.

## Server pieces
- **Routes:** mounted under `/api/products/:id/marketing` (router `productRoutes.ts`, mount guard `requireAuth` + `requireActive`):
  - `GET /:id/marketing` → `marketingController.getMarketingData` (validate `idParamSchema`).
  - `PUT /:id/marketing` → `marketingController.upsertMarketingData` (validate `upsertMarketingSchema`).
  - `DELETE /:id/marketing` → `marketingController.deleteMarketingData` (validate `idParamSchema`).
- **Controller:** `server/src/controllers/ProductMarketingController.ts` (class instance). Returns the envelope `{ status, data }` / `{ status, message }` — GET returns `200` with an empty template (not `404`) when no doc exists; DELETE returns `404 { status:'error', message:'Marketing data not found' }` when nothing was deleted.
- **Service:** `server/src/services/ProductMarketingService.ts` — every method is gated by `assertProductOwned` (loads `Product.findById`, runs `assertOwner`; non-owners read as `404`). Upsert strips `ownerId`/`productId` from the payload and stamps `ownerId` from the product; delete first collects and removes associated media files, then deletes the doc; both write audit logs.
- **Repository:** `server/src/repositories/ProductMarketingRepository.ts` — `findByProductId`, `upsertByProductId` (`findOneAndUpdate` with `upsert:true`, `setDefaultsOnInsert:true`, forces `productId`), `deleteByProductId` (returns `deletedCount > 0`).
- **Auth guards:** `requireAuth` + `requireActive` at mount; per-record ownership enforced in the service.

## Data model
- Collection `productmarketings` (`server/src/models/ProductMarketing.ts`), 1-to-1 with Product.
- Root fields: `ownerId` (→User, indexed), `productId` (→Product, **unique**), `pluginName`, `trailerVideo`, `tutorialVideo`, `wpOrgUrl`, `docsUrl`, `heroDescription`, `thumbnailImage`, `proFeaturesDesc`, `topRatingLink` (strings, default `''`), `problemList`/`smarterWayList` (`[String]`), `keyFeatures`, `allFeatures`, `demos`, `screenshots`, `faqs` (subdoc arrays), plus `timestamps`.
- Subdocuments (all `_id:false`): `KeyFeatureSchema` (title, description, list[], mediaUrl), `FeatureSchema` (title, description, list[]), `DemoSchema` (icon, title, description, category, type, url), `ScreenshotSchema` (title, url), `FAQSchema` (question, answer).
- Zod: `upsertMarketingSchema` (`server/src/schemas/marketing.schema.ts`) — all body fields optional and `.passthrough()` (unlisted keys pass through, not stripped); `params.id` is an ObjectId.

## Notable behaviors & edge cases
- **Empty-template GET:** a product with no marketing doc returns `200` with a fully-empty template so the client always has editable state (no `404` branch to handle).
- **Envelope shape:** these endpoints use `{ status, data|message }`, unlike most ATRS controllers that return bare payloads.
- **Smart Import round-trip:** `parseMarketingText` is designed to consume exactly what `MarketingManager.exportAsRawTemplate` produces. Import merges via `{ ...formData, ...parsed }`, so parsed keys overwrite overlapping fields wholesale. The parser is heuristic/regex-driven and tolerant of multiple loose formats (emoji-tolerant `❌`/`✅` lists, numbered `1️⃣`..`4️⃣` key features, `Q:`/`A:` FAQs); unmatched sections stay empty, malformed demo arrays yield `[]`, and it never `eval`s input.
- **Ownership:** upsert cannot re-parent a doc (ownerId/productId stripped and re-stamped from the product); missing `productId` is a `400`, wrong owner is a `404`.
- **Media cleanup on delete:** the service deletes referenced files (trailerVideo, tutorialVideo, thumbnailImage, keyFeatures[].mediaUrl, screenshots[].url, demos[].icon) before deleting the DB doc — fire-and-forget, no filesystem rollback if the DB delete then fails.
- **Cascade:** `ProductService.deleteProductSequential` calls `deleteMarketingData` when a product is deleted.
- **Client fragility:** `formData` is untyped `any`; the raw-template exporter is bespoke (hard-coded boilerplate, regex comma insertion); Reset only works when a saved doc exists; Word export is the HTML-as-`.doc` trick, not real DOCX.

## Related docs
- [MarketingManager](../files/client/components/marketing/MarketingManager.md)
- [SmartParser](../files/client/components/marketing/SmartParser.md)
- [client service: marketing](../files/client/services/marketing.md)
- [ProductMarketingController](../files/server/controllers/ProductMarketingController.md)
- [ProductMarketingService](../files/server/services/ProductMarketingService.md)
- [ProductMarketingRepository](../files/server/repositories/ProductMarketingRepository.md)
- [ProductMarketing model](../files/server/models/ProductMarketing.md)
- [marketing.schema](../files/server/schemas/marketing.schema.md)
- [Server API reference §3 Products](../api/server-api-endpoints.md)
- [Client → Endpoint map](../api/client-endpoint-map.md)
