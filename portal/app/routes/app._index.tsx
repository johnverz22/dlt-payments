import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { useLoaderData, useSearchParams, Link, useNavigation } from 'react-router';
import { requireUser } from '~/.server/session';
import { getMerchant } from '~/.server/dlt/merchant';
import { getMetrics, getCharts } from '~/.server/dlt/reporting';
import { listTransactions } from '~/.server/dlt/collections';
import { getCurrencyCatalogue } from '~/.server/dlt/reference';
import { DateTime } from 'luxon';
import { autoInterval } from '~/lib/dates';
import { validateInterval } from '~/lib/intervals';
import { formatMoney, formatPercent } from '~/lib/money';
import { formatTimestamp } from '~/lib/dates';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  X,
  Store,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import { cn } from '~/lib/utils';
import { PageHeader } from '~/components/ui/page-header';
import { Card, CardHeader } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Select } from '~/components/ui/input';
import { SegmentedControl } from '~/components/ui/segmented-control';
import { StatusPill } from '~/components/ui/badge';
import { Callout } from '~/components/ui/callout';
import { InfoTip } from '~/components/ui/tooltip';
import { ChartSkeleton, Skeleton } from '~/components/ui/skeleton';
import { EmptyState } from '~/components/ui/empty-state';

export const meta: MetaFunction = () => [{ title: 'Dashboard | DLT Portal' }];

const DEFAULT_TZ = 'Asia/Manila';

// Status series colors — semantic tokens, correct in both themes
const STATUS_FILL = {
  PAID: 'var(--success)',
  PENDING: 'var(--warning)',
  REJECTED: 'var(--danger)',
} as const;

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-card)',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getPresetRange(preset: string, tz: string): { from: string; to: string } {
  const now = DateTime.now().setZone(tz);
  const iso = (dt: DateTime) => dt.toISO({ suppressMilliseconds: true })!;
  switch (preset) {
    case 'today':
      return { from: iso(now.startOf('day')), to: iso(now.plus({ days: 1 }).startOf('day')) };
    case 'last7':
      // 7 calendar days including today — `to` is tomorrow's start (exclusive)
      return {
        from: iso(now.minus({ days: 6 }).startOf('day')),
        to: iso(now.plus({ days: 1 }).startOf('day')),
      };
    case 'last30':
      // 30 calendar days including today
      return {
        from: iso(now.minus({ days: 29 }).startOf('day')),
        to: iso(now.plus({ days: 1 }).startOf('day')),
      };
    case 'this_month':
      return {
        from: iso(now.startOf('month')),
        to: iso(now.plus({ months: 1 }).startOf('month')),
      };
    case 'last_month': {
      const lm = now.minus({ months: 1 }).startOf('month');
      return { from: iso(lm), to: iso(lm.plus({ months: 1 })) };
    }
    default:
      // Same as 'last7'
      return {
        from: iso(now.minus({ days: 6 }).startOf('day')),
        to: iso(now.plus({ days: 1 }).startOf('day')),
      };
  }
}

/**
 * Classify a DLT error into a structured object the UI can render distinctly.
 * Handles the three spec-defined error codes (§10.1):
 *   503 SERVICE_UNAVAILABLE — currency catalogue or paid-null-amount outage
 *   403 MERCHANT_SCOPE_MISMATCH — foreign merchant selector denied
 *   422 VALIDATION_ERROR — invalid filters / excessive range / too many buckets
 */
type ErrorKind = 'service_unavailable' | 'scope_mismatch' | 'validation' | 'generic';

type ClassifiedError = { message: string; kind: ErrorKind };

function classifyDltError(error: {
  status: number;
  errorCode?: string;
  message: string;
}): ClassifiedError {
  if (error.status === 503 || error.errorCode === 'SERVICE_UNAVAILABLE') {
    return {
      message:
        'The reporting service is temporarily unavailable. This may be due to a currency catalogue outage or a data integrity issue. Please try again in a moment.',
      kind: 'service_unavailable',
    };
  }
  if (error.status === 403 || error.errorCode === 'MERCHANT_SCOPE_MISMATCH') {
    return {
      message:
        'Access denied: your account does not have permission to view this merchant\u2019s data.',
      kind: 'scope_mismatch',
    };
  }
  if (error.status === 422 || error.errorCode === 'VALIDATION_ERROR') {
    return {
      message: `The selected filters are invalid: ${error.message}`,
      kind: 'validation',
    };
  }
  return { message: error.message, kind: 'generic' };
}

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat } = await requireUser(request);
  const url = new URL(request.url);
  const tz = url.searchParams.get('timezone') || DEFAULT_TZ;
  const preset = url.searchParams.get('preset') || 'last30';
  const urlCurrency = url.searchParams.get('currency');

  const merchantResult = await getMerchant(pat);
  const merchantCurrency = merchantResult.ok ? merchantResult.data.currency : 'PHP';
  const currency = urlCurrency || merchantCurrency;

  const { from, to } = getPresetRange(preset, tz);
  const interval = autoInterval(from, to, tz);
  const intervalValidation = validateInterval(from, to, interval, tz);

  // intervalOk=false means the auto-computed interval would exceed API bucket
  // limits (§10.3: ≤366 daily, ≤120 monthly, ≤10 yearly). We still send the
  // request — the API will return 422 — but we surface a preemptive warning.
  const intervalOk = intervalValidation.valid;
  const intervalError = intervalOk
    ? null
    : `This range requires ${intervalValidation.buckets} ${interval} buckets, exceeding the API limit of ${intervalValidation.limit}. Chart data may be unavailable — try a shorter range.`;

  const [metricsResult, chartsResult, txResult, currencyResult] = await Promise.all([
    getMetrics(pat, { currency, from, to, timezone: tz }),
    getCharts(pat, { currency, from, to, interval, timezone: tz }),
    // Recent list is unfiltered per §9.2 (transactions?per_page=10); its
    // meta.total also tells us whether the merchant has ever transacted.
    listTransactions(pat, { per_page: 10, page: 1 }),
    getCurrencyCatalogue(),
  ]);

  const currencies = currencyResult.ok
    ? currencyResult.data
    : [{ cc: merchantCurrency, name: merchantCurrency, symbol: merchantCurrency }];

  // Classify errors with specific codes per §10.1 error matrix
  const metricsErr = metricsResult.ok ? null : classifyDltError(metricsResult.error);
  const chartsErr = chartsResult.ok ? null : classifyDltError(chartsResult.error);

  return {
    metrics: metricsResult.ok ? metricsResult.data : null,
    metricsError: metricsErr ? { message: metricsErr.message, kind: metricsErr.kind } : null,
    charts: chartsResult.ok ? chartsResult.data : null,
    chartsError: chartsErr ? { message: chartsErr.message, kind: chartsErr.kind } : null,
    recentTransactions: txResult.ok ? txResult.data.data : [],
    totalTransactions: txResult.ok ? txResult.data.meta.total : null,
    currencies,
    currency,
    from,
    to,
    preset,
    tz,
    interval,
    intervalOk,
    intervalError,
  };
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  spark,
  info,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  spark?: React.ReactNode;
  info?: string;
  className?: string;
}) {
  const toneClasses = {
    primary: 'bg-primary-subtle text-primary',
    success: 'bg-success-subtle text-success-ink',
    warning: 'bg-warning-subtle text-warning-ink',
    danger: 'bg-danger-subtle text-danger-ink',
    neutral: 'bg-surface-2 text-ink-3',
  }[tone];

  return (
    <Card className={cn('flex flex-col justify-between p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink-3 flex items-center gap-1 text-xs font-medium sm:text-sm">
          {label}
          {info && <InfoTip label={`About ${label}`} content={info} />}
        </p>
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-lg sm:size-8',
            toneClasses,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="tnum text-ink truncate text-xl font-semibold sm:text-2xl">{value}</p>
          {sub && <p className="text-ink-3 mt-1 text-xs">{sub}</p>}
        </div>
        {spark && (
          <div className="hidden h-9 w-24 shrink-0 sm:block" aria-hidden>
            {spark}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Chart card with header legend + real empty state ──────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-ink-3 inline-flex items-center gap-1.5 text-xs">
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

function ChartCard({
  title,
  legend,
  children,
  empty,
  onAdjustRange,
}: {
  title: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
  onAdjustRange?: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          legend ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{legend}</div>
          ) : undefined
        }
        /* On mobile: stack title + legend vertically (legend can be wide).
           sm+: restore horizontal layout with vertical centering. */
        className="flex-col items-start gap-2 sm:flex-row sm:items-center"
      />
      <div className="p-5 pt-4">
        {empty ? (
          <EmptyState
            compact
            icon={BarChart3}
            title="No data for this period"
            description="Try widening the date range or changing the currency."
            action={
              onAdjustRange && (
                <Button variant="secondary" size="sm" onClick={onAdjustRange}>
                  Use last 30 days
                </Button>
              )
            }
          />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

// ─── Error callout helper ─────────────────────────────────────────────────────

function ReportingErrorCallout({
  label,
  message,
  kind,
}: {
  label: string;
  message: string;
  kind: ErrorKind;
}) {
  // 503 is a transient infra issue — warning tone; permission/validation are danger
  const variant = kind === 'service_unavailable' ? 'warning' : 'danger';

  return (
    <Callout variant={variant} role="alert">
      <span className="font-medium">{label}:</span> {message}
    </Callout>
  );
}

// ─── First-run checklist ───────────────────────────────────────────────────────

const CHECKLIST_DISMISS_KEY = 'dlt-onboarding-checklist-dismissed';

function FirstRunChecklist() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(CHECKLIST_DISMISS_KEY) === '1');
    } catch {}
  }, []);

  if (dismissed) return null;

  const items = [
    { icon: Store, label: 'Complete merchant profile', to: '/settings/merchant' },
    { icon: UserPlus, label: 'Invite a teammate', to: '/settings/team' },
  ];

  return (
    <Card className="border-primary/30 bg-primary-subtle/40">
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-ink text-sm font-semibold">Get started with DLT Portal</h2>
          <p className="text-ink-3 mt-0.5 text-xs">
            Finish these steps to start accepting payments.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {items.map(({ icon: Icon, label, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="border-line bg-surface text-ink hover:bg-surface-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                >
                  <Icon className="text-primary size-3.5" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          aria-label="Dismiss checklist"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(CHECKLIST_DISMISS_KEY, '1');
            } catch {}
          }}
          className="text-ink-3 hover:bg-surface hover:text-ink rounded-md p-1 transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
] as const;

export default function DashboardPage() {
  const {
    metrics,
    metricsError,
    charts,
    chartsError,
    recentTransactions,
    totalTransactions,
    currencies,
    currency,
    from,
    to,
    preset,
    tz,
    interval,
    intervalOk,
    intervalError,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  function setPreset(p: string) {
    setSearchParams((prev) => {
      prev.set('preset', p);
      return prev;
    });
  }

  function setCurrency(c: string) {
    setSearchParams((prev) => {
      prev.set('currency', c);
      return prev;
    });
  }

  function refresh() {
    setSearchParams((prev) => {
      prev.set('_t', String(Date.now()));
      return prev;
    });
  }

  // KPI source of truth: metrics is the dedicated summary endpoint (§10.2).
  // charts.totals reconciles with bucket aggregation (§10.3) and can cross-check,
  // but metrics is the canonical single-read source.
  const kpi = metrics;

  // Prepare chart data from buckets
  const buckets = charts?.buckets ?? [];
  const collectionChartData = buckets.map((b) => ({
    period: b.period,
    amount: new Decimal(b.collection_total || '0').toNumber(),
    partial: b.partial,
  }));
  const statusChartData = buckets.map((b) => ({
    period: b.period,
    PAID: b.successful_count,
    PENDING: b.pending_count,
    REJECTED: b.rejected_count,
    partial: b.partial,
  }));
  const successRateData = buckets.map((b) => ({
    period: b.period,
    // null success_rate_percent means empty bucket — render gap, not 0% (§10.3)
    rate: b.success_rate_percent !== null ? new Decimal(b.success_rate_percent).toNumber() : null,
    partial: b.partial,
  }));

  // Donut uses metrics counts (overall, not per-bucket averages per §10.2)
  const donutData = kpi
    ? [
        { name: 'PAID', value: kpi.successful_count, fill: STATUS_FILL.PAID },
        { name: 'PENDING', value: kpi.pending_count, fill: STATUS_FILL.PENDING },
        { name: 'REJECTED', value: kpi.rejected_count, fill: STATUS_FILL.REJECTED },
      ]
    : [];

  const asOf = charts?.as_of ?? metrics?.as_of;
  const noTransactions = kpi != null && kpi.transaction_count === 0;
  // Lifetime emptiness — the merchant has never transacted, in any period.
  // null means the list call failed; don't show onboarding on a fetch error.
  const lifetimeEmpty = totalTransactions === 0;
  // Period is empty but older data exists — hint instead of looking broken.
  const periodEmpty = noTransactions && totalTransactions !== null && totalTransactions > 0;

  // "View all" keeps the dashboard's filters so the list reconciles with the KPIs (§9.2)
  const txLinkParams = new URLSearchParams({ currency, from, to });

  // Display currency follows the API echo; fall back to the requested one
  const displayCurrency = kpi?.currency ?? currency;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          /* Mobile: Select + refresh on one row, segmented control below (full
             width). sm+: all three in a single horizontal row. */
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* Row 1 on mobile: currency picker + refresh button */}
            <div className="flex items-center gap-2">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
                className="min-w-0 flex-1 sm:w-[180px] sm:flex-none"
              >
                {currencies.map((c) => (
                  <option key={c.cc} value={c.cc}>
                    {c.cc} — {c.name}
                  </option>
                ))}
              </Select>

              <Button
                variant="secondary"
                size="icon"
                onClick={refresh}
                aria-label="Refresh dashboard data"
                className="shrink-0 sm:hidden"
              >
                <RefreshCw className={cn(isLoading && 'animate-spin')} aria-hidden />
              </Button>
            </div>

            {/* Row 2 on mobile: date presets — scrollable within control */}
            <SegmentedControl
              ariaLabel="Date range"
              options={[...PRESETS]}
              value={preset as (typeof PRESETS)[number]['value']}
              onChange={setPreset}
              className="w-full sm:w-auto"
            />

            {/* Refresh only visible sm+ (hidden on mobile, shown above) */}
            <Button
              variant="secondary"
              size="icon"
              onClick={refresh}
              aria-label="Refresh dashboard data"
              className="hidden shrink-0 sm:flex"
            >
              <RefreshCw className={cn(isLoading && 'animate-spin')} aria-hidden />
            </Button>
          </div>
        }
      />

      {/* Data freshness — small timestamp + cohort-caveat tooltip */}
      {asOf && (
        <p className="text-ink-3 flex items-center gap-1.5 text-xs">
          As of {DateTime.fromISO(asOf).setZone(tz).toFormat('HH:mm')}
          <InfoTip
            label="About this timestamp"
            content="Numbers reflect a creation-time cohort and may change as pending items resolve."
          />
        </p>
      )}

      {/* ── Interval bucket-limit warning (§10.3) ───────────────────────────── */}
      {intervalError && !intervalOk && (
        <Callout variant="warning" role="alert">
          <span className="font-medium">Date range too wide for {interval} buckets:</span>{' '}
          {intervalError}
        </Callout>
      )}

      {/* ── Metrics error — separate from charts error per §10.1 ────────────── */}
      {metricsError && (
        <ReportingErrorCallout
          label="Could not load metrics"
          message={metricsError.message}
          kind={metricsError.kind as ErrorKind}
        />
      )}

      {/* ── Charts error — separate callout so partial data is still visible ── */}
      {chartsError && (
        <ReportingErrorCallout
          label="Could not load chart data"
          message={chartsError.message}
          kind={chartsError.kind as ErrorKind}
        />
      )}

      {/* Empty period but the merchant has older data — say so plainly */}
      {periodEmpty && (
        <Callout variant="info">
          <span className="font-medium">No transactions in this period.</span> Your account has{' '}
          {(totalTransactions ?? 0).toLocaleString('en-PH')} transaction
          {totalTransactions === 1 ? '' : 's'} in total — try a wider date range such as{' '}
          <button type="button" className="underline" onClick={() => setPreset('last30')}>
            Last 30 days
          </button>
          .
        </Callout>
      )}

      {/* First-run checklist — only when the merchant has never transacted */}
      {lifetimeEmpty && <FirstRunChecklist />}

      {/* ── KPI row — 2-col on mobile, two half-width groups on desktop so the
             center gap aligns with the 2-col chart grid below ──────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {isLoading && !kpi ? (
          <>
            <div className="contents lg:grid lg:grid-cols-[3.5fr_2.5fr] lg:gap-4">
              <Skeleton className="col-span-2 h-[118px] rounded-xl lg:col-span-1" />
              <Skeleton className="h-[118px] rounded-xl" />
            </div>
            <div className="contents lg:grid lg:grid-cols-[3fr_1.5fr_1.5fr] lg:gap-4">
              <Skeleton className="h-[118px] rounded-xl" />
              <Skeleton className="h-[118px] rounded-xl" />
              <Skeleton className="h-[118px] rounded-xl" />
            </div>
          </>
        ) : (
          <>
            <div className="contents lg:grid lg:grid-cols-[3.5fr_2.5fr] lg:gap-4">
              <KpiCard
                label="Total Collected"
                value={formatMoney(kpi?.collection_total ?? null, displayCurrency)}
                sub="Gross, before fees"
                info="Gross successful collections before fees — not net settlement or refundable balance."
                icon={TrendingUp}
                tone="primary"
                className="col-span-2 lg:col-span-1"
                spark={
                  collectionChartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={collectionChartData}
                        margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
                      >
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="var(--chart-1)"
                          fill="var(--chart-1)"
                          fillOpacity={0.15}
                          strokeWidth={1.5}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : undefined
                }
              />
              <KpiCard
                label="Transactions"
                value={kpi ? kpi.transaction_count.toLocaleString('en-PH') : '—'}
                icon={Activity}
                tone="neutral"
              />
            </div>
            <div className="contents lg:grid lg:grid-cols-[3fr_1.5fr_1.5fr] lg:gap-4">
              <KpiCard
                label="Success Rate"
                value={
                  kpi && kpi.transaction_count > 0 ? formatPercent(kpi.success_rate_percent) : '—'
                }
                sub={
                  noTransactions
                    ? periodEmpty
                      ? 'None in this period'
                      : 'No transactions yet'
                    : undefined
                }
                icon={CheckCircle}
                tone="success"
                spark={
                  successRateData.some((d) => d.rate !== null) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={successRateData}
                        margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
                      >
                        <Line
                          type="monotone"
                          dataKey="rate"
                          stroke="var(--success)"
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : undefined
                }
              />
              <KpiCard
                label="Pending"
                value={kpi ? kpi.pending_count.toLocaleString('en-PH') : '—'}
                icon={Clock}
                tone="warning"
              />
              <KpiCard
                label="Rejected"
                value={kpi ? kpi.rejected_count.toLocaleString('en-PH') : '—'}
                icon={XCircle}
                tone="danger"
              />
            </div>
          </>
        )}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      {isLoading && !charts ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <ChartSkeleton />
          </Card>
          <Card className="p-5">
            <ChartSkeleton />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
          {/* Collection trend bar chart — partial buckets in chart-partial color */}
          <ChartCard
            title={`Collection Trend (${currency})`}
            empty={buckets.length === 0}
            onAdjustRange={() => setPreset('last30')}
            legend={
              <>
                <LegendDot color="var(--chart-1)" label="Collected" />
                <LegendDot color="var(--chart-partial)" label="Partial period" />
              </>
            }
          >
            <div className="h-[160px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={collectionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                    minTickGap={24}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) =>
                      new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(
                        Number(v),
                      )
                    }
                    labelFormatter={(label, payload) => {
                      const partial = payload?.[0]?.payload?.partial as boolean | undefined;
                      return partial ? `${label} (partial period)` : label;
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--chart-1)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  >
                    {collectionChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.partial ? 'var(--chart-partial)' : 'var(--chart-1)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Transaction volume stacked bar chart */}
          <ChartCard
            title="Transaction Volume by Status"
            empty={buckets.length === 0}
            onAdjustRange={() => setPreset('last30')}
            legend={
              <>
                <LegendDot color="var(--success)" label="Paid" />
                <LegendDot color="var(--warning)" label="Pending" />
                <LegendDot color="var(--danger)" label="Rejected" />
              </>
            }
          >
            <div className="h-[160px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-2)' }}
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(label, payload) => {
                      const partial = payload?.[0]?.payload?.partial as boolean | undefined;
                      return partial ? `${label} (partial period)` : label;
                    }}
                  />
                  <Bar dataKey="PAID" stackId="a" fill="var(--success)" isAnimationActive={false} />
                  <Bar
                    dataKey="PENDING"
                    stackId="a"
                    fill="var(--warning)"
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="REJECTED"
                    stackId="a"
                    fill="var(--danger)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Success rate line chart — gaps for empty buckets (null rate) */}
          <ChartCard
            title="Success Rate Trend (%)"
            empty={buckets.length === 0}
            onAdjustRange={() => setPreset('last30')}
            legend={
              <>
                <LegendDot color="var(--success)" label="Success rate" />
                <LegendDot color="var(--chart-partial)" label="Partial period" />
              </>
            }
          >
            <div className="h-[150px] sm:h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--line)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--line-strong)' }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => `${Number(v).toFixed(2)}%`}
                    labelFormatter={(label, payload) => {
                      const partial = payload?.[0]?.payload?.partial as boolean | undefined;
                      return partial ? `${label} (partial period)` : label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Status mix donut — uses metrics counts per §10.2 */}
          <ChartCard
            title="Status Mix"
            empty={!kpi || kpi.transaction_count === 0}
            onAdjustRange={() => setPreset('last30')}
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <div className="h-[140px] w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={62}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="var(--surface)"
                      isAnimationActive={false}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 sm:flex-1">
                {donutData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: d.fill }}
                        aria-hidden
                      />
                      <span className="text-ink-2">{d.name}</span>
                    </span>
                    <span className="tnum text-ink font-semibold">{d.value}</span>
                  </li>
                ))}
                {/* Chart totals reconciliation footnote (§10.3) */}
                {charts?.totals && kpi && (
                  <li className="border-line text-ink-3 mt-3 border-t pt-2 text-xs">
                    Chart total: {charts.totals.transaction_count.toLocaleString('en-PH')} txns
                    {charts.totals.success_rate_percent !== null && (
                      <> &middot; {formatPercent(charts.totals.success_rate_percent)} success</>
                    )}
                  </li>
                )}
              </ul>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── Recent transactions ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Recent Transactions"
          action={
            <Link
              to={`/transactions?${txLinkParams.toString()}`}
              className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-xs font-medium"
            >
              View all <ArrowRight className="size-3" aria-hidden />
            </Link>
          }
        />
        {recentTransactions.length === 0 ? (
          <EmptyState
            compact
            icon={Activity}
            title="No transactions yet"
            description="New collection transactions will appear here."
          />
        ) : (
          <>
            {/* Mobile: compact stacked list */}
            <ul className="divide-line divide-y sm:hidden">
              {recentTransactions.map((tx) => (
                <li key={tx.id}>
                  <Link
                    to={`/transactions/${tx.id}`}
                    className="hover:bg-surface-2/60 block px-5 py-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-primary min-w-0 truncate font-mono text-xs">
                        {tx.merchant_transaction_id}
                      </span>
                      <StatusPill status={tx.status} />
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                      <span className="tnum text-ink text-sm font-medium">
                        {tx.amount !== null && tx.currency
                          ? formatMoney(tx.amount, tx.currency)
                          : '—'}
                      </span>
                      <span className="text-ink-3 shrink-0 text-xs">
                        {formatTimestamp(tx.created_at, tz)}
                      </span>
                    </div>
                    {tx.payment_brand && (
                      <p className="text-ink-3 mt-0.5 text-xs">{tx.payment_brand}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            {/* sm+: full table, scrolls within the card */}
            <div className="hidden overflow-x-auto py-1 sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-line bg-surface-2 text-ink-3 border-b text-left text-xs font-medium tracking-wider uppercase">
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Brand</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          to={`/transactions/${tx.id}`}
                          className="text-primary font-mono text-xs hover:underline"
                        >
                          {tx.merchant_transaction_id}
                        </Link>
                      </td>
                      <td className="tnum text-ink px-5 py-3">
                        {tx.amount !== null && tx.currency
                          ? formatMoney(tx.amount, tx.currency)
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill status={tx.status} />
                      </td>
                      <td className="text-ink-2 px-5 py-3">{tx.payment_brand ?? '—'}</td>
                      <td className="text-ink-3 px-5 py-3">{formatTimestamp(tx.created_at, tz)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
