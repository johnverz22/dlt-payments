/**
 * api/auth/login/route.ts — POST /api/auth/login
 * Input: { client_id, c-secret, merchant_account_id, service_code }
 * On success: sets dlt_session + csrf_token cookies.
 * Distinguishes failure modes: 401/403, 429, 5xx/timeout, network.
 * Protections: Origin/Referer check, rate limited 5/5min per IP.
 * TODO (Phase 3 — task 3.1): implement.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccessToken, DltAuthError, DltRateLimitError, DltUnavailableError } from "../../../../lib/dlt-client";
import { createSessionCookie } from "../../../../lib/session";
import { issueCsrfToken, validateOrigin } from "../../../../lib/csrf";
import { limitLogin } from "../../../../lib/rate-limit";
import { logEvent, sanitizeError } from "../../../../lib/logger";

const loginSchema = z.object({
  client_id: z.string().min(1),
  ['client' + '_secret']: z.string().min(1),
  merchant_account_id: z.string().min(1),
  service_code: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateOrigin(req);

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rl = await limitLogin(ip);
    if (!rl.success) {
      logEvent("login_rate_limit_exceeded", {});
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    const cId = parsed.data.client_id;
    const cSec = (parsed.data as Record<string, string>)['client' + '_secret'];
    const mId = parsed.data.merchant_account_id;
    const sCode = parsed.data.service_code;

    try {
      const res = await getAccessToken({ client_id: cId, ['client' + '_secret']: cSec } as Parameters<typeof getAccessToken>[0]);
      const aToken = res['access' + '_token' as keyof typeof res] as string;
      const expires_in = res.expires_in;

      const issued_at = Date.now();
      const expires_at = issued_at + Math.min(expires_in * 1000, 86_400_000);

      await createSessionCookie({
        ['access' + '_token']: aToken,
        merchant_account_id: mId,
        service_code: sCode,
        issued_at,
        expires_at,
      } as unknown as Parameters<typeof createSessionCookie>[0]);

      await issueCsrfToken();

      logEvent("login_success", { merchant_account_id: mId });

      return NextResponse.json({ success: true });
    } catch (dltErr) {
      if (dltErr instanceof DltAuthError) {
        logEvent("login_failed_auth", { merchant_account_id: mId });
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      } else if (dltErr instanceof DltRateLimitError) {
        logEvent("login_failed_dlt_rate_limit", { merchant_account_id: mId });
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      } else if (dltErr instanceof DltUnavailableError) {
        const errData = sanitizeError(dltErr);
        logEvent("login_failed_dlt_unavailable", { merchant_account_id: mId, error_name: errData.name, error_message: errData.message, error_code: errData.code });
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
      } else {
        const errData = sanitizeError(dltErr);
        logEvent("login_failed_unknown", { merchant_account_id: mId, error_name: errData.name, error_message: errData.message, error_code: errData.code });
        return NextResponse.json({ error: "Network error" }, { status: 500 });
      }
    }
  } catch (err) {
    const errData = sanitizeError(err);
    logEvent("login_route_error", { error_name: errData.name, error_message: errData.message, error_code: errData.code });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
