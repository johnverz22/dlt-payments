import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, useSearchParams, Link, useNavigation, useNavigate } from 'react-router';
import { requireUser } from '~/.server/session';
import { listTransactions } from '~/.server/dlt/collections';
import { getCurrencyCatalogue } from '~/.server/dlt/reference';
import { parseTransactionFilters } from '~/lib/filters';
import { formatMoney } from '~/lib/money';
import { formatTimestamp } from '~/lib/dates';
import { useToast } from '~/components/ui/toast';
import { DateTime } from 'luxon';
import React, { useEffect, useRef, useState } from 'react';
import { X, Download, History, ReceiptText, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { PageHeader } from '~/components/ui/page-header';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input, Select } from '~/components/ui/input';
import { StatusPill } from '~/components/ui/badge';
import { Callout } from '~/components/ui/callout';
import { EmptyState } from '~/components/ui/empty-state';
import { DataTable, THead, Th, TBody, Tr, Td } from '~/components/ui/data-table';
import { Tooltip } from '~/components/ui/tooltip';

export const meta: MetaFunction = () => [{ title: 'Transactions | DLT Portal' }];

const DEFAULT_TZ = 'Asia/Manila';

// Convert YYYY-MM-DD date input value → ISO instant (start of day in Manila time)
function dateToFrom(dateValue: string): string {
  return DateTime.fromISO(dateValue, { zone: DEFAULT_TZ })
    .startOf('day')
    .toISO({ suppressMilliseconds: true })!;
}

// Convert YYYY-MM-DD date input value → ISO instant (start of next day, exclusive upper bound)
function dateToTo(dateValue: string): string {
  return DateTime.fromISO(dateValue, { zone: DEFAULT_TZ })
    .plus({ days: 1 })
    .startOf('day')
    .toISO({ suppressMilliseconds: true })!;
}

// Convert ISO instant → YYYY-MM-DD for displaying in date input
function isoToDateInput(iso: string): string {
  return DateTime.fromISO(iso).setZone(DEFAULT_TZ).toISODate() ?? '';
}

// Convert "to" ISO instant (exclusive next-day) → the day before for display
function isoToDateInputExclusive(iso: string): string {
  return DateTime.fromISO(iso).setZone(DEFAULT_TZ).minus({ days: 1 }).toISODate() ?? '';
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat } = await requireUser(request);
  const url = new URL(request.url);
  const tz = url.searchParams.get('timezone') || DEFAULT_TZ;
  const filters = parseTransactionFilters(url.searchParams);

  // Fetch currency catalogue in parallel with transactions
  const [txResult, currencyResult] = await Promise.all([
    listTransactions(pat, filters),
    getCurrencyCatalogue(),
  ]);

  const currencies = currencyResult.ok ? currencyResult.data : [];

  return {
    transactions: txResult.ok ? txResult.data.data : [],
    paginationMeta: txResult.ok ? txResult.data.meta : null,
    error: txResult.ok ? null : txResult.error.message,
    filters,
    tz,
    currencies,
  };
}

export default function TransactionsPage() {
  const { transactions, paginationMeta, error, filters, tz, currencies } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { error: toastError } = useToast();
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isLoading = navigation.state === 'loading';

  // Debounce refs for text filters
  const merchantIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brandRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [merchantIdInput, setMerchantIdInput] = useState(filters.merchant_transaction_id ?? '');
  const [brandInput, setBrandInput] = useState(filters.payment_brand ?? '');

  // Local state for date inputs — needed so user can type "from" before filling "to"
  const [fromInput, setFromInput] = useState(filters.from ? isoToDateInput(filters.from) : '');
  const [toInput, setToInput] = useState(filters.to ? isoToDateInputExclusive(filters.to) : '');

  // When filters change from URL (e.g. clear), sync inputs
  useEffect(() => {
    setMerchantIdInput(filters.merchant_transaction_id ?? '');
  }, [filters.merchant_transaction_id]);
  useEffect(() => {
    setBrandInput(filters.payment_brand ?? '');
  }, [filters.payment_brand]);
  useEffect(() => {
    setFromInput(filters.from ? isoToDateInput(filters.from) : '');
  }, [filters.from]);
  useEffect(() => {
    setToInput(filters.to ? isoToDateInputExclusive(filters.to) : '');
  }, [filters.to]);

  function setFilter(key: string, value: string | undefined) {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      prev.set('page', '1'); // reset page on filter change
      return prev;
    });
  }

  // Both dates must be set together; clearing either clears both
  function setDateRange(fromVal: string, toVal: string) {
    setSearchParams((prev) => {
      if (fromVal && toVal) {
        prev.set('from', dateToFrom(fromVal));
        prev.set('to', dateToTo(toVal));
      } else {
        prev.delete('from');
        prev.delete('to');
      }
      prev.set('page', '1');
      return prev;
    });
  }

  function debounceSet(
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    key: string,
    value: string,
  ) {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      setFilter(key, value || undefined);
    }, 400);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  function setPage(page: number) {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  }

  /**
   * Server-side CSV export: fetch /transactions/export.csv with current filters.
   * Triggers a browser download via a temporary <a> element.
   */
  async function handleCsvExport() {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      params.delete('page');
      params.delete('per_page');
      const res = await fetch(`/transactions/export.csv?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = typeof body.message === 'string' ? body.message : 'Export failed';
        if (res.status === 401) {
          toastError('Session expired', 'Please sign in again.');
        } else if (res.status === 403) {
          toastError('No permission', 'You do not have permission to export transactions.');
        } else {
          toastError('Export failed', msg);
        }
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const nameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = nameMatch?.[1] ?? 'dlt-transactions.csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toastError('Export failed', 'A network error occurred. Please try again.');
    } finally {
      setCsvLoading(false);
    }
  }

  /**
   * Server-side PDF export: navigate to /transactions/pdf with current filters.
   * The browser downloads the file directly (no fetch needed for PDF).
   */
  async function handlePdfExport() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      params.delete('page');
      params.delete('per_page');
      params.set('timezone', tz);
      // Open in same tab — the Content-Disposition: attachment header triggers download
      window.location.assign(`/transactions/pdf?${params.toString()}`);
    } finally {
      // Delay reset so the button isn't immediately re-enabled before the download starts
      setTimeout(() => setPdfLoading(false), 2000);
    }
  }

  const hasFilters =
    filters.from ||
    filters.to ||
    filters.status ||
    filters.merchant_transaction_id ||
    filters.currency ||
    filters.payment_brand;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={handlePdfExport}
              disabled={pdfLoading}
              loading={pdfLoading}
              aria-label="Export PDF report"
            >
              <FileText aria-hidden /> {pdfLoading ? 'Generating…' : 'Export PDF'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleCsvExport}
              disabled={csvLoading}
              loading={csvLoading}
              aria-label="Export CSV"
            >
              <Download aria-hidden /> {csvLoading ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* Filter bar
          Mobile: 2-column grid so filters are usable without horizontal scrolling.
          sm+: single flex row (original layout). */}
      <Card className="p-3 sm:p-2">
        {/* Mobile grid layout */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <div className="col-span-2">
            <Input
              type="text"
              aria-label="Filter by merchant transaction ID"
              placeholder="Merchant Tx ID…"
              maxLength={100}
              value={merchantIdInput}
              onChange={(e) => {
                setMerchantIdInput(e.target.value);
                debounceSet(merchantIdRef, 'merchant_transaction_id', e.target.value);
              }}
            />
          </div>

          <div className="col-span-2">
            <Input
              type="text"
              aria-label="Filter by payment brand"
              placeholder="Payment brand…"
              maxLength={100}
              value={brandInput}
              onChange={(e) => {
                setBrandInput(e.target.value);
                debounceSet(brandRef, 'payment_brand', e.target.value);
              }}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-from-m" className="block text-xs font-medium text-ink-3">
              From
            </label>
            <Input
              id="filter-from-m"
              type="date"
              value={fromInput}
              max={toInput || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setFromInput(val);
                setDateRange(val, toInput);
              }}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="filter-to-m" className="block text-xs font-medium text-ink-3">
              To
            </label>
            <Input
              id="filter-to-m"
              type="date"
              value={toInput}
              min={fromInput || undefined}
              onChange={(e) => {
                const val = e.target.value;
                setToInput(val);
                setDateRange(fromInput, val);
              }}
            />
          </div>

          <Select
            value={filters.status ?? ''}
            onChange={(e) => setFilter('status', e.target.value || undefined)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </Select>

          <Select
            value={filters.currency ?? ''}
            onChange={(e) => setFilter('currency', e.target.value || undefined)}
            aria-label="Filter by currency"
          >
            <option value="">All currencies</option>
            {currencies.map((c) => (
              <option key={c.cc} value={c.cc}>
                {c.cc} — {c.name}
              </option>
            ))}
          </Select>

          {hasFilters && (
            <div className="col-span-2">
              <Button variant="ghost" onClick={clearFilters} className="w-full">
                <X aria-hidden /> Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* sm+ single-row layout */}
        <div className="hidden overflow-x-auto sm:block">
          <div className="flex flex-nowrap items-end gap-3 px-2 py-2">
            <div className="min-w-[160px] flex-1">
              <Input
                type="text"
                aria-label="Filter by merchant transaction ID"
                placeholder="Merchant Tx ID…"
                maxLength={100}
                value={merchantIdInput}
                onChange={(e) => {
                  setMerchantIdInput(e.target.value);
                  debounceSet(merchantIdRef, 'merchant_transaction_id', e.target.value);
                }}
              />
            </div>

            <div className="min-w-[140px] flex-1">
              <Input
                type="text"
                aria-label="Filter by payment brand"
                placeholder="Payment brand…"
                maxLength={100}
                value={brandInput}
                onChange={(e) => {
                  setBrandInput(e.target.value);
                  debounceSet(brandRef, 'payment_brand', e.target.value);
                }}
              />
            </div>

            <div className="space-y-1 shrink-0">
              <label htmlFor="filter-from" className="block text-xs font-medium text-ink-3">
                From
              </label>
              <Input
                id="filter-from"
                type="date"
                value={fromInput}
                max={toInput || undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromInput(val);
                  setDateRange(val, toInput);
                }}
              />
            </div>

            <div className="space-y-1 shrink-0">
              <label htmlFor="filter-to" className="block text-xs font-medium text-ink-3">
                To
              </label>
              <Input
                id="filter-to"
                type="date"
                value={toInput}
                min={fromInput || undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  setToInput(val);
                  setDateRange(fromInput, val);
                }}
              />
            </div>

            <Select
              value={filters.status ?? ''}
              onChange={(e) => setFilter('status', e.target.value || undefined)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="REJECTED">REJECTED</option>
            </Select>

            <Select
              value={filters.currency ?? ''}
              onChange={(e) => setFilter('currency', e.target.value || undefined)}
              aria-label="Filter by currency"
            >
              <option value="">All currencies</option>
              {currencies.map((c) => (
                <option key={c.cc} value={c.cc}>
                  {c.cc} — {c.name}
                </option>
              ))}
            </Select>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                <X aria-hidden /> Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Callout variant="danger" role="alert">
          Failed to load transactions: {error}
        </Callout>
      )}

      {/* Table */}
      <div className={cn('transition-opacity', isLoading && 'opacity-60')} aria-busy={isLoading}>
        {transactions.length === 0 ? (
          <Card>
            <EmptyState
              icon={ReceiptText}
              title="No transactions found"
              description={
                error
                  ? 'Failed to load transactions.'
                  : hasFilters
                    ? 'Nothing matches the current filters.'
                    : 'Transactions will appear here once payments start flowing.'
              }
              action={
                hasFilters && !error ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <DataTable>
            <THead>
              <Th>Merchant Reference</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Brand</Th>
              <Th>Created</Th>
              <Th>History</Th>
            </THead>
            <TBody>
              {transactions.map((tx) => (
                <Tr
                  key={tx.id}
                  interactive
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                >
                  <Td>
                    <Link
                      to={`/transactions/${tx.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {tx.merchant_transaction_id}
                    </Link>
                  </Td>
                  <Td className="tnum text-ink">
                    {tx.amount !== null && tx.currency
                      ? formatMoney(tx.amount, tx.currency)
                      : '—'}
                  </Td>
                  <Td>
                    <StatusPill status={tx.status} />
                  </Td>
                  <Td>{tx.payment_brand ?? '—'}</Td>
                  <Td className="text-ink-3">{formatTimestamp(tx.created_at, tz)}</Td>
                  <Td>
                    {tx.history_available ? (
                      <Tooltip content="History available">
                        <span className="inline-flex text-primary" aria-label="History available" role="img">
                          <History className="size-4" aria-hidden />
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </DataTable>
        )}
      </div>

      {/* Pagination + page size selector */}
      {paginationMeta && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">
            {paginationMeta.last_page > 1 ? (
              <>
                Page <span className="tnum">{paginationMeta.current_page}</span> of{' '}
                <span className="tnum">{paginationMeta.last_page}</span>{' '}
                · <span className="tnum">{paginationMeta.total}</span> total
              </>
            ) : (
              <>
                <span className="tnum">{paginationMeta.total}</span> total
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            {paginationMeta.last_page > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(paginationMeta.current_page - 1)}
                  disabled={paginationMeta.current_page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft aria-hidden /> Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(paginationMeta.current_page + 1)}
                  disabled={paginationMeta.current_page >= paginationMeta.last_page}
                  aria-label="Next page"
                >
                  Next <ChevronRight aria-hidden />
                </Button>
              </div>
            )}
            <Select
              value={String(filters.per_page)}
              onChange={(e) => setFilter('per_page', e.target.value)}
              aria-label="Rows per page"
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
