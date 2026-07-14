# `client/src/components/ui/DatePicker.tsx`
**Purpose:** Self-contained calendar date picker (built on the Popover primitive + date-fns) with day/month/year drill-in views, min/max range clamping, a Today shortcut, and optional clear.
**Language / Size:** TSX / 12650 bytes

## Exports
- `DatePicker(props: DatePickerProps)` (named component).

## Props (`DatePickerProps`)
- `value: string` — ISO date `YYYY-MM-DD` or empty string (controlled).
- `onChange: (value: string) => void` — emits a `yyyy-MM-dd` string, or `''` on clear.
- `placeholder?: string` (default `'Pick a date'`).
- `className?: string` — extra classes on the trigger button.
- `min?: string`, `max?: string` — ISO bounds for selectable dates.
- `disabled?: boolean` (default `false`).
- `clearable?: boolean` (default `true`).

## Imports (Internal / External)
- Internal: `Popover, PopoverContent, PopoverTrigger` (`./popover`), `Button` (`./button`), `cn` (`@/lib/utils`).
- External: date-fns (`format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, addDays, addMonths, subMonths, setMonth, setYear, getMonth, getYear, isSameMonth, isSameDay, isToday, parseISO, isValid`); lucide-react (`CalendarIcon, ChevronLeft, ChevronRight, X`).

## State / Refs / Context consumed
- `open` — popover open state.
- `viewDate: Date` — currently displayed month/year page.
- `view: 'days' | 'months' | 'years'` — active grid.
- `parsed` — derived (not state): `parseISO(value)` when valid, else `null`.
- `minDate` / `maxDate` — derived from `min`/`max`.

## Behavior / Rendering
- Trigger: a button showing a calendar icon + formatted date (`MMM d, yyyy`) or placeholder; renders a clickable `X` clear affordance (`role=button`, Enter-key handled) when `clearable && parsed`.
- Opening the popover resets `view` to `'days'` and `viewDate` to `parsed ?? new Date()`. When `disabled`, `onOpenChange` is `undefined` (locked closed).
- **Days view:** builds a full 6-week grid from `startOfWeek(startOfMonth)` to `endOfWeek(endOfMonth)`; each day button flags in-month, selected, today, out-of-range and styles accordingly. Out-of-range or out-of-month days are disabled.
- **Months view:** 3-col grid of 12 short month names; disabled per `isMonthOutOfRange`. Selecting sets `viewDate` and drops back to days.
- **Years view:** 3-col grid of a 12-year page (`yearPageStart = year - year % 12`); disabled per `isYearOutOfRange`. Selecting drills into months.
- Header label + arrows adapt to the view: days step by month, months step by year, years step by 12-year page. Clicking the label drills out (days→months→years); disabled at years.
- Footer: a "Today" shortcut (only applies if today is in range) and a "Clear" link (when `parsed`).

## Functions & handlers
- `isOutOfRange(d)`, `isMonthOutOfRange(d)` (whole month must be out), `isYearOutOfRange(year)` — range guards.
- `handleSelect(d)` — ignores out-of-range; else emits `format(d,'yyyy-MM-dd')` and closes.
- `handleClear(e)` — stops propagation, emits `''` (keeps popover state).
- `goPrev` / `goNext`, `onHeaderClick`, `headerLabel` — navigation.

## Data structures / Types / Constants
- `WEEKDAYS` (Su–Sa), `MONTHS_SHORT` (Jan–Dec), `YEARS_PER_PAGE = 12`.

## Relationships
- No contexts. Wraps `Popover`/`Button`; used by filter bars and forms needing date input (e.g. Activities/Audit filters, changelog date fields).

## Edge cases & known limitations
- Invalid `value`/`min`/`max` strings are treated as null (no crash) via `isValid(parseISO(...))`.
- `handleClear` is invoked from an `onKeyDown` cast as `any` (`handleClear(e as any)`); it only uses `stopPropagation`, so the cast is benign.
- Week starts Sunday (date-fns default locale); not configurable via props.
