# `client/src/components/products/ProductForm.tsx`
**Purpose:** Create/edit form for a product, with a variant system (`wp` / `standalone` / `full`) that changes which fields and validation apply. Includes AI-assisted name/description, media uploads, autosaved drafts, and a server-side repo-path browser.
**Language / Size:** TypeScript(React) / 11817 bytes

## Exports
- `ProductForm({ initialData?, onSubmit, variant? })` (named component).
- `type ProductFormVariant = 'wp' | 'standalone' | 'full'`.

## Props
- `initialData?: any` — existing product for edit mode.
- `onSubmit: (data: FormValues) => void` — receives validated values; draft is cleared first.
- `variant?: ProductFormVariant` (default `'full'`).

## State / Hooks
- `schema = useMemo(() => buildSchema(variant))`; `repoBrowserOpen` state.
- `useForm<FormValues>` with `zodResolver(schema)`; defaults from `initialData` or empty (category depends on variant).
- `useFormDraft(form, { key: 'draft:product:<id|new>', exclude: ['icon','banner'] })` → `clearDraft` — browser-style autosave/restore of inputs (media excluded).

## Behavior / Rendering
- `buildSchema(variant)`: `name` required; `githubUrl` required URL for wp/full but optional for standalone; `category` enum plugin/block/theme/standalone; `status` active/inactive; optional icon/banner/wpOrgSlug/repoPath.
- `CATEGORY_OPTIONS` map per variant; standalone hides the category select (fixed "standalone") and the WP.org slug field.
- Fields: Name (+ `SuggestTitleButton`), Description (RichTextEditor + `GenerateDescriptionButton`), GitHub/Website URL (label varies by variant), WP.org slug (non-standalone only), Local repo path (`Input` + Browse button opening `RepoPathBrowser`), Category (non-standalone) + Status grid, Icon + Banner uploads grid, submit button ("Create"/"Update").
- `handleSubmit` calls `clearDraft()` then `onSubmit(data)`.

## Important logic / algorithms
- Variant-driven schema and field visibility is the core logic; `defaultCategory` resolves to `standalone` for standalone else `plugin`.
- Draft persistence keyed per entity (`initialData?._id ?? 'new'`); excludes media fields so blob/URL churn isn't persisted.
- AI assist context closures read current form values (`htmlToPlainText` for the description).

## Relationships
- Renders `RepoPathBrowser` (server folder picker feeding `repoPath`, used by the Git Changelog Generator). Uses `useFormDraft` hook, `AiAssist`, `MediaUploader`, `RichTextEditor`. Rendered inside `AddProductDialog` and product edit dialogs.

## Edge cases & known limitations
- `initialData` and field renders are typed `any` (RHF typing bypassed with casts).
- Standalone products can omit the URL; wp/full require a valid URL.
- The repo path is an absolute path on the server machine — meaningful only for local/self-hosted deployments.
