# `client/src/components/issues/QuickIssueDialog.tsx`
**Purpose:** Lightweight "report an issue" dialog usable from anywhere (e.g. the dashboard): pick a product, add a title, optionally severity/status/description. The full IssueManager remains the place for attachments/versions.
**Language / Size:** TypeScript(React) / 7273 bytes

## Exports
- `QuickIssueDialog({ open, onOpenChange, products, defaultProductId?, onCreated? })` (named component).

## Props
- `open: boolean`, `onOpenChange: (open) => void` — controlled dialog visibility.
- `products: ProductLite[]` where `ProductLite = { _id: string; name: string }` — options for the product select.
- `defaultProductId?: string` — pre-selected product.
- `onCreated?: () => void` — fired after a successful create.

## State / Hooks
- `useState(form)` seeded from `emptyForm` ({ productId, title, description, severity: 'medium', status: 'open' }).
- `useEffect([open, defaultProductId, products])`: on open, seeds `productId` to `defaultProductId`, or the sole product's id when `products.length === 1`, else empty.
- `useMutation(createIssue)`: on success plays sound, toasts, invalidates `['issues', vars.productId]` and `['allIssues']`, closes, calls `onCreated`; on error toasts.

## Behavior / Rendering
- `Dialog` (`max-w-lg`) with a Bug-icon title and description.
- Form: product `Select`; Title `Input` (`required`, `autoFocus`) with `SuggestTitleButton`; Severity + Status selects (grid); Description `RichTextEditor` with `GenerateDescriptionButton`.
- Submit guard: returns early unless `form.productId` and non-empty trimmed `form.title`; otherwise `mutation.mutate({ ...form })`.
- Submit button disabled while pending or invalid; shows a spinner + "Reporting…" when pending.

## Important logic / algorithms
- AI assist `getContext` closures read live form state (product name resolved from `products`, severity, plain-text description via `htmlToPlainText`).

## Relationships
- Service: `createIssue` (`../../services/issues`). Sound via `@/lib/sound`. Invalidates both the per-product issues query and a global `['allIssues']` query (used by dashboard/global surfaces). Complements `IssueManager` (full editor) and `ReportIssueDialog` (public form).

## Edge cases & known limitations
- No attachment/version fields by design — those live in IssueManager.
- Created issues default to internal (`source` unset), unlike public submissions.
