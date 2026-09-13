/**
 * (auth)/login/page.tsx — Payee login page.
 * Form: client_id, c-secret, merchant_account_id, service_code.
 * Posts to POST /api/auth/login.
 * TODO (Phase 3 — task 3.4): implement full login form + error handling.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Merchant Login
        </h1>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="merchant_account_id">
              Merchant Account ID
            </label>
            <input
              id="merchant_account_id"
              name="merchant_account_id"
              type="text"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="service_code">
              Service Code
            </label>
            <input
              id="service_code"
              name="service_code"
              type="text"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="client_id">
              Client ID
            </label>
            <input
              id="client_id"
              name="client_id"
              type="text"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="c-secret">
              Client Secret
            </label>
            <input
              id="c-secret"
              name="c-secret"
              type="password"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
