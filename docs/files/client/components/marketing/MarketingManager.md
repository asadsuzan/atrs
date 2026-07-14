# `client/src/components/marketing/MarketingManager.tsx`
**Purpose:** The "Marketing Hub" editor for a product's landing-page copy and assets (hero, media/links, why-choose lists, key features, all features, screenshots, demos, FAQs) with smart-import parsing, DB persistence, and multi-format export (TXT/JSON/HTML/Word/PDF/PPT).
**Language / Size:** TypeScript(React) / 27402 bytes

## Exports
- `MarketingManager({ productId })` (named component).

## Props
- `productId: string` — the product whose marketing data is edited.

## State / Hooks
- `formData` (`any`, the whole marketing document), `importText`, `isImportOpen`.
- `useQuery(['marketing', productId], getMarketingData)`; `useEffect([response])` copies `response.data` into `formData`.
- `useMutation(updateMarketingData)` (save) and `useMutation(deleteMarketingData)` (clear DB); both play sound, toast, invalidate `['marketing', productId]`.
- `useConfirm()` for destructive clear/reset; `useQueryClient`.

## Behavior / Rendering
- Loading/empty (`isLoading || !formData`) → skeleton layout.
- Toolbar: Smart Import dialog (paste raw template → `parseMarketingText` → merge into `formData`), Export dropdown (6 formats), Clear DB (confirm-gated delete), Reset (confirm-gated revert to `response.data`), Save Hub.
- Editor cards (all mutate `formData` in place via `setFormData({...})`): Hero Section (plugin name, hero description + `GenerateDescriptionButton`, thumbnail), Media & Links (WP.org URL, docs URL, trailer video, top-rating link), Why Choose (problem list / solution list as newline-split textareas), Key Features (top 4; title, media URL, description, list), All Features (title, description, list), Screenshots (title/url rows), Demos array (title/url/description), FAQs (question/answer).
- Array editors add/remove entries by copying and splicing arrays.

## Important logic / algorithms
- `handleSmartImport`: `parseMarketingText(importText)` then `setFormData({ ...formData, ...parsed })` (parser result overrides existing keys); toasts success/failure.
- `exportAsRawTemplate`: reconstructs the loose text template (unquotes JSON keys via regex, injects trailing commas on the demos array) and downloads a `.txt`. Round-trips with `SmartParser`.
- `escapeHtml` + `generateHTMLContent` build a standalone HTML doc used by `exportAsHTML` and `exportAsWord` (Word via `application/msword` blob with a BOM). `exportAsJSON` downloads pretty JSON.
- `exportAsPDF` uses `jsPDF` with a manual `addText` line-wrapping/pagination helper. `exportAsPPT` uses `pptxgenjs` to build title/features/demos slides.
- All downloads use the Blob + object-URL + synthetic `<a>` click pattern with `URL.revokeObjectURL`.

## Relationships
- Services: `marketing` (get/update/delete). Parser: `./SmartParser` (`parseMarketingText`). AI: `GenerateDescriptionButton`. Contexts: `ConfirmContext`. Libraries: `jspdf`, `pptxgenjs`. Sound via `@/lib/sound`.

## Edge cases & known limitations
- `formData` is untyped (`any`); array edits mutate copied arrays element-by-element.
- The raw-template exporter is bespoke/fragile (hard-coded "Why Choose" boilerplate line, regex comma insertion) and pairs specifically with SmartParser's format.
- Reset only works when a saved `response.data` exists; Smart Import overwrites overlapping fields wholesale.
- Word export is the classic HTML-as-.doc trick, not a true DOCX.
