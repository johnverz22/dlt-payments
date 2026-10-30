/**
 * (dashboard)/dashboard/page.tsx — Link generator + label settings.
 * Tab 1: Create Payment Link form + generated link output card.
 */

"use client";

import { useState } from "react";
import { LinkCreateForm } from "../../../components/forms/link-create-form";

export default function DashboardPage() {
  const [generatedLink, setGeneratedLink] = useState<{
    url: string;
    link_id: string;
    merchant_transaction_id: string;
    expires_at: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Payment Link</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate a secure, single-use checkout link for your customer.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 lg:col-span-7">
          {!generatedLink ? (
            <LinkCreateForm onSuccess={setGeneratedLink} />
          ) : (
            <div className="rounded-2xl border border-emerald-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Link Generated Successfully!</h2>
                  <p className="text-sm text-slate-500">Ready to share with your customer.</p>
                </div>
              </div>
              
              <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 text-slate-500 font-medium">Link ID</div>
                  <div className="col-span-2 text-slate-900 font-mono text-xs">{generatedLink.link_id}</div>
                  
                  <div className="col-span-1 text-slate-500 font-medium">Txn ID</div>
                  <div className="col-span-2 text-slate-900 font-mono text-xs break-all">{generatedLink.merchant_transaction_id}</div>
                  
                  <div className="col-span-1 text-slate-500 font-medium">Expires</div>
                  <div className="col-span-2 text-slate-900">{new Date(generatedLink.expires_at).toLocaleString()}</div>
                </div>
              </div>

              {/* QR Code — enlarged, no label */}
              <div className="mb-6 flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(generatedLink.url)}`}
                    alt="QR Code for Payment Link"
                    className="w-[240px] h-[240px] object-contain"
                  />
                  <p className="text-center text-[11px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
                    Scan to Pay
                  </p>
                </div>
              </div>

              {/* Payment URL — truncated, copy button below */}
              <div className="mb-8">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Payment URL
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700 truncate select-all" title={generatedLink.url}>
                    {generatedLink.url}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
                >
                  {copied ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Payment URL
                    </span>
                  )}
                </button>
              </div>

              <button 
                onClick={() => setGeneratedLink(null)}
                className="text-sm font-semibold text-[#0052FF] hover:text-[#0045d8] transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Create Another Link
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:block md:col-span-4 lg:col-span-5">
          {/* Helpful placeholder card on the right for balance in the layout */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sticky top-24">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Tips</h3>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-2">
                <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Links are single-use. Once paid, they cannot be paid again.
              </li>
              <li className="flex gap-2">
                <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Do not share the link on public forums. Treat it like an invoice.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
