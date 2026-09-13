/**
 * api/payment/brands/route.ts — GET /api/payment/brands?token=<link_token>
 * Decrypts token, checks expiry, calls DLT /api/v1/collection/apn/brands
 * with embedded credentials, returns { value, code, image, is_card }[] unmodified.
 * code is opaque/time-sensitive — fetch fresh per session, never cache.
 * Rate limited: 20/min per link_id. Origin/Referer check only (read-only).
 * TODO (Phase 5 — task 5.1): implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // TODO (Phase 5 task 5.1): implement brands handler
  return NextResponse.json(
    { error: "Not implemented — Phase 5 task 5.1" },
    { status: 501 }
  );
}
