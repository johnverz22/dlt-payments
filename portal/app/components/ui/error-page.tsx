import * as React from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  ServerCrash,
  WifiOff,
  RefreshCw,
  LogIn,
  Home,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

/**
 * Tone controls the icon and accent colour.  Default is neutral-grey,
 * danger is red (server/permission errors), warning is amber (rate limits,
 * session expiry).
 */
type Tone = 'default' | 'danger' | 'warning';

const TONE_CONFIG: Record<Tone, { Icon: React.ElementType; iconBg: string }> = {
  default: { Icon: AlertTriangle, iconBg: 'bg-surface-2 text-ink-3' },
  danger: { Icon: ShieldAlert, iconBg: 'bg-danger-subtle text-danger-ink' },
  warning: { Icon: Clock, iconBg: 'bg-warning-subtle text-warning-ink' },
};

export interface ErrorPageProps {
  title: string;
  description?: React.ReactNode;
  tone?: Tone;
  /** Override the default icon */
  icon?: React.ElementType;
  /** Primary action button (e.g. "Reload", "Try again") */
  primaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  /** Secondary action button (e.g. "Go to dashboard") */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  className?: string;
  /** Render with less vertical padding (for embedded use within a layout) */
  compact?: boolean;
}

export function ErrorPage({
  title,
  description,
  tone = 'default',
  icon: CustomIcon,
  primaryAction,
  secondaryAction,
  className,
  compact,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const { Icon, iconBg } = TONE_CONFIG[tone];
  const FinalIcon = CustomIcon ?? Icon;

  function handleAction(action: { onClick?: () => void; to?: string }) {
    if (action.onClick) {
      action.onClick();
    } else if (action.to) {
      navigate(action.to);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-10' : 'min-h-[60vh] py-20',
        className,
      )}
      role="alert"
    >
      <div className={cn('flex size-14 items-center justify-center rounded-full', iconBg)}>
        <FinalIcon className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-ink-3">{description}</p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && (
            <Button
              variant="primary"
              onClick={() => handleAction(primaryAction)}
            >
              <RefreshCw className="size-4" aria-hidden />
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              onClick={() => handleAction(secondaryAction)}
            >
              {secondaryAction.to === '/' && <Home className="size-4" aria-hidden />}
              {secondaryAction.to === '/login' && <LogIn className="size-4" aria-hidden />}
              {!secondaryAction.to && !secondaryAction.onClick && (
                <Home className="size-4" aria-hidden />
              )}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pre-configured variants for common spec scenarios ──────────────────────

/** 401: Session expired — clear session and redirect to login. */
export function SessionExpiredError({ returnTo }: { returnTo?: string }) {
  const loginUrl = '/login?reason=expired' + (returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : '');
  return (
    <ErrorPage
      tone="warning"
      icon={LogIn}
      title="Your session has expired"
      description="For security, you need to sign in again to continue."
      primaryAction={{ label: 'Sign in again', to: loginUrl }}
    />
  );
}

/** 403: Permission denied. */
export function ForbiddenError() {
  return (
    <ErrorPage
      tone="danger"
      icon={ShieldAlert}
      title="You don't have permission to do this"
      description="Your account role doesn't allow this action. Contact your administrator if you need access."
      primaryAction={{ label: 'Go to dashboard', to: '/' }}
    />
  );
}

/** 404: Resource not found — no cross-merchant disclosure. */
export function NotFoundError({
  resource = 'page',
}: {
  resource?: string;
} = {}) {
  return (
    <ErrorPage
      tone="default"
      icon={AlertTriangle}
      title={`This ${resource} isn't available`}
      description="It may have been removed, or you may not have access to it."
      primaryAction={{ label: 'Go to dashboard', to: '/' }}
    />
  );
}

/** 429: Rate limited — honor retry-after delay. */
export function RateLimitedError({ retryAfter }: { retryAfter?: number }) {
  return (
    <ErrorPage
      tone="warning"
      icon={Clock}
      title="Too many requests"
      description={
        retryAfter
          ? `Please wait ${retryAfter} ${retryAfter === 1 ? 'second' : 'seconds'} before trying again.`
          : 'Please wait a moment before trying again.'
      }
      primaryAction={{ label: 'Go to dashboard', to: '/' }}
    />
  );
}

/** 500/503: Server error — generic retryable, no internal details. */
export function ServerError() {
  return (
    <ErrorPage
      tone="danger"
      icon={ServerCrash}
      title="Something went wrong"
      description="We're having trouble right now. Try again in a moment. If the problem persists, contact DLT support."
      primaryAction={{ label: 'Try again', onClick: () => window.location.reload() }}
      secondaryAction={{ label: 'Go to dashboard', to: '/' }}
    />
  );
}

/** Network timeout / connectivity loss. */
export function NetworkError() {
  return (
    <ErrorPage
      tone="default"
      icon={WifiOff}
      title="Connection problem"
      description="We couldn't reach the server. Check your connection and try again."
      primaryAction={{ label: 'Try again', onClick: () => window.location.reload() }}
    />
  );
}
