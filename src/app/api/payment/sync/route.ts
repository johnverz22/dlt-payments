/**
 * api/payment/sync/route.ts — POST /api/payment/sync
 * Input: { token } only — merchant_transaction_id recovered from decrypted token.
 * NEVER accept merchant_transaction_id from the client.
 * Expiry check: strict, no exception for in-flight payments.
 * Returns: { status: "PAID"|"PENDING"|"REJECTED", provider_message?, timestamp }
 * Protections: Origin/Referer check, rate limited 20/min per link_id.
 * TODO (Phase 6 — task 6.1): implement.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  // TODO (Phase 6 task 6.1): implement sync handler
  return NextResponse.json(
    { error: "Not implemented — Phase 6 task 6.1" },
    { status: 501 }
  );
}
