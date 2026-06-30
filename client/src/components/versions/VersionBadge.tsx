import { cn } from '@/lib/utils';

export type VersionBadgeKind = 'latest' | 'unreleased' | 'released';

const SIZE_CLASSES: Record<'xs' | 'sm', string> = {
  xs: 'px-1.5 py-0.5 text-[9px] gap-1',
  sm: 'px-2 py-0.5 text-[10px] gap-1',
};

/**
 * The one badge used wherever a version's "Latest" / "Unreleased" / "Released"
 * state is shown — version tables, selector options, activity cards, changelogs.
 * Keeping it here guarantees the colours and wording stay identical app-wide.
 */
export function VersionBadge({
  kind,
  size = 'sm',
  className,
}: {
  kind: VersionBadgeKind;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const base = cn(
    'inline-flex items-center rounded-full font-bold tracking-wider uppercase whitespace-nowrap',
    SIZE_CLASSES[size],
  );
  const dot = size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5';

  if (kind === 'unreleased') {
    return (
      <span
        className={cn(
          base,
          'bg-amber-100 text-amber-800 ring-1 ring-amber-500/30 dark:bg-amber-900/50 dark:text-amber-300',
          className,
        )}
      >
        <span className={cn('rounded-full bg-amber-500', dot)} />
        Unreleased
      </span>
    );
  }

  if (kind === 'latest') {
    return (
      <span
        className={cn(
          base,
          'bg-green-100 text-green-800 ring-1 ring-green-500/30 dark:bg-green-900/40 dark:text-green-300',
          className,
        )}
      >
        Latest
      </span>
    );
  }

  return (
    <span
      className={cn(
        base,
        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        className,
      )}
    >
      Released
    </span>
  );
}
