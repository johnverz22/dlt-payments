/**
 * api/transactions/route.ts — GET /api/transactions
 * Scoped to authenticated session's merchant_account_id.
 * Backed by DummyTransactionService (lib/dlt-transaction-service.ts).
 * Query params: TransactionFilterParams (status, startDate, endDate, page, limit).
 * Returns: { data: TransactionRecord[], total: number }
 * TODO (Phase 7 — task 7.2): implement (wire session scoping through even on stub).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // TODO (Phase 7 task 7.2): implement transactions handler
  return NextResponse.json(
    { error: "Not implemented — Phase 7 task 7.2" },
    { status: 501 }
  );
}
