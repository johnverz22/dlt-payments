import * as React from 'react';
import { cn } from '~/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
      {...props}
    />
  );
}

/** Muted chart placeholder: fake axes + bars, centered message overlay. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      <div className="flex h-[180px] items-end gap-2 border-b border-l border-line px-3 pb-0">
        {[55, 80, 40, 95, 65, 75, 50, 88, 60, 70, 45, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t-sm bg-surface-2"
            style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="flex justify-between px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-10" />
        ))}
      </div>
    </div>
  );
}
