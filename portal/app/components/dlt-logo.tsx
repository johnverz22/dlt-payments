import dltLogoSrc from '~/assets/dlt.png';
import { cn } from '~/lib/utils';

interface DltLogoProps {
  /** Size of the square icon in pixels */
  size?: number;
  /** Whether to show the text label alongside the icon */
  showText?: boolean;
  /** 'dark' = for the navy sidebar; 'surface' = for page surfaces */
  tone?: 'dark' | 'surface';
  /**
   * Wrap the logo in a white rounded tile — both light and dark themes.
   * Use on the sidebar and flyout drawer (always dark navy bg).
   */
  tile?: boolean;
  /**
   * Invert the logo to white in dark theme only, no box.
   * Use on the top bar where no square is wanted.
   */
  invertDark?: boolean;
  /** Render "DLT Portal · Merchant" on a single line (top bar use) */
  compact?: boolean;
  className?: string;
}

export function DltLogo({
  size = 32,
  showText = true,
  tone = 'dark',
  tile = false,
  invertDark = false,
  compact = false,
  className,
}: DltLogoProps) {
  const img = (
    <img
      src={dltLogoSrc}
      alt="DLT logo"
      width={size}
      height={size}
      className={cn(
        'shrink-0 rounded-md',
        invertDark && 'dark:brightness-0 dark:invert',
      )}
      aria-hidden={showText ? true : undefined}
    />
  );

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {tile ? (
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1">
          {img}
        </span>
      ) : (
        img
      )}
      {showText && (
        compact ? (
          <span
            className={cn(
              'whitespace-nowrap text-sm font-bold tracking-tight',
              tone === 'dark' ? 'text-white' : 'text-ink',
            )}
          >
            DLT Portal{' '}
            <span
              className={cn(
                'text-[10px] font-medium tracking-widest uppercase',
                tone === 'dark' ? 'text-sidebar-muted' : 'text-ink-3',
              )}
            >
              · Merchant
            </span>
          </span>
        ) : (
          <div className="flex flex-col leading-none">
            <span
              className={cn(
                'text-sm font-bold tracking-tight',
                tone === 'dark' ? 'text-white' : 'text-ink',
              )}
            >
              DLT Portal
            </span>
            <span
              className={cn(
                'mt-0.5 text-[10px] font-medium tracking-widest uppercase',
                tone === 'dark' ? 'text-sidebar-muted' : 'text-ink-3',
              )}
            >
              Merchant
            </span>
          </div>
        )
      )}
    </div>
  );
}
