# `client/src/components/activities/ActivityForm.tsx`
**Purpose:** The create/edit form for a changelog "activity" (feature / improvement / bug-fix entry) with nested items, media uploads, version linking, tags, and AI-assisted title/description generation.
**Language / Size:** TypeScript(React) / 24159 bytes

## Exports
- `ActivityForm({ initialData, onSubmit })` (named component). No default export.

## Props
- `initialData?: any` — an existing activity to edit; when present the form is seeded/reset from it. `undefined` → create mode.
- `onSubmit: (data: FormValues) => void` — called with validated values on submit; parent owns the mutation.

## Imports (Internal / External)
- Internal: `RichTextEditor`, `MediaUploader`, `DatePicker`, `Button`, `Input`, `Select*`, `Form*`, `Badge` (`@/components/ui/*`); `SuggestTitleButton, GenerateDescriptionButton` (`../ai/AiAssist`); `htmlToPlainText` (`@/lib/richText`); `getProducts` (`../../services/products`); `getIssues, type Issue` (`../../services/issues`); `useProductVersions` (`../../hooks/useVersions`); `VersionBadge` (`../versions/VersionBadge`).
- External: `useEffect` (react); `useForm, useFieldArray` (react-hook-form); `zodResolver` (@hookform/resolvers/zod); `z` (zod); `useQuery` (@tanstack/react-query); `Plus, Trash2` (lucide-react); `format` (date-fns).

## State / Hooks
- `useForm<FormValues>` with `zodResolver(formSchema)`; default values built from `processedInitialData` or empty create defaults (type `feature`, tier `free`, priority `medium`, `activityDate` = today via `format(new Date(),'yyyy-MM-dd')`).
- `useQuery(['products'])` → product list for the product select.
- `form.watch('productId')` → `selectedProductId`; feeds `useProductVersions(selectedProductId)` and `useQuery(['issues', selectedProductId], enabled: !!selectedProductId)`.
- `useFieldArray({ name: 'items' })` → `fields, append, remove` for nested items.
- `useEffect([initialData?._id])`: resets the form to `processedInitialData` when editing a different activity.

## Behavior / Rendering
- `formSchema` (zod): `productId` (required), `type` enum feature/improvement/bug-fix, `title` (required), `shortDescription` (required), optional `tier` (free/pro), `priority`, `referenceUrl`, `versionId`, `relatedIssueIds[]`, `mediaType` (image/gif/video or ''), `mediaUrl`, `mediaUrls[]`, `tags[]`, `activityDate` (required), and `items[]` each with title (required), description, mediaType, mediaUrl, mediaUrls.
- `processedInitialData` normalizes server shapes: unwraps populated `versionId` object to its `_id`; maps `relatedIssueIds` objects → ids; back-fills `mediaUrls` from legacy single `mediaUrl`; same media back-fill per nested item.
- Fields: Product select; Type + Priority + Date (grid); Tier select shown only when `type === 'feature'`; Title (+ SuggestTitleButton); Reference URL + Version select (disabled until a product with versions is chosen, options tagged with unreleased/latest `VersionBadge`); Resolved Issues checklist shown only when `type === 'bug-fix'`; Short Description (RichTextEditor + GenerateDescriptionButton); Tags (Released/Unreleased toggle badges); Items section (add/remove, each with title, description, media type + multi MediaUploader); top-level Media Type + multi MediaUploader.
- Submit handler mutates the payload before calling `onSubmit`: clears legacy `mediaUrl` on the activity and every item; forces `relatedIssueIds = []` when type is not `bug-fix`.

## Important logic / algorithms
- `MediaUploader.onUploadComplete` auto-selects the `mediaType` from the first uploaded file's MIME (`video/*` → video, `image/gif` → gif, `image/*` → image) for both the activity and each item.
- AI assist buttons receive lazy `getContext`/`getTitle` closures reading current form values (product name resolved from the products list, type, tags, plain-text short description via `htmlToPlainText`).
- Version options combine label + conditional unreleased/latest badges from `useProductVersions`.

## Relationships
- Rendered inside a dialog by the activities/changelog pages; `onSubmit` is wired to a create/update mutation by the parent. Reads products & issues via services and versions via `useVersions`. Shares `VersionBadge` semantics with VersionManager/ReleasePublish.

## Edge cases & known limitations
- `initialData` is typed `any`; the reset effect only depends on `initialData?._id`, so in-place mutations to the same activity object won't re-seed the form.
- Legacy single-media (`mediaUrl`) is always emptied on submit; the app is expected to read `mediaUrls`.
- Issue links are silently discarded when the type is switched away from bug-fix.
- Casts to `any` around `Form`/`control` bypass some RHF typing.
