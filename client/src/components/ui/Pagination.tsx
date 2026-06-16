import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Rows-per-page; pass with onLimitChange to show the selector. */
  limit?: number;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  /** Total item count, shown as "N items" when provided. */
  total?: number;
  className?: string;
}

/** Builds a compact page list with ellipses: 1 … 4 5 6 … 20 */
function getPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

/**
 * Reusable table pagination: rows-per-page selector, first/prev/next/last,
 * numbered page jump buttons, and a "go to page" input.
 */
export function Pagination({
  page, totalPages, onPageChange,
  limit, onLimitChange, limitOptions = [10, 25, 50, 100],
  total, className,
}: PaginationProps) {
  const [jump, setJump] = useState('');
  const pageCount = Math.max(1, totalPages);
  const clamp = (p: number) => Math.min(Math.max(1, p), pageCount);
  const go = (p: number) => onPageChange(clamp(p));

  const submitJump = () => {
    const n = parseInt(jump, 10);
    if (!isNaN(n)) go(n);
    setJump('');
  };

  const pages = getPageList(page, pageCount);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-sm ${className || ''}`}>
      <div className="flex items-center gap-3 text-muted-foreground">
        {onLimitChange && limit !== undefined && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <Select value={String(limit)} onValueChange={(v) => onLimitChange(parseInt(v, 10))}>
              <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {limitOptions.map((o) => <SelectItem key={o} value={String(o)}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {typeof total === 'number' && <span>{total} item{total !== 1 ? 's' : ''}</span>}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1.5 text-muted-foreground select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => go(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          )
        )}

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => go(pageCount)} disabled={page >= pageCount} aria-label="Last page">
          <ChevronsRight className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 ml-2">
          <Input
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') submitJump(); }}
            placeholder={String(page)}
            className="h-8 w-14 text-center"
            aria-label="Go to page"
          />
          <Button variant="outline" size="sm" className="h-8" onClick={submitJump} disabled={!jump}>Go</Button>
        </div>
      </div>
    </div>
  );
}
