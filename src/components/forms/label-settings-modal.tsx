/**
 * components/forms/label-settings-modal.tsx — Label override settings.
 * Persists label preferences to localStorage['dlt_payee_label_preferences'].
 * TODO (Phase 4 — task 4.2): implement.
 */

"use client";

import { useState, useEffect } from "react";

export interface LabelPreferences {
  product_name?: string;
  product_description?: string;
  product_reference_id?: string;
}

export function LabelSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [labels, setLabels] = useState<LabelPreferences>({});

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('dlt_payee_label_preferences');
        // eslint-disable-next-line
        if (stored) setLabels(JSON.parse(stored));
      } catch (_e) {
        // ignore parse errors
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('dlt_payee_label_preferences', JSON.stringify(labels));
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem('dlt_payee_label_preferences');
    setLabels({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Label Overrides</h2>
        <p className="mb-4 text-sm text-slate-500">
          Customize the labels shown to payors on the billing form.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Name Label</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Invoice Number"
              value={labels.product_name || ""}
              onChange={(e) => setLabels({ ...labels, product_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Description Label</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Order Details"
              value={labels.product_description || ""}
              onChange={(e) => setLabels({ ...labels, product_description: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reference ID Label</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Customer ID"
              value={labels.product_reference_id || ""}
              onChange={(e) => setLabels({ ...labels, product_reference_id: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={handleReset} className="rounded-md px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            Reset
          </button>
          <button onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
