import * as React from 'react';
import { cn } from '~/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-line bg-surface shadow-card', className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3 border-b border-line px-5 py-4', className)}
      {...props}
    >
      {title !== undefined || description !== undefined ? (
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
        </div>
      ) : (
        children
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-t border-line bg-surface-2/50 px-5 py-3', className)}
      {...props}
    />
  );
}
