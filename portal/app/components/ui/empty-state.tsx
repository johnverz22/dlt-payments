import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-center',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      {Icon && (
        <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink-3">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
