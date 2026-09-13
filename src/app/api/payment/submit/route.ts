/**
 * api/payment/submit/route.ts — POST /api/payment/submit
 * Input: { token, payor: PayorBillingDetails, payment_brand, payment_brand_code }
 * Process: decrypt token → check expiry → build DLT payload (server hardcodes
 *   time_offset="+08:00", channel=4) → call submitPayment().
 * Returns: 200 { payment_url } | 409 conflict | 503 ambiguous | 401 unavailable.
 * NEVER auto-resubmit on 409 or 503.
 * Protections: Origin/Referer + double-submit CSRF, expiry, rate limit.
 * TODO (Phase 5 — task 5.4): implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Phase 5 task 5.4): implement submit handler
  return NextResponse.json(
    { error: "Not implemented — Phase 5 task 5.4" },
    { status: 501 }
  );
}
