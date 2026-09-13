/**
 * api/transactions/route.ts — GET /api/transactions
 * Scoped to authenticated session's merchant_account_id.
 * Backed by DummyTransactionService (lib/dlt-transaction-service.ts).
 * Query params: TransactionFilterParams (status, startDate, endDate, page, limit).
 * Returns: { data: TransactionRecord[], total: number }
 * TODO (Phase 7 — task 7.2): implement (wire session scoping through even on stub).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionCookie, SESSION_COOKIE_NAME } from "@/lib/session";
import { transactionService, TransactionFilterParams, PaymentStatus } from "@/lib/dlt-transaction-service";
import { sanitizeError, logEvent } from "@/lib/logger";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await readSessionCookie(sessionCookie.value);

    const { searchParams } = new URL(req.url);
    const params: TransactionFilterParams = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: (searchParams.get("status") as PaymentStatus) || undefined,
      page: searchParams.has("page") ? parseInt(searchParams.get("page")!, 10) : undefined,
      limit: searchParams.has("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined,
    };

    // Scoped to the authenticated session's merchant_account_id
    // (Stub currently ignores it, but we pass it anyway to prepare for live implementation)
    // Actually the interface TransactionFilterParams in dlt-transaction-service.ts
    // doesn't have merchant_account_id right now. We'll cast it to any or modify the interface if needed.
    // Spec says: "Scoped to the authenticated session's merchant_account_id"
    const finalParams = {
      ...params,
      merchant_account_id: session.merchant_account_id,
    } as TransactionFilterParams & { merchant_account_id: string };

    const result = await transactionService.getTransactions(finalParams);

    return NextResponse.json(result);
  } catch (error) {
    logEvent("api_transactions_error", { response_status: 500 });
    return NextResponse.json(
      { error: sanitizeError(error).message },
      { status: 500 }
    );
  }
}
