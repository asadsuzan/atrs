# `client/src/components/reports/DonutChart.tsx`
**Purpose:** Recharts donut (pie with inner radius) breaking changelog activity into Features / Improvements / Bug Fixes.
**Language / Size:** TSX / 1331 bytes

## Exports
- `DonutChart({ data })` (named component).

## Imports (Internal / External)
- External: `PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend` (recharts).

## Props
- `data: { features: number, improvements: number, bugFixes: number }`.

## State / Refs / Context consumed
None.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
None (pure render).

## Rendered UI
- Builds `chartData` for Features (`#3b82f6`), Improvements (`#a855f7`), Bug Fixes (`#ef4444`), each `value || 0`, then filters out zero values.
- If no non-zero data → "No data available" placeholder.
- Otherwise a 250px-tall `ResponsiveContainer` → `PieChart` with a donut `Pie` (innerRadius 60, outerRadius 80, paddingAngle 5), one `Cell` per slice, a styled `Tooltip`, and a bottom circle-icon `Legend`.

## Important logic & design patterns
- Fixed category color scheme shared with `TrendChart` and Reports.
- Empty-data guard prevents rendering an empty chart.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No contexts. A presentational chart used by the Reports page (not an App.tsx global surface).
