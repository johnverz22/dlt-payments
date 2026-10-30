import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '~/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Radix Dialog with themed overlay + panel. Focus trap, Esc-to-close and
 * scroll-lock come from Radix. `title`/`description` wire aria labelling.
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  icon,
  hideClose,
}: {
  className?: string;
  children: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
          'rounded-xl border border-line bg-surface shadow-card focus:outline-none',
          className,
        )}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {icon}
          <div className="min-w-0 flex-1">
            <DialogPrimitive.Title className="text-base font-semibold text-ink">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-ink-2">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {!hideClose && (
            <DialogPrimitive.Close
              className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close dialog"
            >
              <X className="size-4" aria-hidden />
            </DialogPrimitive.Close>
          )}
        </div>
        <div className="px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
