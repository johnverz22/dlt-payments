import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '~/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 border-b border-line', className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-3 transition-colors',
        'hover:border-line-strong hover:text-ink-2',
        'data-[state=active]:border-primary data-[state=active]:text-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('pt-5 focus-visible:outline-none', className)}
      {...props}
    />
  );
}
