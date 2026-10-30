import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Tooltip } from './tooltip';

export function CopyButton({
  value,
  label = 'Copy to clipboard',
  showText = false,
  className,
}: {
  value: string;
  label?: string;
  showText?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (permissions) — nothing else to do
    }
  }

  const button = (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-xs text-ink-2 transition-colors hover:bg-surface-2',
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {showText && (copied ? 'Copied' : 'Copy')}
    </button>
  );

  return (
    <>
      <Tooltip content={copied ? 'Copied' : label}>{button}</Tooltip>
      <span className="sr-only" role="status">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}
