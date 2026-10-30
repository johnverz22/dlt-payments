/**
 * GET /api/csrf — Issues a fresh CSRF token cookie.
 * Route Handlers are the only context where cookies() can be written.
 * The payor page (a Server Component) cannot write cookies directly, so
 * the client fetches this endpoint once on mount to seed the csrf_token.
 */

import { NextResponse } from "next/server";
import { issueCsrfToken } from "../../../lib/csrf";

export async function GET(): Promise<NextResponse> {
  const token = await issueCsrfToken();
  return NextResponse.json({ ok: true, token });
}
