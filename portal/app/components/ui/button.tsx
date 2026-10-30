import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover',
        secondary:
          'border border-line bg-surface text-ink hover:bg-surface-2',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger text-on-danger hover:brightness-95 dark:hover:brightness-110',
        'danger-outline': 'border border-line bg-surface text-danger-ink hover:bg-danger-subtle',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-9 px-4 [&_svg]:size-4',
        lg: 'h-10 px-5 [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
