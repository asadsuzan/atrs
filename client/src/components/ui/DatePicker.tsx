import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
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

  const minDate = min && isValid(parseISO(min)) ? parseISO(min) : null;
  const maxDate = max && isValid(parseISO(max)) ? parseISO(max) : null;

  const isOutOfRange = (d: Date) => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
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

  const prevMonth = () => setViewDate(subMonths(viewDate, 1));
  const nextMonth = () => setViewDate(addMonths(viewDate, 1));

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
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
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

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
