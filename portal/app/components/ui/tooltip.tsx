import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from '~/lib/utils';

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2 shadow-card',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-surface" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/** Small (i) icon that reveals an explanatory tooltip — keyboard focusable. */
export function InfoTip({ content, label }: { content: React.ReactNode; label?: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={label ?? 'More information'}
        className="inline-flex size-4 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink-2"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
    </Tooltip>
  );
}
