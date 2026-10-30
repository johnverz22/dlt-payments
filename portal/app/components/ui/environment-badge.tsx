import { FlaskConical, RadioTower } from 'lucide-react';
import { cn } from '~/lib/utils';

/**
 * Prominent TEST/LIVE environment pill for the top bar.
 * TEST = amber, LIVE = green. Always accompanied by text — never color alone.
 */
export function EnvironmentBadge({ isProd }: { isProd: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        isProd
          ? 'border-transparent bg-success-subtle text-success-ink'
          : 'border-transparent bg-warning-subtle text-warning-ink',
      )}
    >
      {isProd ? (
        <RadioTower className="size-3.5" aria-hidden />
      ) : (
        <FlaskConical className="size-3.5" aria-hidden />
      )}
      {isProd ? 'Live' : 'Test'}
    </span>
  );
}
