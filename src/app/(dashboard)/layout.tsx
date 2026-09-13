/**
 * (dashboard)/layout.tsx — Session barrier for all dashboard routes.
 * Redirects to /login if dlt_session is absent, invalid, or expired.
 * TODO (Phase 3 — task 3.3): implement session check.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

  return <>{children}</>;
}
