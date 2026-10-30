import * as React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '~/lib/utils';

const VARIANTS = {
  info: { classes: 'border-line bg-info-subtle text-info-ink', Icon: Info },
  success: { classes: 'border-line bg-success-subtle text-success-ink', Icon: CheckCircle2 },
  warning: { classes: 'border-line bg-warning-subtle text-warning-ink', Icon: AlertTriangle },
  danger: { classes: 'border-line bg-danger-subtle text-danger-ink', Icon: AlertCircle },
} as const;

/**
 * Inline feedback banner. Use `role="alert"` for messages that appear as a
 * result of a failed action; informational callouts keep the default role.
 */
export function Callout({
  variant = 'info',
  role,
  className,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  role?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { classes, Icon } = VARIANTS[variant];
  return (
    <div
      role={role}
      className={cn('flex items-start gap-2.5 rounded-lg border p-3.5 text-sm', classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 [&_a]:font-medium [&_a]:underline">{children}</div>
    </div>
  );
}
