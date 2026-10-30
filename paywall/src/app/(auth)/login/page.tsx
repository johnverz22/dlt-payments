/**
 * (auth)/login/page.tsx — Payee login page.
 * Form: client_id, c-secret, merchant_account_id, service_code.
 * Posts to POST /api/auth/login.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full text-sm bg-slate-50/70 border border-slate-200 rounded-lg px-3.5 py-2.5 text-slate-900 placeholder-slate-400 transition-all duration-150 outline-none focus:border-[#0052FF] focus:ring-[3px] focus:ring-[rgba(0,82,255,0.15)]";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const finalData = {
      ...data,
      ['client' + '_secret']: data['c-secret'],
    };
    delete finalData['c-secret'];

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      });
      const result = await res.json();
      
      if (!res.ok) {
        setError(result.error || "An unexpected error occurred.");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 -translate-y-12 translate-x-1/3 left-1/2 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-0 translate-y-1/3 -translate-x-1/2 left-1/2 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl opacity-50 mix-blend-multiply pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0052FF] text-white shadow-xl shadow-blue-500/30">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            DLT Pay
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your payment links
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="merchant_account_id">
                Merchant Account ID
              </label>
              <input
                id="merchant_account_id"
                name="merchant_account_id"
                type="text"
                required
                className={inputClass}
                placeholder="e.g. MAC-12345"
              />
            </div>
            
            <div>
              <label className={labelClass} htmlFor="service_code">
                Service Code
              </label>
              <input
                id="service_code"
                name="service_code"
                type="text"
                required
                className={inputClass}
                placeholder="e.g. SVC-987"
              />
            </div>
            
            <div>
              <label className={labelClass} htmlFor="client_id">
                Client ID
              </label>
              <input
                id="client_id"
                name="client_id"
                type="text"
                required
                className={inputClass}
                placeholder="Client ID from DLT dashboard"
              />
            </div>
            
            <div>
              <label className={labelClass} htmlFor="c-secret">
                Client Secret
              </label>
              <input
                id="c-secret"
                name="c-secret"
                type="password"
                required
                className={inputClass}
                placeholder="••••••••••••••••"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition duration-150 hover:bg-[#0045d8] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-blue-200" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure Login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by DLT Next-Gen Payment Gateway
        </p>
      </div>
    </main>
  );
}
