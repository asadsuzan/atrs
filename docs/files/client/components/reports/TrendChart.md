# `client/src/components/reports/TrendChart.tsx`
**Purpose:** Recharts stacked bar chart of changelog activity over time (per-month Features / Improvements / Bug Fixes).
**Language / Size:** TSX / 1261 bytes

## Exports
- `TrendChart({ data })` (named component).

## Imports (Internal / External)
- External: `ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid` (recharts).

## Props
- `data: any[]` (each item expected to have `month`, `features`, `improvements`, `bugFixes`).

## State / Refs / Context consumed
None.

## Hooks & Effects (deps, purpose)
None.

## Functions & handlers
None (pure render).

## Rendered UI
- If `!data || data.length === 0` → "No data available" placeholder.
- Otherwise a 300px-tall `ResponsiveContainer` → `BarChart` with a horizontal-only `CartesianGrid`, `XAxis dataKey="month"`, `YAxis`, styled `Tooltip`, circle-icon `Legend`, and three stacked `Bar`s (stackId "a"): Features (`#3b82f6`, bottom-rounded), Improvements (`#a855f7`), Bug Fixes (`#ef4444`, top-rounded).

## Important logic & design patterns
- Shared category color scheme (matches `DonutChart`/Reports).
- Rounded radii on the top/bottom bars give the stack a pill-capped look.
- Empty-data guard.

## Relationships (contexts used: JobStreamContext, ChangelogGenContext, WindowManagerContext, NotificationContext; used by App.tsx global surfaces)
- No contexts. A presentational chart used by the Reports page (not an App.tsx global surface).
