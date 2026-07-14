# `client/src/services/marketing.ts`
**Purpose:** Read/update/delete a product's marketing data (nested under the product resource).
**Language / Size:** TS / 528 bytes

## Exports (functions)
`getMarketingData`, `updateMarketingData`, `deleteMarketingData`.

## Imports (note the shared axios/fetch client from api.ts)
- `{ api }` from `./api`.

## Functions
- **`getMarketingData(productId: string): Promise<any>`** — `GET /api/products/{productId}/marketing`.
- **`updateMarketingData({ productId, ...marketingData }: any): Promise<any>`** — `PUT /api/products/{productId}/marketing`; body = marketing fields (productId stripped from body, used in path).
- **`deleteMarketingData(productId: string): Promise<any>`** — `DELETE /api/products/{productId}/marketing`.

## Error handling
None explicit; axios rejections propagate.

## Relationships
- Consumed by ProductDetails marketing tab/section.
- Backend target: `/api/products/:productId/marketing`.
