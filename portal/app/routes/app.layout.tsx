import {
  Form,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useMatches,
  useRouteError,
  isRouteErrorResponse,
  Link,
} from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { requireUser } from '~/.server/session';
import { SessionExpiryNotice } from '~/components/session-expiry-notice';
import { DltLogo } from '~/components/dlt-logo';
import {
  LayoutDashboard,
  ReceiptText,
  LogOut,
  User,
  Store,
  Users,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { ThemeToggle } from '~/components/ui/theme-toggle';
import { menuContentClass, menuItemClass, menuSeparatorClass } from '~/components/ui/menu';
import {
  SessionExpiredError,
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
  ServerError,
} from '~/components/ui/error-page';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await requireUser(request);

  return {
    user: session.user,
    expiresAt: session.expiresAt,
  };
}

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
      { name: 'Transactions', to: '/transactions', icon: ReceiptText, end: false },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'User profile', to: '/settings/profile', icon: User, end: false },
      { name: 'Merchant profile', to: '/settings/merchant', icon: Store, end: false },
      { name: 'Team', to: '/settings/team', icon: Users, end: false },
    ],
  },
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} className={gi > 0 ? 'mt-6' : ''}>
          <p
            className={cn(
              'text-sidebar-muted mb-1.5 px-3 text-[10px] font-semibold tracking-widest uppercase',
              collapsed && 'sr-only',
            )}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group text-sidebar-ink relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-sidebar-active before:bg-sidebar-accent text-white before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[3px] before:rounded-full'
                        : 'hover:bg-sidebar-hover hover:text-white',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed && item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({
  user,
}: {
  user: { firstName: string; lastName: string; email: string; role: string };
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 rounded-full text-left"
          aria-label={`Account menu for ${user.firstName} ${user.lastName}`}
        >
          <Avatar.Root className="bg-primary-subtle text-primary inline-flex size-8 items-center justify-center rounded-full">
            <Avatar.Fallback className="text-xs font-semibold">
              {getInitials(user.firstName, user.lastName)}
            </Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={menuContentClass} sideOffset={8} align="end">
          {/* User info header */}
          <div className="px-3 py-2">
            <p className="text-ink text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-ink-3 truncate text-xs">{user.email}</p>
            <span className="bg-primary-subtle text-primary mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {user.role}
            </span>
          </div>

          <DropdownMenu.Separator className={menuSeparatorClass} />

          <DropdownMenu.Item asChild>
            <NavLink to="/settings/profile" className={menuItemClass}>
              <User className="text-ink-3 size-4 shrink-0" aria-hidden />
              Profile
            </NavLink>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={menuSeparatorClass} />

          <DropdownMenu.Item asChild>
            <Form action="/logout" method="post">
              <button
                type="submit"
                className={cn(
                  menuItemClass,
                  'text-danger-ink data-[highlighted]:bg-danger-subtle w-full',
                )}
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                Sign out
              </button>
            </Form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function AppLayout() {
  const { user, expiresAt } = useLoaderData<typeof loader>();
  const matches = useMatches();
  const merchantName =
    (
      matches
        .map((m) => m.loaderData)
        .find((d) => !!d && typeof d === 'object' && 'merchant' in d) as
        { merchant?: { name: string } | null } | undefined
    )?.merchant?.name ?? user.merchantName;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    // Persist collapse preference across navigations/refreshes
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="bg-page text-ink flex h-screen flex-col overflow-hidden">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="bg-primary text-on-primary sr-only z-[60] rounded-lg px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="flex min-h-0 flex-1">
        {/* ── Desktop sidebar (collapsible) ─────────────────────────── */}
        <aside
          className={cn(
            'border-sidebar-line bg-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
            collapsed ? 'w-[68px]' : 'w-64',
          )}
          aria-label="Sidebar"
        >
          <div
            className={cn(
              'border-sidebar-line flex h-14 shrink-0 items-center border-b',
              collapsed ? 'justify-center px-2' : 'justify-between px-5',
            )}
          >
            <Link to="/" aria-label="Go to dashboard">
              <DltLogo size={32} showText={!collapsed} tile />
            </Link>
          </div>

          <SidebarNav collapsed={collapsed} />

          <div className="border-sidebar-line shrink-0 border-t p-3">
            <button
              onClick={toggleCollapsed}
              className="text-sidebar-muted hover:bg-sidebar-hover flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:text-white"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <>
                  <PanelLeftClose className="size-4" aria-hidden />
                  Collapse
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ── Mobile drawer (off-canvas, focus-trapped) ─────────────── */}
        <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/60 duration-200 lg:hidden" />
            <Dialog.Content
              className="bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left fixed inset-y-0 left-0 z-50 flex w-64 flex-col duration-200 focus:outline-none lg:hidden"
              aria-label="Navigation"
            >
              <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
              <Dialog.Description className="sr-only">
                Main navigation for DLT Portal
              </Dialog.Description>
              <div className="border-sidebar-line flex h-14 shrink-0 items-center justify-between border-b px-5">
                <Link to="/" aria-label="Go to dashboard">
                <DltLogo size={32} showText tile />
              </Link>
                <Dialog.Close
                  className="text-sidebar-muted hover:bg-sidebar-hover rounded-md p-1.5 transition-colors hover:text-white"
                  aria-label="Close navigation"
                >
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Main column ────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="border-line bg-surface flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:px-6">
            {/* Left: mobile menu button + logo */}
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-ink-2 hover:bg-surface-2 rounded-lg p-2 transition-colors"
                aria-label="Open navigation"
                aria-haspopup="dialog"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="size-5" aria-hidden />
              </button>
              <Link to="/" aria-label="Go to dashboard">
                <DltLogo size={24} showText compact tone="surface" invertDark />
              </Link>
            </div>

            {/* Right: merchant name, theme toggle, user menu */}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="text-ink-2 hidden text-sm md:inline-block">{merchantName}</span>
              <ThemeToggle />
              <UserMenu user={user} />
            </div>
          </header>

          {/* Page content */}
          <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto" tabIndex={-1}>
            <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <SessionExpiryNotice expiresAt={expiresAt} />
    </div>
  );
}

/**
 * Layout-level error boundary — renders inside the app shell (sidebar, header).
 * Handles errors thrown by child route loaders/actions per spec §10.1:
 *   401 → session expired, redirect to login
 *   403 → permission denied
 *   404 → not available, no cross-merchant hints
 *   429 → rate limited, honor retry-after
 *   500/503 → generic retryable, no internal details
 */
export function ErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 401:
        // Session is invalid — clear the session and redirect to login.
        // Per spec: "clear the Portal session and require login again"
        return <SessionExpiredError returnTo={location.pathname + location.search} />;
      case 403:
        return <ForbiddenError />;
      case 404:
        return <NotFoundError />;
      case 429: {
        // Parse Retry-After from the error data if available
        const retryAfter =
          typeof error.data === 'object' && error.data !== null && 'retryAfter' in error.data
            ? (error.data as { retryAfter?: number }).retryAfter
            : undefined;
        return <RateLimitedError retryAfter={retryAfter} />;
      }
      case 500:
      case 502:
      case 503:
      case 504:
        return <ServerError />;
      default:
        return <ServerError />;
    }
  }

  // Unknown Error (thrown exception, not a Response)
  return <ServerError />;
}
