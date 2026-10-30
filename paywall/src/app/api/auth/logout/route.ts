/**
 * api/auth/logout/route.ts — POST /api/auth/logout
 * Clears dlt_session and csrf_token cookies.
 * Protections: Origin/Referer check.
 * TODO (Phase 3 — task 3.2): implement.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateOrigin, CSRF_COOKIE_NAME } from "../../../../lib/csrf";
import { SESSION_COOKIE_NAME } from "../../../../lib/session";
import { logEvent, sanitizeError } from "../../../../lib/logger";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateOrigin(req);

    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(CSRF_COOKIE_NAME);

    logEvent("logout_success", {});

    return NextResponse.redirect(new URL("/login", req.url));
  } catch (err) {
    const errData = sanitizeError(err);
    logEvent("logout_route_error", { error_name: errData.name, error_message: errData.message, error_code: errData.code });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
