import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  addDays,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  getMonth,
  getYear,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
} from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) or empty string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Minimum selectable date as ISO string */
  min?: string;
  /** Maximum selectable date as ISO string */
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Number of years shown per page in the year grid. */
const YEARS_PER_PAGE = 12;

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  min,
  max,
  disabled = false,
  clearable = true,
}: DatePickerProps) {
  const parsed = value && isValid(parseISO(value)) ? parseISO(value) : null;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(parsed ?? new Date());
  // 'days' = day grid, 'months' = month grid (one year), 'years' = year grid.
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');

  const minDate = min && isValid(parseISO(min)) ? parseISO(min) : null;
  const maxDate = max && isValid(parseISO(max)) ? parseISO(max) : null;

  const isOutOfRange = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  // A whole month/year is disabled only when every day in it is out of range.
  const isMonthOutOfRange = (d: Date) => {
    if (minDate && endOfMonth(d) < minDate) return true;
    if (maxDate && startOfMonth(d) > maxDate) return true;
    return false;
  };
  const isYearOutOfRange = (year: number) => {
    const d = setYear(viewDate, year);
    if (minDate && endOfYear(d) < minDate) return true;
    if (maxDate && startOfYear(d) > maxDate) return true;
    return false;
  };

  const handleSelect = (d: Date) => {
    if (isOutOfRange(d)) return;
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Build calendar grid
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    days.push(cur);
    cur = addDays(cur, 1);
  }

  // The first year shown in the year grid (12-year page containing viewDate).
  const yearPageStart = getYear(viewDate) - (getYear(viewDate) % YEARS_PER_PAGE);

  // Header arrows step by month / year / 12-year page depending on the view.
  const goPrev = () => {
    if (view === 'days') setViewDate(subMonths(viewDate, 1));
    else if (view === 'months') setViewDate(setYear(viewDate, getYear(viewDate) - 1));
    else setViewDate(setYear(viewDate, getYear(viewDate) - YEARS_PER_PAGE));
  };
  const goNext = () => {
    if (view === 'days') setViewDate(addMonths(viewDate, 1));
    else if (view === 'months') setViewDate(setYear(viewDate, getYear(viewDate) + 1));
    else setViewDate(setYear(viewDate, getYear(viewDate) + YEARS_PER_PAGE));
  };

  const headerLabel =
    view === 'days' ? format(viewDate, 'MMMM yyyy')
    : view === 'months' ? format(viewDate, 'yyyy')
    : `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`;

  // Clicking the header drills out: days → months → years.
  const onHeaderClick = () => setView(view === 'days' ? 'months' : 'years');

  return (
    <Popover
      open={open}
      onOpenChange={disabled ? undefined : (o) => { setOpen(o); if (o) { setView('days'); setViewDate(parsed ?? new Date()); } }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !parsed && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          <span className="flex-1 text-left">
            {parsed ? format(parsed, 'MMM d, yyyy') : placeholder}
          </span>
          {clearable && parsed && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 w-[280px]">
          {/* Navigation: arrows step by month/year/decade; the label drills out */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goPrev}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={onHeaderClick}
              disabled={view === 'years'}
              className={cn(
                'text-sm font-semibold rounded-md px-2 py-1 transition-colors',
                view !== 'years' && 'hover:bg-accent hover:text-accent-foreground cursor-pointer'
              )}
            >
              {headerLabel}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goNext}
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {view === 'days' && (
            <>
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-center text-[11px] font-medium text-muted-foreground py-1"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day, i) => {
                  const inMonth = isSameMonth(day, viewDate);
                  const selected = parsed ? isSameDay(day, parsed) : false;
                  const today = isToday(day);
                  const outOfRange = isOutOfRange(day);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={outOfRange || !inMonth}
                      onClick={() => handleSelect(day)}
                      className={cn(
                        'h-8 w-full rounded-md text-sm font-normal transition-all',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        !inMonth && 'opacity-20 pointer-events-none',
                        inMonth && !selected && !outOfRange && 'hover:bg-accent hover:text-accent-foreground',
                        today && !selected && 'border border-primary/40 text-primary font-medium',
                        selected && 'bg-primary text-primary-foreground font-semibold shadow-sm',
                        outOfRange && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const cellDate = setMonth(viewDate, i);
                const isSel = parsed && getYear(parsed) === getYear(viewDate) && getMonth(parsed) === i;
                const isCurrent = getMonth(viewDate) === i;
                const outOfRange = isMonthOutOfRange(cellDate);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={outOfRange}
                    onClick={() => { setViewDate(cellDate); setView('days'); }}
                    className={cn(
                      'h-9 rounded-md text-sm font-normal transition-all',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      !outOfRange && !isSel && 'hover:bg-accent hover:text-accent-foreground',
                      isCurrent && !isSel && 'border border-primary/40 text-primary font-medium',
                      isSel && 'bg-primary text-primary-foreground font-semibold shadow-sm',
                      outOfRange && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i).map((yr) => {
                const isSel = parsed && getYear(parsed) === yr;
                const isCurrent = getYear(viewDate) === yr;
                const outOfRange = isYearOutOfRange(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    disabled={outOfRange}
                    onClick={() => { setViewDate(setYear(viewDate, yr)); setView('months'); }}
                    className={cn(
                      'h-9 rounded-md text-sm font-normal transition-all',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      !outOfRange && !isSel && 'hover:bg-accent hover:text-accent-foreground',
                      isCurrent && !isSel && 'border border-primary/40 text-primary font-medium',
                      isSel && 'bg-primary text-primary-foreground font-semibold shadow-sm',
                      outOfRange && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer: Today shortcut */}
          <div className="mt-3 pt-2 border-t flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (!isOutOfRange(today)) {
                  onChange(format(today, 'yyyy-MM-dd'));
                  setOpen(false);
                }
              }}
              className="text-xs text-primary hover:underline"
            >
              Today
            </button>
            {parsed && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-destructive hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
