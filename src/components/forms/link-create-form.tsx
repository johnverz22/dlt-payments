/**
 * components/forms/link-create-form.tsx — Payment link creation form.
 * Fields: amount, vat_rate (display-only, default 12%), product_name (required),
 *         product_description (required), product_reference_id (required).
 * Uses lib/money.ts for client-side pre-validation and VAT computation.
 * vat_rate is stored in the token for display to the payor — it is NOT
 * submitted to DLT. DLT always receives the full VAT-inclusive amount.
 *
 * Label preferences are loaded from localStorage on mount so the merchant
 * sees their custom field labels while filling out the form, matching exactly
 * what the payor will see. Labels are per-origin (device/browser scoped) which
 * is the right tradeoff for a cosmetic preference — no server round-trip needed.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { isValidAmount, computeVat, formatCents } from "../../lib/money";
import { LabelSettingsModal, LabelPreferences } from "./label-settings-modal";

function getCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

const DEFAULT_VAT_RATE_PCT = "12";

/** Default field labels — shown when the merchant hasn't customised them. */
const DEFAULT_LABELS: Required<LabelPreferences> = {
  product_name: "Product Name",
  product_description: "Product Description",
  product_reference_id: "Reference ID",
};

// Common input styles mapping checkout form design language
const inputClass = "w-full text-sm bg-slate-50/70 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1";

interface LinkCreateFormProps {
  onSuccess: (data: { url: string; link_id: string; merchant_transaction_id: string; expires_at: number }) => void;
}

export function LinkCreateForm({ onSuccess }: LinkCreateFormProps) {
  const [amount, setAmount] = useState("");
  const [vatRateInput, setVatRateInput] = useState(DEFAULT_VAT_RATE_PCT);
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productRef, setProductRef] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Labels loaded from localStorage — drives field labels live so the merchant
  // sees exactly what the payor will see. Reloaded each time the modal closes.
  const [labels, setLabels] = useState<LabelPreferences>({});

  const loadLabels = () => {
    try {
      const stored = localStorage.getItem('dlt_payee_label_preferences');
      if (stored) setLabels(JSON.parse(stored));
      else setLabels({});
    } catch (_e) {
      // ignore parse errors
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLabels();
  }, []);

  /** Resolved labels — falls back to defaults for any unset key. */
  const fieldLabels = {
    product_name: labels.product_name?.trim() || DEFAULT_LABELS.product_name,
    product_description: labels.product_description?.trim() || DEFAULT_LABELS.product_description,
    product_reference_id: labels.product_reference_id?.trim() || DEFAULT_LABELS.product_reference_id,
  };

  /** Normalise the raw amount string the same way handleSubmit does, then compute VAT. */
  const vatBreakdown = useMemo(() => {
    let a = amount.trim();
    if (/^\d+$/.test(a)) a += ".00";
    else if (/^\d+\.\d$/.test(a)) a += "0";
    if (!isValidAmount(a)) return null;

    const ratePct = parseFloat(vatRateInput);
    if (isNaN(ratePct) || ratePct < 0 || ratePct > 100) return null;

    const rateBps = Math.round(ratePct * 100); // e.g. 12% → 1200 bps
    return computeVat(a, rateBps);
  }, [amount, vatRateInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let finalAmount = amount.trim();
    if (/^\d+$/.test(finalAmount)) {
      finalAmount += ".00";
    } else if (/^\d+\.\d$/.test(finalAmount)) {
      finalAmount += "0";
    }

    if (!isValidAmount(finalAmount)) {
      setError("Invalid amount format. Must be like '1500.00' and <= 500000.00");
      return;
    }

    const ratePct = parseFloat(vatRateInput);
    if (isNaN(ratePct) || ratePct < 0 || ratePct > 100) {
      setError("VAT rate must be between 0 and 100.");
      return;
    }
    const vatRateBps = Math.round(ratePct * 100);

    setLoading(true);

    // Re-read labels at submit time (in case they were changed in another tab)
    let currentLabels: LabelPreferences = {};
    try {
      const stored = localStorage.getItem('dlt_payee_label_preferences');
      if (stored) currentLabels = JSON.parse(stored);
    } catch (_e) {}

    try {
      const csrfToken = getCsrfToken();

      const res = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          amount: finalAmount,
          vat_rate: vatRateBps,
          product_name: productName,
          product_description: productDesc,
          product_reference_id: productRef,
          labels: Object.keys(currentLabels).length > 0 ? currentLabels : undefined
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create payment link");
      } else {
        onSuccess(data);
        // Reset form
        setAmount("");
        setVatRateInput(DEFAULT_VAT_RATE_PCT);
        setProductName("");
        setProductDesc("");
        setProductRef("");
      }
    } catch (_err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Payment Details</h2>
            <p className="text-xs text-slate-500 mt-1">Configure the amount and item description.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsLabelModalOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Customise Labels
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Amount + VAT rate side by side */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Amount (PHP)</label>
              <input
                type="text"
                required
                placeholder="1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">VAT-inclusive total, e.g. &quot;1500.00&quot;</p>
            </div>

            <div>
              <label className={labelClass}>VAT Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={vatRateInput}
                onChange={(e) => setVatRateInput(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-[11px] text-slate-500">Display only</p>
            </div>
          </div>

          {/* Live VAT breakdown — shown once amount is valid */}
          {vatBreakdown && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-600 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Base amount (excl. VAT)</span>
                <span className="font-medium text-slate-700">{formatCents(vatBreakdown.baseCents)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">VAT ({vatRateInput}%)</span>
                <span className="font-medium text-slate-700">{formatCents(vatBreakdown.vatCents)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-semibold text-slate-900 mt-2">
                <span>Total Amount Due</span>
                <span className="text-[#0052FF]">{formatCents(vatBreakdown.totalCents)}</span>
              </div>
            </div>
          )}

          {/* Product fields */}
          <div>
            <label className={labelClass}>
              {fieldLabels.product_name}
              <span className="ml-1 text-red-500 font-normal" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={60}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className={inputClass}
              placeholder={`e.g. Premium Subscription`}
            />
          </div>

          <div>
            <label className={labelClass}>
              {fieldLabels.product_description}
              <span className="ml-1 text-red-500 font-normal" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              className={inputClass}
              placeholder="e.g. 1 year access to all features"
            />
          </div>

          <div>
            <label className={labelClass}>
              {fieldLabels.product_reference_id}
              <span className="ml-1 text-red-500 font-normal" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={productRef}
              onChange={(e) => setProductRef(e.target.value)}
              className={inputClass}
              placeholder="e.g. INV-2023-001"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-[#0052FF] hover:bg-[#0045d8] active:scale-[0.99] text-white font-semibold text-sm transition duration-150 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-blue-200" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Generate Link</span>
              </>
            )}
          </button>
        </div>
      </form>

      <LabelSettingsModal
        isOpen={isLabelModalOpen}
        onClose={() => {
          setIsLabelModalOpen(false);
          loadLabels(); // refresh labels so field labels update immediately
        }}
      />
    </>
  );
}
