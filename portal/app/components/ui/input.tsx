import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '~/lib/utils';

/** Shared control styling — single source for inputs, selects, textareas. */
export const controlClass =
  'w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors placeholder:text-ink-3/70 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3 aria-[invalid=true]:border-danger';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, 'h-9', invalid && 'border-danger', className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Native select — themed, with its own chevron so it works in dark mode. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className={cn('relative overflow-visible', className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlClass,
          'h-9 cursor-pointer appearance-none pr-8',
          invalid && 'border-danger',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </div>
  ),
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlClass, 'py-2', invalid && 'border-danger', className)}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
