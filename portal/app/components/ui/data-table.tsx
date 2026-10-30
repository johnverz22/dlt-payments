import * as React from 'react';
import { cn } from '~/lib/utils';

/**
 * DataTable — semantic <table> inside a scrollable card with a sticky,
 * token-colored header. Horizontal scroll is contained inside this element
 * (allowed by spec; the page itself never scrolls sideways).
 */
export function DataTable({
  children,
  className,
  minWidth = '640px',
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-line bg-surface', className)}>
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-surface-2">
      <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wider text-ink-3">
        {children}
      </tr>
    </thead>
  );
}

export function Th({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      scope="col"
      className={cn('px-4 py-3', align === 'right' && 'text-right', align === 'center' && 'text-center', className)}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({
  children,
  className,
  onClick,
  interactive,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-surface-2/60',
        interactive && 'cursor-pointer focus-visible:bg-surface-2',
        className,
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'link' : undefined}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-3 text-ink-2',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}
