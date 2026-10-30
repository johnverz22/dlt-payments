import * as React from 'react';
import { cn } from '~/lib/utils';

let fieldSeq = 0;

/**
 * Label + control + hint + error, wired for a11y:
 * label[htmlFor], aria-describedby (hint/error), aria-invalid, role=alert.
 * Pass a single form control as children — ids are injected via cloneElement.
 */
export function FormField({
  label,
  name,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  name?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactElement;
}) {
  const generated = React.useId();
  const id = name ?? generated;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id,
    name: (children.props as { name?: string }).name ?? id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : (children.props as Record<string, unknown>)['aria-invalid'],
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Read-only "field": surface-2 chip with a lock icon — clearly not editable. */
export function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="block text-sm font-medium text-ink-2">{label}</span>
      <div className="flex h-9 items-center gap-2 rounded-lg bg-surface-2 px-3 text-sm text-ink-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 shrink-0 text-ink-3"
          aria-hidden
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="truncate">{value ?? '—'}</span>
      </div>
    </div>
  );
}
