# `client/src/pages/Reports.tsx`

**Purpose / Route:** Reports page at `/reports`. Two tabs: **Detailed Report** (monthly / custom date-range report of product activities with summary tiles, per-product expandable cards, version filter) and **Annual Summary** (yearly totals + monthly breakdown). Supports a full-screen Presentation (townhall) deck and exports to PDF, PPTX, CSV, and JSON.
**Language / Size:** TSX / 38881 bytes

## Exports
- `default function Reports()`.
- (Module-internal) `ReportActivityCard`, `ReportActivitySection`, `ProductReportCard`; `months` array constant.

## Imports (Internal / External)
**External:** react (useState, useEffect, useRef); react-router-dom (useSearchParams); @tanstack/react-query (useQuery); lucide-react icons (Package, PlusCircle, Wrench, Bug, Calendar as CalendarIcon, ChevronDown, Download, Tag, Presentation); jspdf (jsPDF); html2canvas; pptxgenjs (pptxgen); sonner (toast); framer-motion (motion, AnimatePresence).
**Internal services:** ../services/reports (getMonthlyReport, getAnnualReport); ../services/products (getProducts); ../services/users (getUsers).
**Internal hooks/contexts/lib:** ../contexts/AuthContext (useAuth); ../hooks/useLocalStorage; ../hooks/useVersions (useAllVersions); @/lib/richText (htmlToPlainText).
**Internal UI/components:** @/components/ui/* (button, card, input, select, DatePicker, badge, RichText, dropdown-menu, skeletons ReportsSkeleton, media-carousel, AuthorAvatar); ../components/versions/VersionBadge; ../components/layout/PageTransition; ../components/reports/PresentationMode.

## Component tree & sub-components defined
- Reports (default)
  - PageTransition
  - Header + tab bar (Detailed Report / Annual Summary)
  - Monthly tab: filter/config bar (Month+Year OR custom Start/End DatePickers; User select [admin]; Product select; Version select; buttons: toggle range, Generate, Present, Export dropdown) then summary tiles (Products/Features/Improvements/BugFixes) then Product Reports list of ProductReportCard (inside reportRef div captured for PDF)
  - Annual tab: Year/User/Product filters + Generate + Export JSON then summary tiles + monthly breakdown grid of Cards
  - PresentationMode overlay when presenting
- ProductReportCard — sticky product header (icon, name, category, activity count, feature/improvement/bugfix counts) + collapsible body of 3x ReportActivitySection. Local expandedLocal state, overridden by forceExpanded.
- ReportActivitySection — filters activities by type, colored heading + count badge, grid of ReportActivityCard.
- ReportActivityCard — collapsible card (local isOpenLocal, overridden by forceExpanded): title, version badge, date, author avatar, MediaCarousel, RichText description, sub-items.

## State / Refs / Context consumed
**State:** activeTab ('monthly'|'annual'); persisted-to-localStorage: month, year, productId, ownerId, startDate, endDate (via useLocalStorage keys atrs_reports_*); useCustomRange; versionFilter; annualYear; monthlyQueryArgs; annualQueryArgs; forceExpand; presenting.
**Refs:** reportRef (the report DOM captured by html2canvas for PDF).
**Context/hooks:** useAuth() -> isAdmin; useAllVersions() -> labelInfo (label to status map for badging).

## Hooks & Effects (deps, purpose, WHY)
- useLocalStorage(...): persists filter selections across sessions.
- useEffect([searchParams]): deep-link support — reads ?tab, ?month, ?year; auto-sets tab and query args and generates matching report. WHY: sidebar navigates here with preset params.
- Queries listed below. monthlyReport uses placeholderData: (prev) => prev — keeps current report on screen while a new month loads so the presentation deck does not blank when stepping months.

## Data fetching (services/endpoints; react-query keys/mutations)
- useQuery(['products']) -> getProducts().
- useQuery(['users']) -> getUsers(), enabled: isAdmin.
- useQuery(['report-monthly', monthlyQueryArgs]) -> getMonthlyReport({ month, year, productId, ownerId, startDate, endDate }); month/year sent only when NOT a custom range (startDate empty); 'all' values sent as undefined.
- useQuery(['report-annual', annualQueryArgs]) -> getAnnualReport({ year, productId, ownerId }).
No mutations. Generation is triggered by copying UI state into monthlyQueryArgs/annualQueryArgs (which are the query keys).

## Event handlers & key functions (purpose, algorithm, side effects)
- shiftMonth(delta): steps presented month by +-1 (wraps years via zero-based math), syncs toolbar month/year and monthlyQueryArgs.
- canNextMonth: guards against stepping past current calendar month.
- handleGenerateMonthly / handleGenerateAnnual: commit filter state into query args (start/end only when useCustomRange).
- displayedMonthlyReport (IIFE): applies client-side versionFilter — filters each product's activities via matchesVersion, recomputes per-product counts + top summary, drops emptied products. Returns raw report when filter is 'all'.
- escapeCsv(value): quotes/escapes CSV fields containing quote, comma, or newline.
- Export handlers (see below).

## Rendered UI sections
1. Title + tab bar. 2. Monthly: config bar (month/year vs custom-range toggle, admin user select, product select, conditional version select with Unreleased/Latest badges, Generate/Present/Export buttons) then summary tile grid then Product Reports (sticky headers, expandable). 3. Annual: year/user/product filters then summary tiles then monthly breakdown card grid. 4. PresentationMode overlay.

## Export/generation logic (how PDF/PPTX/PNG produced, which libs)
- **PDF (exportMonthlyPDF)**: uses html2canvas + jsPDF. Steps: (1) set forceExpand=true so every card renders expanded; (2) await 350ms for layout to settle; (3) html2canvas(reportRef.current, { scale: 2 }) -> canvas; (4) canvas.toDataURL('image/png'); (5) new jsPDF({ orientation:'portrait', unit:'px', format:[canvas.width, canvas.height] }); (6) pdf.addImage(imgData,'PNG',0,0,w,h); (7) pdf.save('Monthly_Report_<Month>_<Year>.pdf'); finally resets forceExpand=false. Toasts on error. (This is also the PNG-capture path — html2canvas rasterizes the DOM to a PNG embedded in the PDF.)
- **PPTX (handleExportPPTX)**: uses pptxgenjs. Builds new pptxgen(). Slide 1: title "Monthly Report" + period label + bulleted summary (products/features/improvements/bugFixes from displayedMonthlyReport.summary). Then one slide per product: product name heading + up to 12 activity bullets [type] title (versionLabel), or a "No activities" note. pres.writeFile({ fileName: 'Monthly_Report_<Month>_<Year>.pptx' }). Toasts on error.
- **CSV (handleExportCSV)**: builds rows (header Product/Category/Type/Title/Version/Date/Description) iterating products then activities, escapes via escapeCsv, uses htmlToPlainText for description, Blob text/csv, downloads Monthly_Report_<Month>_<Year>.csv.
- **JSON (handleExportJSON)**: serializes displayedMonthlyReport (monthly) or annualReport (annual) via JSON.stringify(...,2) into a data:text/json URI, downloads <tab>_Report.json.

## Important logic & design patterns
- Sub-components at module scope to preserve local expand/collapse state across parent re-renders (documented in comments; inline definitions remounted on every keystroke).
- forceExpand state drives both the PDF-capture expansion and per-card forceExpanded prop.
- Version filter is cross-product and label-keyed (useAllVersions().labelInfo), unioned across products; first option treated as "latest" badge.
- Query args pattern: generation = copy UI state into the query-key object.
- LocalStorage persistence of filter selections.

## Relationships
- Consumes services reports, products, users; hooks useAllVersions, useLocalStorage; AuthContext for admin gating.
- Renders PresentationMode (townhall deck) for displayedMonthlyReport.
- Shares version-status data source (useAllVersions) with other version-aware pages.
- Reached from sidebar with optional ?tab/?month/?year deep-link params.
