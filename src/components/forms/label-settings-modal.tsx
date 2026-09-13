/**
 * components/forms/label-settings-modal.tsx — Label override settings.
 * Persists label preferences to localStorage['dlt_payee_label_preferences'].
 */

"use client";

import { useState, useEffect } from "react";

export interface LabelPreferences {
  product_name?: string;
  product_description?: string;
  product_reference_id?: string;
}

const inputClass = "w-full text-sm bg-slate-50/70 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

export function LabelSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [labels, setLabels] = useState<LabelPreferences>({});

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('dlt_payee_label_preferences');
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/80">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Customise Labels</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tailor the field labels shown to payors on the billing form.
          </p>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Product Name Label</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Invoice Number"
              value={labels.product_name || ""}
              onChange={(e) => setLabels({ ...labels, product_name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Product Description Label</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Order Details"
              value={labels.product_description || ""}
              onChange={(e) => setLabels({ ...labels, product_description: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Reference ID Label</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Customer ID"
              value={labels.product_reference_id || ""}
              onChange={(e) => setLabels({ ...labels, product_reference_id: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end items-center gap-3">
          <button 
            onClick={handleReset} 
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors mr-auto"
          >
            Reset to Default
          </button>
          <button 
            onClick={onClose} 
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="rounded-xl bg-[#0052FF] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-[#0045d8] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
