import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-ink-2',
        primary: 'bg-primary-subtle text-primary',
        success: 'bg-success-subtle text-success-ink',
        warning: 'bg-warning-subtle text-warning-ink',
        danger: 'bg-danger-subtle text-danger-ink',
        'danger-solid': 'bg-danger text-on-danger',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className={cn('size-1.5 rounded-full', {
            'bg-ink-3': variant === 'neutral' || variant == null,
            'bg-primary': variant === 'primary',
            'bg-success': variant === 'success',
            'bg-warning': variant === 'warning',
            'bg-danger': variant === 'danger' || variant === 'danger-solid',
            'bg-on-danger': variant === 'danger-solid',
          })}
        />
      )}
      {children}
    </span>
  );
}

const TX_STATUS_VARIANT = {
  PAID: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
} as const;

/** Transaction status pill — text + dot, never color alone. */
export function StatusPill({ status }: { status: 'PAID' | 'PENDING' | 'REJECTED' }) {
  return <Badge variant={TX_STATUS_VARIANT[status]} dot>{status}</Badge>;
}

const INV_STATUS_VARIANT = {
  pending: 'warning',
  accepted: 'success',
  expired: 'neutral',
  revoked: 'danger',
} as const;

export function InvitationStatusPill({
  status,
}: {
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}) {
  return (
    <Badge variant={INV_STATUS_VARIANT[status]} dot>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
