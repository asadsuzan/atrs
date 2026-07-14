# `client/src/components/issues/ReportIssueDialog.tsx`
**Purpose:** Public-facing bug-report dialog (button + modal) shown on a product's public issues page. Submits an unauthenticated report that lands in the review queue, with a honeypot anti-spam field.
**Language / Size:** TypeScript(React) / 5573 bytes

## Exports
- `ReportIssueDialog({ productId, productName })` (named component).

## Props
- `productId: string`, `productName: string` — target product for the submission and its display name.

## State / Hooks
- Local `useState`: `open`, `form` (seeded from `EMPTY` = title/description/versionLabel/reporter/reporterEmail/website), `submitting`, `error`, `done`.
- No react-query; submits directly via the service and tracks its own async state.

## Behavior / Rendering
- Trigger: outline `Button` that resets state and opens the dialog.
- `Dialog` whose `onOpenChange` resets on close.
- Success view (`done`): a check icon, thank-you message naming `productName`, and note that it won't appear until reviewed; Close button.
- Form view: Summary (`required`), "What happened?" `Textarea`, Version + Your name (grid), Your email (never shown publicly), a visually-hidden honeypot input named `website`, an inline error message, and a submit button (spinner + "Submitting..." while pending).

## Important logic / algorithms
- `handleSubmit`: client-side guard requiring `title.trim().length >= 3` (else sets error). Calls `await reportPublicIssue(productId, form)`; on success sets `done`; on failure sets the error message from the thrown `Error` (or a generic fallback); always clears `submitting`.
- `set(k)` is a curried change handler for inputs/textareas.
- Honeypot: off-screen (`absolute -left-[9999px]`), `tabIndex={-1}`, `aria-hidden`, `autoComplete="off"` — bots fill it, humans don't; the server presumably rejects a non-empty `website`.

## Relationships
- Service: `reportPublicIssue` (`../../services/issues`). Feeds the same review queue that `IssueManager`'s approve action clears (`needsReview`). Rendered on the public `/issues/:productId` page.

## Edge cases & known limitations
- All fields except summary are optional; email is collected but stated to be private.
- No client-side email format enforcement beyond the `type="email"` input.
- Spam protection is only the honeypot (server-side validation assumed).
