# `client/src/pages/Review.tsx`

**Purpose / Route:** Review queue page mounted at `/review`. Two sections: (1) publicly-reported issues awaiting admin approval before going live, and (2) draft changelog entries flagged for review (imported entries with a guessed type, plus AI-generated drafts from the Git Changelog Generator). Supports per-item and bulk confirm/approve/reject/delete and per-row type reassignment.
**Language / Size:** TSX / 21113 bytes

## Exports
- `default function Review()` — the page component.

## Imports (Internal / External)
**External:**
- `react` — `useMemo`, `useState`
- `react-router-dom` — `Link`
- `@tanstack/react-query` — `useQuery`, `useMutation`, `useQueryClient`
- `lucide-react` — `PlusCircle`, `Wrench`, `Bug`, `Check`, `CircleCheck`, `FileCheck2`, `ArrowRight`, `Loader2`, `Globe`, `Trash2`
- `sonner` — `toast`

**Internal (services):**
- `../services/activities` — `getActivities`, `bulkUpdateActivities`, `deleteActivity`, `bulkDeleteActivities`
- `../services/issues` — `getPendingReviewIssues`, `updateIssue`, `deleteIssue`, type `IssueSeverity`

**Internal (contexts / lib / components):**
- `../contexts/ConfirmContext` — `useConfirm`
- `@/lib/utils` — `cn`
- `@/lib/richText` — `htmlToPlainText`
- `@/components/ui/button` — `Button`
- `@/components/ui/card` — `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `@/components/ui/checkbox` — `Checkbox`
- `@/components/ui/select` — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `@/components/ui/skeletons` — `ReportsSkeleton`
- `../components/layout/PageTransition` — `PageTransition` (default)

## Component tree & sub-components defined
**Module-level constants:**
- `SEVERITY_BADGE: Record<IssueSeverity, string>` — Tailwind class per severity (low/medium/high/critical).
- `type ActivityType = 'feature' | 'improvement' | 'bug-fix'`.
- `TYPE_META: Record<ActivityType, {label, Icon, cls}>` — label/icon/color per activity type.
- `TYPES: ActivityType[]` = `['feature','improvement','bug-fix']`.

**Sub-component defined in-file:**
- `ConfidenceChip({ confidence, reason })` — renders a chip explaining *why* an entry is flagged: `reason === 'ai-generated'` → "AI-generated draft"; else maps `confidence` `medium` → "Guessed from first word", `low` → "No keyword — defaulted", fallback → "Needs review".

**Render tree (Review):** `PageTransition` → header (title + "Confirm all as-is (N)" button) → combined empty state Card → Public issue reports section (Cards grouped by product) → Draft changelog entries section (bulk action bar + Cards grouped by product) → "Go to all changelogs" link to `/activities`.

## State / Refs / Context consumed
**Local state:**
- `pendingType` (`Record<string, ActivityType>`) — per-row chosen type override (defaults to imported guess).
- `selected` (`Set<string>`) — bulk selection of draft entries.
- `bulkType` (`ActivityType | ''`) — type chosen in the bulk "Set type…" select.

**Context:** `queryClient`, `confirm` (ConfirmContext).

## Hooks & Effects (deps, purpose, WHY)
- `useMemo(issueGroups, [issues])` — groups pending public issues by product (`productId._id` or `productId`), sorted by product name, for a scannable list.
- `useMemo(groups, [entries])` — same grouping for flagged draft activity entries.
- No `useEffect`. Derived values `allIds`, `allSelected` computed inline.

## Data fetching (services/endpoints; react-query keys/mutations)
- **Query** `['activities','needs-review']` → `getActivities({ needsReview: true, limit: -1, sortBy: 'activityDate', sortOrder: 'desc' })`. `entries = data?.data || []`.
- **Query** `['issues','pending-review']` → `getPendingReviewIssues`. `issues = pendingIssues || []`.
- **Mutation** `approveIssue` → `updateIssue({ id, needsReview: false })`; success invalidates `['issues']`, toast "now visible on the public page".
- **Mutation** `rejectIssue` → `deleteIssue(id)`; success invalidates `['issues']`, toast "rejected & deleted".
- **Mutation** `resolve` → `bulkUpdateActivities(ids, update)`; success calls `invalidate()` (invalidates `['activities']`) and removes ids from `selected`.
- **Mutation** `removeEntries` → `deleteActivity(ids[0])` if single else `bulkDeleteActivities(ids)`; success invalidates `['activities']`, clears ids from selection, toast count.
- `invalidateIssues()` → invalidates `['issues']`; `invalidate()` → invalidates `['activities']` (partial-match refreshes list, nav count, product timelines, dashboard).

## Event handlers & key functions
- `typeFor(a)` — returns `pendingType[a._id] ?? a.type`.
- `deleteOne(a)` — confirm then `removeEntries.mutate([a._id])`.
- `deleteSelected()` — confirm then `removeEntries.mutate(Array.from(selected))`.
- `toggleAll()` / `toggleOne(id)` — bulk selection helpers.
- `confirmOne(a)` — `resolve.mutate({ ids: [a._id], update: { type: typeFor(a), needsReview: false } })`.
- `confirmSelectedAsIs()` — clears the flag on selected (keeps each type): `update: { needsReview: false }`.
- `applyTypeToSelected()` — sets `bulkType` on all selected and confirms; resets `bulkType`.
- `confirmAll()` — clears flag on all `allIds`.
- Issue approve/reject inline handlers with `busy` state derived from mutation `isPending` + `variables`.

## Rendered UI sections
- Header with `FileCheck2` icon and description of the two review categories; "Confirm all as-is (N)" (only when `entries.length > 0`).
- Combined empty state (only when both `entries` and `issues` are empty and not loading).
- Public issue reports section: per-product Cards; each row shows severity badge, title, "public"/reporter/version/description meta, Reject (confirm→delete) and Approve buttons.
- Draft changelog entries section: `ReportsSkeleton` while loading; bulk action bar (select-all, "Set type…" select + "Apply & confirm", "Confirm as-is", "Delete"); per-product Cards; each row shows checkbox, type icon, title link to `/products/:id#activity-:id`, version label, `ConfidenceChip`, per-row type `Select`, Confirm and Delete buttons.
- Footer link to `/activities`.

## Important logic & design patterns
- Two independent review streams (issues vs activities) share one page with separate queries and invalidation namespaces.
- `needsReview` flag drives both queues; confirming/approving sets `needsReview: false`.
- Grouping by product via `useMemo` + `Map`, alphabetically sorted.
- Optimistic-ish selection cleanup: mutation `onSuccess` prunes affected ids from `selected` using the mutation `variables`.
- Per-row `busy` indicator via `mutation.isPending && mutation.variables...` to show spinners only on the affected row.
- `ConfidenceChip` surfaces provenance (`importConfidence` / `reviewReason`) to explain why each entry needs review.
- `htmlToPlainText` sanitizes issue descriptions for inline preview.
- `limit: -1` fetches all needs-review activities (no pagination).

## Relationships
- Reads/writes activities and issues services; changes here cascade (via `['activities']` / `['issues']` invalidation) to nav counts, product detail timelines, dashboard, and the public issues page.
- Links to product detail pages `/products/:id` (and `#activity-:id` anchors) and to `/activities`.
- Consumes ConfirmContext for destructive confirmations.
