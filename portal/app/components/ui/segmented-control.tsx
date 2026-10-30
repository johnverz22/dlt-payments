import { cn } from '~/lib/utils';

/**
 * Segmented button group (e.g., dashboard date presets).
 * Renders as a radiogroup — the selected segment is aria-checked.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex overflow-x-auto rounded-lg border border-line bg-surface p-0.5',
        // Hide scrollbar visually but keep it functional
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              // shrink-0 so buttons keep their natural width and the container scrolls
              'shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150',
              selected ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
