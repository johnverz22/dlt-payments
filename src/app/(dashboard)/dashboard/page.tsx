/**
 * (dashboard)/dashboard/page.tsx — Link generator + label settings.
 * Tab 1: Create Payment Link form + generated link output card.
 * TODO (Phase 4 — task 4.3): implement.
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
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <a href="/transactions" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
            View Transactions →
          </a>
        </div>
        
        {!generatedLink ? (
          <LinkCreateForm onSuccess={setGeneratedLink} />
        ) : (
          <div className="rounded-lg border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-medium text-green-800">Link Generated Successfully!</h2>
            
            <div className="mb-6 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">Link ID:</span> {generatedLink.link_id}</p>
              <p><span className="font-medium text-slate-700">Transaction ID:</span> {generatedLink.merchant_transaction_id}</p>
              <p><span className="font-medium text-slate-700">Expires:</span> {new Date(generatedLink.expires_at).toLocaleString()}</p>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={generatedLink.url}
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
              />
              <button 
                onClick={handleCopy}
                className="whitespace-nowrap rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>

            <button 
              onClick={() => setGeneratedLink(null)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              ← Create Another Link
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
