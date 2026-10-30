import { redirect } from "next/navigation";

/**
 * Root page — redirects to /login or /dashboard based on session.
 * TODO (Phase 3 task 3.4): check dlt_session cookie and redirect appropriately.
 */
export default function RootPage() {
  // TODO: read dlt_session cookie; if valid redirect to /dashboard
  redirect("/login");
}
