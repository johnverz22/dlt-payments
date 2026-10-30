import { dltGet, dltGetEnvelope } from './client';
import type { Result } from './errors';
import {
  transactionListSchema,
  transactionSchema,
  historyItemSchema,
  historyCoverageSchema,
  historyOmissionSchema,
  historyResponseSchema,
  paginationMetaSchema,
} from './schemas';
import { z } from 'zod';

// The API envelope for paginated transaction list:
// { success, message, data: Transaction[], meta: PaginationMeta }
const transactionListEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(transactionSchema),
  meta: paginationMetaSchema,
});

// The API envelope for single transaction detail:
// { success, message, data: Transaction }
const transactionDetailEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: transactionSchema,
});

// The API envelope for paginated history list:
// { success, message, data: HistoryItem[], meta: { ...pagination, coverage } }
const historyListEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(historyItemSchema),
  meta: z.object({
    current_page: z.number(),
    per_page: z.number(),
    total: z.number(),
    last_page: z.number(),
    coverage: historyCoverageSchema,
  }),
});

// The API envelope for single history item detail:
// { success, message, data: HistoryItem }
const historyDetailEnvelopeSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: historyItemSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionList = z.infer<typeof transactionListSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;
export type HistoryCoverage = z.infer<typeof historyCoverageSchema>;
export type HistoryOmission = z.infer<typeof historyOmissionSchema>;
export type HistoryList = {
  data: HistoryItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    coverage: HistoryCoverage;
  };
};

export type TransactionFiltersApi = {
  from?: string;
  to?: string;
  status?: 'PAID' | 'PENDING' | 'REJECTED';
  merchant_transaction_id?: string;
  query?: string;
  currency?: string;
  payment_brand?: string;
  page?: number;
  per_page?: number;
};

export async function listTransactions(
  pat: string,
  filters: TransactionFiltersApi,
): Promise<Result<TransactionList>> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.merchant_transaction_id)
    params.set('merchant_transaction_id', filters.merchant_transaction_id);
  if (filters.query) params.set('query', filters.query);
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.payment_brand) params.set('payment_brand', filters.payment_brand);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const path = `/api/v1/portal/collections/transactions?${params.toString()}`;
  const result = await dltGetEnvelope<unknown>(path, pat);

  if (!result.ok) return result;

  const parsed = transactionListEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid transaction list response' } };
  }
  return { ok: true, data: { data: parsed.data.data, meta: parsed.data.meta } };
}

export async function getTransaction(
  pat: string,
  id: number,
): Promise<Result<Transaction>> {
  const result = await dltGetEnvelope<unknown>(`/api/v1/portal/collections/transactions/${id}`, pat);
  if (!result.ok) return result;

  const parsed = transactionDetailEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid transaction response' } };
  }
  return { ok: true, data: parsed.data.data };
}

export async function listTransactionHistory(
  pat: string,
  transactionId: number,
  page = 1,
  perPage = 25,
): Promise<Result<HistoryList>> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const path = `/api/v1/portal/collections/transactions/${transactionId}/history?${params.toString()}`;
  const result = await dltGetEnvelope<unknown>(path, pat);

  if (!result.ok) return result;

  const parsed = historyListEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid history response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function getTransactionHistoryDetail(
  pat: string,
  transactionId: number,
  historyId: string,
): Promise<Result<HistoryItem>> {
  const path = `/api/v1/portal/collections/transactions/${transactionId}/history/${historyId}`;
  const result = await dltGetEnvelope<unknown>(path, pat);

  if (!result.ok) return result;

  const parsed = historyDetailEnvelopeSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid history detail response' } };
  }
  return { ok: true, data: parsed.data.data };
}
