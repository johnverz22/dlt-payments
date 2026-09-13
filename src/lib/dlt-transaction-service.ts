/**
 * lib/dlt-transaction-service.ts — Transaction service interface + dummy-data stub.
 * ITransactionService is defined now so the real implementation can swap in
 * without touching consumers. Backed by hardcoded data for this iteration.
 * (DLT v4.0 has no transaction-history endpoint — spec §7.3)
 *
 * Implemented (Phase 7 — task 7.1). Stub is production-ready for this iteration.
 */

// ─── Types (spec §7.2–7.3) ─────────────────────────────────────────────────

export type PaymentStatus = "PAID" | "PENDING" | "REJECTED";

export interface TransactionRecord {
  id: string;
  merchant_transaction_id: string;
  /** Decimal string, e.g. "1500.00" */
  amount: string;
  currency: "PHP";
  status: PaymentStatus;
  product_name?: string;
  payor_name?: string;
  created_at: string;
}

export interface TransactionFilterParams {
  startDate?: string;
  endDate?: string;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface ITransactionService {
  getTransactions(params: TransactionFilterParams): Promise<{
    data: TransactionRecord[];
    total: number;
  }>;
}

// ─── Dummy-data stub ────────────────────────────────────────────────────────

const DUMMY_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "txn_001",
    merchant_transaction_id: "MTXN-2026-001",
    amount: "1500.00",
    currency: "PHP",
    status: "PAID",
    product_name: "Monthly Subscription",
    payor_name: "Juan dela Cruz",
    created_at: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "txn_002",
    merchant_transaction_id: "MTXN-2026-002",
    amount: "3500.00",
    currency: "PHP",
    status: "PENDING",
    product_name: "Annual Plan",
    payor_name: "Maria Santos",
    created_at: "2026-09-11T14:30:00.000Z",
  },
  {
    id: "txn_003",
    merchant_transaction_id: "MTXN-2026-003",
    amount: "750.50",
    currency: "PHP",
    status: "REJECTED",
    product_name: "One-time Purchase",
    payor_name: "Jose Reyes",
    created_at: "2026-09-12T08:15:00.000Z",
  },
  {
    id: "txn_004",
    merchant_transaction_id: "MTXN-2026-004",
    amount: "25000.00",
    currency: "PHP",
    status: "PAID",
    product_name: "Enterprise License",
    payor_name: "ABC Corporation",
    created_at: "2026-09-08T16:45:00.000Z",
  },
  {
    id: "txn_005",
    merchant_transaction_id: "MTXN-2026-005",
    amount: "500.00",
    currency: "PHP",
    status: "PENDING",
    product_name: "Starter Pack",
    created_at: "2026-09-12T20:00:00.000Z",
  },
];

/** Dummy-data implementation of ITransactionService. */
export class DummyTransactionService implements ITransactionService {
  async getTransactions(params: TransactionFilterParams): Promise<{
    data: TransactionRecord[];
    total: number;
  }> {
    let results = [...DUMMY_TRANSACTIONS];

    if (params.status) {
      results = results.filter((t) => t.status === params.status);
    }
    if (params.startDate) {
      results = results.filter((t) => t.created_at >= params.startDate!);
    }
    if (params.endDate) {
      results = results.filter((t) => t.created_at <= params.endDate!);
    }

    const total = results.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const start = (page - 1) * limit;
    const data = results.slice(start, start + limit);

    return { data, total };
  }
}

/** Singleton instance for use in API routes. */
export const transactionService: ITransactionService =
  new DummyTransactionService();
