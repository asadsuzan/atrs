# `server/src/controllers/ProductMarketingController.ts`
**Purpose:** Manage a product's marketing dataset (landing-page content): fetch (with empty template fallback), upsert, delete.
**Language / Size:** TypeScript / 2407 bytes
## Exports
Class export: `ProductMarketingController` (instance methods as arrow-function handlers).
## Imports (Internal / External)
- Internal: `../services/ProductMarketingService` (`ProductMarketingService`).
- External: `express`.
- Constructor instantiates `this.service = new ProductMarketingService()`.
## Handlers / Functions
- **getMarketingData(req,res,next)** — Reads `req.params.id`, `req.user`. Calls `this.service.getMarketingData(productId, req.user!)`. If no data, returns `200 {status:'success', data:{...empty template...}}` (productId + empty strings/arrays for pluginName, videos, urls, heroDescription, thumbnailImage, problemList, smarterWayList, keyFeatures, allFeatures, proFeaturesDesc, demos, topRatingLink, screenshots, faqs) instead of 404. Else `200 {status:'success', data}`.
- **upsertMarketingData(req,res,next)** — Reads `req.params.id`, `req.body` (route Zod `upsertMarketingSchema`), `req.user`. Calls `this.service.upsertMarketingData(productId, marketingData, req.user!)`. `200 {status:'success', data}`.
- **deleteMarketingData(req,res,next)** — Reads `req.params.id`, `req.user`. Calls `this.service.deleteMarketingData(productId, req.user!)`. If falsy → `404 {status:'error', message:'Marketing data not found'}`; else `200 {status:'success', message:'Marketing data deleted successfully'}`.
## Important logic & design patterns
- Class-based controller (instantiated in `productRoutes.ts`) rather than free functions.
- Envelope response shape `{status, data|message}` (differs from other controllers' bare payloads).
- GET returns an empty template instead of 404 to simplify frontend state.
## Relationships
- Routed by `productRoutes.ts` under `/:id/marketing` (mounted `/api/products`, behind `requireAuth`+`requireActive`).
- Delegates to `ProductMarketingService`.
