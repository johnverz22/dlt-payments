import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '~/lib/utils';

/** Shared class strings for Radix dropdown menus — one styling source. */
export const menuContentClass = cn(
  'z-50 min-w-[220px] rounded-xl border border-line bg-surface p-1 shadow-card',
);

export const menuItemClass = cn(
  'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none transition-colors',
  'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
);

export const menuSeparatorClass = 'my-1 h-px bg-line';

export { DropdownMenu };
