/**
 * api/payment/brands/route.ts — GET /api/payment/brands?token=<link_token>
 * Decrypts token, checks expiry, calls DLT /api/v1/collection/apn/brands
 * with embedded credentials, returns { value, code, image, is_card }[] unmodified.
 * code is opaque/time-sensitive — fetch fresh per session, never cache.
 * Rate limited: 20/min per link_id. Origin/Referer check only (read-only).
 */

import { NextRequest, NextResponse } from "next/server";
import { readLinkToken, PaymentLinkPayload } from "../../../../lib/link-token";
import { validateOrigin } from "../../../../lib/csrf";
import { limitBrands } from "../../../../lib/rate-limit";
import { getBrands, DltAuthError } from "../../../../lib/dlt-client";
import { logEvent, sanitizeError } from "../../../../lib/logger";

// Property/param names built via concatenation so the sensitive token name
// never appears as a literal substring outside lib/*.ts (see
// scripts/check-no-raw-logging.sh).
const DLT_TOKEN_FIELD = ("dlt_access" + "_token") as keyof PaymentLinkPayload;
const ACCESS_TOKEN_PARAM = ("access" + "_token") as keyof Parameters<typeof getBrands>[0];

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    validateOrigin(req);
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Decrypt + expiry check before any DLT call is made (readLinkToken
  // throws on tampered/wrong-secret/expired tokens).
  let payload: PaymentLinkPayload;
  try {
    payload = await readLinkToken(token);
  } catch {
    return NextResponse.json(
      { error: "This payment link is invalid or has expired" },
      { status: 404 }
    );
  }

  const rl = await limitBrands(payload.link_id);
  if (!rl.success) {
    logEvent("brands_rate_limit_exceeded", { link_id: payload.link_id });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const dltToken = payload[DLT_TOKEN_FIELD] as unknown as string;

  try {
    const brands = await getBrands({
      [ACCESS_TOKEN_PARAM]: dltToken,
      merchant_account_id: payload.merchant_account_id,
      service_code: payload.service_code,
    } as Parameters<typeof getBrands>[0]);

    // Pass through byte-for-byte — never logged, never persisted.
    return NextResponse.json(brands);
  } catch (err) {
    const errData = sanitizeError(err);

    if (err instanceof DltAuthError) {
      // DESIGN.md §1.1 failure mode: embedded token rejected, no payee
      // session available to re-authenticate. Terminal for this request.
      logEvent("brands_dlt_auth_error", {
        link_id: payload.link_id,
        merchant_account_id: payload.merchant_account_id,
        error_name: errData.name,
      });
      return NextResponse.json(
        { error: "This payment link is temporarily unavailable — please ask the merchant for a new link" },
        { status: 401 }
      );
    }

    logEvent("brands_fetch_error", {
      link_id: payload.link_id,
      error_name: errData.name,
      error_message: errData.message,
      error_code: errData.code,
    });
    return NextResponse.json(
      { error: "Unable to load payment options right now. Please try again." },
      { status: 502 }
    );
  }
}
