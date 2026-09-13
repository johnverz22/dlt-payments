/**
 * components/forms/link-create-form.tsx — Payment link creation form.
 * Fields: amount, product_name, product_description, product_reference_id.
 * Uses lib/money.ts for client-side pre-validation (server is authoritative).
 * TODO (Phase 4 — task 4.2): implement.
 */

"use client";

import { useState } from "react";
import { isValidAmount } from "../../lib/money";
import { LabelSettingsModal, LabelPreferences } from "./label-settings-modal";

function getCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find(row => row.startsWith('csrf_token='));
  return match ? decodeURIComponent(match.split('=')[1]) : '';
}

interface LinkCreateFormProps {
  onSuccess: (data: { url: string; link_id: string; merchant_transaction_id: string; expires_at: number }) => void;
}

export function LinkCreateForm({ onSuccess }: LinkCreateFormProps) {
  const [amount, setAmount] = useState("");
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productRef, setProductRef] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidAmount(amount)) {
      setError("Invalid amount format. Must be like '1500.00' and <= 500000.00");
      return;
    }

    setLoading(true);

    let labels: LabelPreferences = {};
    try {
      const stored = localStorage.getItem('dlt_payee_label_preferences');
      if (stored) labels = JSON.parse(stored);
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
          amount,
          product_name: productName || undefined,
          product_description: productDesc || undefined,
          product_reference_id: productRef || undefined,
          labels: Object.keys(labels).length > 0 ? labels : undefined
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to create payment link");
      } else {
        onSuccess(data);
        // Reset form
        setAmount("");
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
      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Payment Link Details</h2>
          <button 
            type="button" 
            onClick={() => setIsLabelModalOpen(true)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Label Settings
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount (PHP)</label>
          <input
            type="text"
            required
            placeholder="1500.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">Must be a decimal string, e.g. &quot;1500.00&quot;</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Product Name (Optional)</label>
          <input
            type="text"
            maxLength={60}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Product Description (Recommended)</label>
          <input
            type="text"
            maxLength={120}
            value={productDesc}
            onChange={(e) => setProductDesc(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">DLT may fail the request if this is omitted.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Reference ID (Optional)</label>
          <input
            type="text"
            maxLength={40}
            value={productRef}
            onChange={(e) => setProductRef(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Link"}
        </button>
      </form>

      <LabelSettingsModal 
        isOpen={isLabelModalOpen} 
        onClose={() => setIsLabelModalOpen(false)} 
      />
    </>
  );
}
