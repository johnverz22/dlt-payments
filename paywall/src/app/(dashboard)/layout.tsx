/**
 * (dashboard)/layout.tsx — Session barrier for all dashboard routes.
 * Redirects to /login if dlt_session is absent, invalid, or expired.
 * Also provides the shared dashboard navigation bar.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE_NAME, readSessionCookie } from "../../lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    redirect("/login");
  }

  try {
    await readSessionCookie(sessionCookie.value);
  } catch (err) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0052FF] text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">DLT Pay</span>
            </div>
            
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Transactions
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
