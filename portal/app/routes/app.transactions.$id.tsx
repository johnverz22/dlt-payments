import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, useSearchParams, useRouteError, isRouteErrorResponse, Link } from 'react-router';
import { data } from 'react-router';
import { requireUser } from '~/.server/session';
import { getTransaction, listTransactionHistory, type HistoryItem, type HistoryList } from '~/.server/dlt/collections';
import { formatMoney } from '~/lib/money';
import { formatTimestamp } from '~/lib/dates';
import { useState } from 'react';
import { ArrowLeft, Clock, AlertCircle, FileJson, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import { Card, CardHeader } from '~/components/ui/card';
import { Badge, StatusPill } from '~/components/ui/badge';
import { Callout } from '~/components/ui/callout';
import { EmptyState } from '~/components/ui/empty-state';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { ErrorPage, NotFoundError, ServerError } from '~/components/ui/error-page';

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: loaderData?.transaction ? `Transaction ${loaderData.transaction.merchant_transaction_id} | DLT Portal` : 'Transaction | DLT Portal' },
];

const DEFAULT_TZ = 'Asia/Manila';

const COVERAGE_VARIANT = {
  captured: 'success',
  not_captured: 'neutral',
  purged: 'danger',
} as const;

const CAPTURE_STATUS_LABELS: Record<string, string> = {
  merchant_request: 'Merchant Request',
  dlt_response: 'DLT Response',
  merchant_webhook_request: 'Webhook Notification',
  merchant_webhook_response: 'Webhook Response',
};

const DIRECTION_LABELS: Record<string, string> = {
  merchant_to_dlt: 'Merchant → DLT',
  dlt_to_merchant: 'DLT → Merchant',
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { pat } = await requireUser(request);
  const rawId = params.id;
  const id = rawId ? parseInt(rawId, 10) : NaN;

  if (!rawId || isNaN(id)) {
    throw data({ message: 'Invalid transaction ID' }, { status: 400 });
  }

  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'summary';
  const tz = url.searchParams.get('timezone') || DEFAULT_TZ;
  const historyPage = Math.max(1, parseInt(url.searchParams.get('history_page') ?? '1', 10) || 1);

  const txResult = await getTransaction(pat, id);
  if (!txResult.ok) {
    const status = txResult.error.status === 404 ? 404 : 500;
    throw data({ message: txResult.error.status === 404 ? 'Not found' : txResult.error.message }, { status });
  }

  const tx = txResult.data;

  // Load history only when History tab is active
  let history: HistoryList | null = null;
  let historyError: string | null = null;
  if (tab === 'history' && tx.history_available) {
    const histResult = await listTransactionHistory(pat, id, historyPage, 25);
    if (histResult.ok) {
      history = histResult.data;
    } else {
      historyError = histResult.error.message;
    }
  }

  return { transaction: tx, history, historyError, tab, tz, historyPage };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value ?? '—'}</dd>
    </div>
  );
}

function PayloadViewer({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <FileJson className="size-3.5" aria-hidden />
        {open ? 'Hide' : 'View'} payload
        {open ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sidebar p-3 text-xs text-sidebar-ink">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function HistoryEventRow({ item, tz }: { item: HistoryItem; tz: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{CAPTURE_STATUS_LABELS[item.event_type] ?? item.event_type}</p>
          <p className="text-xs text-ink-3">
            {DIRECTION_LABELS[item.direction] ?? item.direction}
            {item.attempt_number != null && ` · Attempt #${item.attempt_number}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-3">
            {formatTimestamp(item.captured_at, tz, 'long')}
          </p>
          {item.http_status != null && (
            <span
              className={cn(
                'font-mono text-xs',
                item.http_status < 400 ? 'text-success-ink' : 'text-danger-ink',
              )}
            >
              HTTP {item.http_status}
            </span>
          )}
        </div>
      </div>

      {/* Delivery info */}
      {item.delivery && (
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-3">
          <span>Delivery: {item.delivery.state}</span>
          {item.delivery.duration_ms != null && <span>{item.delivery.duration_ms}ms</span>}
          {item.delivery.body_capture_status && (
            <span>Body: {item.delivery.body_capture_status}</span>
          )}
        </div>
      )}

      {/* Response info (only for dlt_response events) */}
      {item.response && (
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-3">
          {item.response.is_repeated_request != null && (
            <span>Repeated request: {item.response.is_repeated_request ? 'yes' : 'no'}</span>
          )}
          {item.response.capture_stage && <span>Stage: {item.response.capture_stage}</span>}
          {item.response.body_capture_status && (
            <span>Body: {item.response.body_capture_status}</span>
          )}
        </div>
      )}

      {/* Capture status */}
      <p className="mt-1 text-xs">
        <span className="text-ink-3">Capture: </span>
        <span
          className={cn(
            item.capture_status === 'available'
              ? 'text-success-ink'
              : item.capture_status === 'purged'
                ? 'text-danger-ink'
                : 'text-ink-3',
          )}
        >
          {item.capture_status}
        </span>
      </p>

      {/* Payload viewer */}
      {item.capture_status === 'available' && item.payload != null && (
        <PayloadViewer payload={item.payload} />
      )}

      {/* Omissions */}
      {item.omissions.length > 0 && (
        <div className="mt-2 text-xs text-ink-3">
          <p className="font-medium">Some fields are intentionally not shown:</p>
          <ul className="mt-0.5 list-disc pl-4">
            {item.omissions.map((om, i) => (
              <li key={i}>
                <span className="font-mono">{om.field_path}</span> — {om.reason_code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TransactionDetailPage() {
  const { transaction: tx, history, historyError, tz } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive active tab from URL directly so the tab switch is visually immediate
  // (loader data `tab` lags behind by one navigation cycle)
  const tab = searchParams.get('tab') || 'summary';
  const historyPage = Math.max(1, parseInt(searchParams.get('history_page') ?? '1', 10) || 1);

  function switchTab(t: string) {
    setSearchParams((prev) => {
      prev.set('tab', t);
      if (t !== 'history') prev.delete('history_page');
      return prev;
    });
  }

  function setHistoryPage(page: number) {
    setSearchParams((prev) => {
      prev.set('history_page', String(page));
      return prev;
    });
  }

  function handlePdfExport() {
    const params = new URLSearchParams();
    params.set('timezone', tz);
    window.location.href = `/transactions/${tx.id}/pdf?${params.toString()}`;
  }

  if (!tx) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Transaction not found"
        action={
          <Link to="/transactions" className="text-sm font-medium text-primary hover:underline">
            Back to transactions
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/transactions"
        className="inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to transactions
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="tnum font-mono text-xl font-semibold text-ink">{tx.merchant_transaction_id}</h1>
          <p className="mt-0.5 text-xs text-ink-3">Internal ID: {tx.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handlePdfExport}>
            <Download className="size-4" aria-hidden />
            Export PDF
          </Button>
          <StatusPill status={tx.status} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="history">
            History
            {!tx.history_available && (
              <span className="text-xs font-normal text-ink-3">(unavailable)</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card className="p-6">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Amount"
                value={
                  <span className="tnum">
                    {tx.amount !== null && tx.currency
                      ? formatMoney(tx.amount, tx.currency)
                      : '—'}
                  </span>
                }
              />
              <Field label="Currency" value={tx.currency ?? '—'} />
              <Field label="Status" value={tx.status} />
              <Field label="Payment Brand" value={tx.payment_brand ?? '—'} />
              <Field label="Payment Method" value={tx.payment_method ?? '—'} />
              <Field
                label="Merchant Reference"
                value={<span className="font-mono text-xs">{tx.merchant_transaction_id}</span>}
              />
              <Field label="Internal ID" value={String(tx.id)} />
              <Field label="Created" value={formatTimestamp(tx.created_at, tz, 'long')} />
              <Field label="Updated" value={formatTimestamp(tx.updated_at, tz, 'long')} />
              <Field
                label="History"
                value={tx.history_available ? 'Available' : 'Not available'}
              />
            </dl>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {!tx.history_available ? (
            <Card className="p-8">
              <EmptyState
                compact
                icon={Clock}
                title="History is not available for this transaction"
                description='Coverage is currently limited to supported payment flows. Absence of history means "not captured", not "nothing happened".'
              />
            </Card>
          ) : historyError ? (
            <Callout variant="danger" role="alert">
              Failed to load history: {historyError}
            </Callout>
          ) : history ? (
            <div className="space-y-4">
              {/* Coverage header */}
              <Card className="p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-3">
                  Coverage
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {Object.entries(history.meta.coverage).map(([kind, status]) => {
                    const statusStr = String(status);
                    const variant =
                      COVERAGE_VARIANT[statusStr as keyof typeof COVERAGE_VARIANT] ?? 'neutral';
                    return (
                      <div key={kind} className="flex items-center gap-1.5">
                        <span className="text-xs capitalize text-ink-3">
                          {kind.replace(/_/g, ' ')}:
                        </span>
                        <Badge variant={variant}>{statusStr}</Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader
                  title={`Event Timeline (${history.data.length})`}
                  description='Payloads are sanitized, allowlisted projections — not raw traffic captures. "Queued" or "prepared for return" does not prove merchant receipt or payment success.'
                />
                <div className="divide-y divide-line">
                  {history.data.map((item: HistoryItem) => (
                    <HistoryEventRow key={item.id} item={item} tz={tz} />
                  ))}
                </div>

                {/* Retention footer */}
                {history.data.length > 0 && (history.data[0]?.retain_until || history.data[0]?.purged_at) && (
                  <div className="border-t border-line bg-surface-2/50 px-5 py-3 text-xs text-ink-3">
                    <Clock className="mr-1 inline size-3" aria-hidden />
                    {history.data[0]?.retain_until &&
                      `Retained until: ${formatTimestamp(history.data[0].retain_until, tz)}`}
                    {history.data[0]?.purged_at &&
                      ` · Purged: ${formatTimestamp(history.data[0].purged_at, tz)}`}
                  </div>
                )}
              </Card>

              {/* History pagination */}
              {history.meta.last_page > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-3">
                    Page {history.meta.current_page} of {history.meta.last_page} · {history.meta.total} total events
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage(historyPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={historyPage >= history.meta.last_page}
                      onClick={() => setHistoryPage(historyPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-3">Loading history…</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Route-level error boundary for transaction detail.
 * Renders inside the layout shell, so the sidebar and header remain visible.
 *   404 → "Transaction not available" with back-to-transactions action
 *   400 → "Invalid transaction ID" with back-to-transactions action
 *   500/other → generic retryable ServerError
 */
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404 || error.status === 400) {
      return (
        <ErrorPage
          tone="default"
          icon={AlertCircle}
          title="Transaction not available"
          description="This transaction may have been removed, or you may not have access to it."
          primaryAction={{ label: 'Back to transactions', to: '/transactions' }}
        />
      );
    }
    return <ServerError />;
  }

  return <ServerError />;
}
