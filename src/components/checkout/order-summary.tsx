/**
 * components/checkout/order-summary.tsx — Right-side sticky order summary card.
 * Displays product info, VAT breakdown, and total due in a dark themed card.
 * Pure presentational — no state management. VAT computed by parent.
 */

interface OrderSummaryProps {
  productName: string;
  productDescription: string;
  productReferenceId: string;
  amountDisplay: string;
  /** Labels for the product fields, already resolved (with fallbacks). */
  labels: {
    product_name: string;
    product_description: string;
    product_reference_id: string;
  };
  /** VAT rate in basis points, e.g. 1200 = 12%. */
  vatRate?: number;
  /** Pre-computed VAT breakdown (cents). Omit if no vatRate. */
  vatBreakdown?: {
    baseCents: number;
    vatCents: number;
    totalCents: number;
  } | null;
  /** Formatted VAT amount string (e.g. "₱10.71"). */
  vatDisplay?: string;
  /** Formatted total string (e.g. "₱100.00"). */
  totalDisplay: string;
  /**
   * The product_reference_id from the payment link payload.
   * This is the reference provided by the merchant when generating the link.
   */
  referenceId: string;
}

export function OrderSummary({
  productName,
  productDescription,
  amountDisplay,
  labels,
  vatRate,
  vatDisplay,
  totalDisplay,
  referenceId,
}: OrderSummaryProps) {
  const vatPercent =
    vatRate != null && vatRate > 0
      ? (vatRate / 100).toFixed(2).replace(/\.?0+$/, "")
      : null;

  return (
    <aside
      className="lg:col-span-5 xl:col-span-5 lg:sticky lg:self-start space-y-4 top-24"
      data-purpose="order-summary-pane"
    >
      <div className="rounded-2xl border border-slate-800 shadow-xl p-6 sm:p-7 space-y-6 bg-slate-900 text-white">
        {/* Header */}
        <div className="pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Order Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review items &amp; computed tax
          </p>
        </div>

        {/* Product item */}
        <div className="space-y-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
          {/* Name, description, and amount */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-white">{productName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {productDescription}
                </p>
              </div>
            </div>
            <span className="font-bold text-sm text-white whitespace-nowrap shrink-0">
              {amountDisplay}
            </span>
          </div>

          {/* Reference ID — full-width row below, tied to the product */}
          <div className="border-t border-slate-700/50 pt-3 flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-slate-500 shrink-0">
              {labels.product_reference_id}
            </span>
            <span
              className="text-xs font-mono text-slate-300 text-right break-all"
              title={referenceId}
            >
              {referenceId}
            </span>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-3.5 text-sm">
          {vatPercent && vatDisplay && (
            <div className="flex justify-between items-center text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                VAT ({vatPercent}%)
                <span className="group relative cursor-pointer">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="VAT information"
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path
                      d="M12 8h.01M12 12v4"
                      strokeLinecap="round"
                      strokeWidth="2"
                    />
                  </svg>
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-slate-700 px-3 py-2 text-[11px] leading-relaxed text-slate-200 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 text-center">
                    VAT is calculated based on billing information and product details.
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
                  </span>
                </span>
              </span>
              <span className="font-medium text-slate-200">
                {vatDisplay}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  (Included)
                </span>
              </span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-4 mt-4 flex justify-between items-baseline">
            <div>
              <span className="text-sm font-semibold text-white">
                Total Amount Due
              </span>
              {vatPercent && (
                <p className="text-[11px] text-slate-400">
                  Includes all applicable PH taxes
                </p>
              )}
            </div>
            <span className="text-2xl sm:text-[28px] font-extrabold text-blue-400 tracking-tight">
              {totalDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Assistance Card */}
      <div className="bg-white/60 rounded-xl border border-slate-200/60 p-4 text-xs text-slate-500 flex items-center justify-between">
        <span>Need help completing checkout?</span>
        <span className="font-semibold text-[#0052FF]">Contact Support</span>
      </div>
    </aside>
  );
}
