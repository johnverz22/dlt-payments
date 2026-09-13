/**
 * components/checkout/payment-method-tabs.tsx — Tabbed payment method selector.
 * Splits Brand[] into card (is_card: true) and e-wallet (is_card: false) groups,
 * renders as two tabs with interactive switching.
 *
 * Card tab: display-only grid of supported card networks.
 * E-wallet tab: selectable radio-style cards for each e-wallet brand.
 */

"use client";

import { useState, useMemo } from "react";
import type { Brand } from "../../lib/dlt-client";

interface PaymentMethodTabsProps {
  brands: Brand[];
  selectedBrand: Brand | null;
  onSelectBrand: (brand: Brand) => void;
  amountDisplay: string;
}

export function PaymentMethodTabs({
  brands,
  selectedBrand,
  onSelectBrand,
  amountDisplay,
}: PaymentMethodTabsProps) {
  const { cardBrands, ewalletBrands } = useMemo(() => {
    const cards: Brand[] = [];
    const ewallets: Brand[] = [];
    for (const b of brands) {
      if (b.is_card) cards.push(b);
      else ewallets.push(b);
    }
    return { cardBrands: cards, ewalletBrands: ewallets };
  }, [brands]);

  // If there are only e-wallets and no cards (or vice-versa), default to
  // whichever tab has brands.
  const [activeTab, setActiveTab] = useState<"card" | "ewallet">(
    cardBrands.length > 0 ? "card" : "ewallet"
  );

  const activeTabClass =
    "flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg bg-white shadow-sm border border-slate-200/80 text-slate-900 transition-all";
  const inactiveTabClass =
    "flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 transition-all";

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          Payment method
        </label>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5 text-emerald-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              fillRule="evenodd"
            />
          </svg>
          Guaranteed secure
        </span>
      </div>

      {/* Segmented Tab Selector */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/50">
        <button
          type="button"
          className={activeTab === "card" ? activeTabClass : inactiveTabClass}
          onClick={() => setActiveTab("card")}
          disabled={cardBrands.length === 0}
        >
          <svg
            className={`w-4 h-4 ${activeTab === "card" ? "text-[#0052FF]" : "text-slate-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect height="14" rx="2" strokeWidth="2" width="20" x="2" y="5" />
            <line strokeWidth="2" x1="2" x2="22" y1="10" y2="10" />
          </svg>
          Credit / Debit Card
          {cardBrands.length === 0 && (
            <span className="text-[10px] text-slate-400">(N/A)</span>
          )}
        </button>
        <button
          type="button"
          className={
            activeTab === "ewallet" ? activeTabClass : inactiveTabClass
          }
          onClick={() => setActiveTab("ewallet")}
          disabled={ewalletBrands.length === 0}
        >
          <svg
            className={`w-4 h-4 ${activeTab === "ewallet" ? "text-[#0052FF]" : "text-slate-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          E-Wallets &amp; QR Ph
          {ewalletBrands.length === 0 && (
            <span className="text-[10px] text-slate-400">(N/A)</span>
          )}
        </button>
      </div>

      {/* Panel container — both panels always in the DOM.
          w-full prevents the wrapper from collapsing when the active panel
          transitions between relative and absolute positioning. */}
      <div className="relative w-full">
        {/* Panel 1: Credit / Debit Card */}
        <div
          aria-hidden={activeTab !== "card"}
          className={`space-y-3 pt-1 transition-opacity duration-150 ${
            activeTab === "card"
              ? "relative opacity-100 pointer-events-auto"
              : "absolute inset-0 opacity-0 pointer-events-none select-none"
          }`}
        >
          <div className="text-xs text-slate-600 mb-1">
            Supported card networks:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {cardBrands.map((brand) => (
              <button
                type="button"
                key={brand.code}
                onClick={() => onSelectBrand(brand)}
                tabIndex={activeTab === "card" ? 0 : -1}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition cursor-pointer ${
                  selectedBrand?.code === brand.code
                    ? "border-[#0052FF] bg-blue-50/40"
                    : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
                }`}
              >
                {selectedBrand?.code === brand.code && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0052FF] absolute top-2 right-2 ring-2 ring-white" />
                )}
                <div className="h-6 flex items-center">
                  {brand.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.image}
                      alt={brand.value}
                      className="h-5 w-auto max-w-[60px] object-contain"
                    />
                  ) : (
                    <span className="font-extrabold text-sm tracking-tight text-blue-700">
                      {brand.value}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-600 mt-1">
                  {brand.value}
                </span>
              </button>
            ))}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-blue-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>
              No card details required on this page. You will be redirected to
              the secure 3D-Secure payment gateway.
            </span>
          </div>
        </div>

        {/* Panel 2: E-Wallets & QR Ph */}
        <div
          aria-hidden={activeTab !== "ewallet"}
          className={`space-y-3 pt-1 transition-opacity duration-150 ${
            activeTab === "ewallet"
              ? "relative opacity-100 pointer-events-auto"
              : "absolute inset-0 opacity-0 pointer-events-none select-none"
          }`}
        >
          <div className="text-xs text-slate-600 mb-1">
            Select your preferred e-wallet gateway:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ewalletBrands.map((brand) => {
              const isSelected = selectedBrand?.code === brand.code;
              return (
                <label
                  key={brand.code}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${
                    isSelected
                      ? "border-[#0052FF] bg-blue-50/40"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => onSelectBrand(brand)}
                >
                  <input
                    className="hidden"
                    name="ewallet-selection"
                    type="radio"
                    value={brand.value}
                    checked={isSelected}
                    tabIndex={activeTab === "ewallet" ? 0 : -1}
                    readOnly
                  />
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0052FF] absolute top-2 right-2 ring-2 ring-white" />
                  )}
                  <div className="h-6 flex items-center">
                    {brand.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.image}
                        alt={brand.value}
                        className="h-5 w-auto max-w-[60px] object-contain"
                      />
                    ) : (
                      <span className="font-bold text-xs tracking-tight text-blue-600">
                        {brand.value}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 mt-1">
                    {brand.value}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <svg
              className="w-4 h-4 text-[#0052FF] shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span>
              You will be redirected securely to authenticate and complete this
              transaction of <strong>{amountDisplay}</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
