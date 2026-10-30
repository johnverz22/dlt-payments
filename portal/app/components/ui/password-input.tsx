import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '~/lib/utils';
import { controlClass } from './input';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean;
}

/** Password field with a show/hide toggle on the right edge. */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, invalid, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'h-9 pr-10', invalid && 'border-danger', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 transition-colors hover:text-ink-2"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
