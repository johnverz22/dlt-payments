/**
 * Parse URL search params into typed filter objects for DLT API calls.
 * Centralizes filter → URL string and URL string → filter parsing.
 */

export type TransactionFilters = {
  from?: string;
  to?: string;
  status?: 'PAID' | 'PENDING' | 'REJECTED';
  merchant_transaction_id?: string;
  query?: string;
  currency?: string;
  payment_brand?: string;
  page: number;
  per_page: number;
};

export function parseTransactionFilters(searchParams: URLSearchParams): TransactionFilters {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const per_page = [10, 25, 50, 100].includes(
    parseInt(searchParams.get('per_page') ?? '25', 10),
  )
    ? parseInt(searchParams.get('per_page')!, 10)
    : 25;

  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  // from and to must be paired
  const pairedDates = from && to ? { from, to } : {};

  const status = searchParams.get('status') as TransactionFilters['status'] | null;
  const merchant_transaction_id = searchParams.get('merchant_transaction_id') ?? undefined;
  const query = searchParams.get('query') ?? undefined;
  const currency = searchParams.get('currency') ?? undefined;
  const payment_brand = searchParams.get('payment_brand') ?? undefined;

  return {
    ...pairedDates,
    ...(status ? { status } : {}),
    ...(merchant_transaction_id ? { merchant_transaction_id } : {}),
    ...(query ? { query } : {}),
    ...(currency ? { currency } : {}),
    ...(payment_brand ? { payment_brand } : {}),
    page,
    per_page,
  };
}

/**
 * Build URL search params from filter object.
 * Only includes defined values.
 */
export function filtersToSearchParams(filters: Record<string, string | number | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  return params;
}
