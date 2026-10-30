import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

/** Shared "Page X of Y · N total" + Prev/Next pager. */
export function Pagination({
  currentPage,
  lastPage,
  total,
  noun,
  onPage,
  className,
}: {
  currentPage: number;
  lastPage: number;
  total?: number;
  noun?: string;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (lastPage <= 1) return null;
  return (
    <div className={className ?? 'flex flex-wrap items-center justify-between gap-2'}>
      <p className="text-xs text-ink-3">
        Page <span className="tnum">{currentPage}</span> of <span className="tnum">{lastPage}</span>
        {total != null && (
          <>
            {' '}
            · <span className="tnum">{total}</span> {noun ?? 'total'}
          </>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden /> Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(currentPage + 1)}
          disabled={currentPage >= lastPage}
          aria-label="Next page"
        >
          Next <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
