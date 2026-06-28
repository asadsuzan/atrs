import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'grid';

/** Segmented control to switch a list between a table and a card grid. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}) {
  const options: { v: ViewMode; icon: React.ElementType; label: string }[] = [
    { v: 'table', icon: List, label: 'Table view' },
    { v: 'grid', icon: LayoutGrid, label: 'Card view' },
  ];
  return (
    <div className={cn('inline-flex items-center rounded-lg border bg-card p-0.5 shadow-sm', className)}>
      {options.map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          aria-label={label}
          aria-pressed={value === v}
          title={label}
          onClick={() => onChange(v)}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
            value === v
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
