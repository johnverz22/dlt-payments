"use client";

/**
 * /pay/verify/[link_id] — DLT redirect landing page.
 *
 * DLT bounces the payor back here after hosted checkout because the JWE token
 * is too long (~1500 chars) to embed in success_url/failure_url (DLT's 255-char
 * limit). We use the short link_id instead and recover the full token from
 * sessionStorage, where the billing form stored it just before the redirect.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { VerifyPoller } from "../../../../components/verify-poller";

export default function VerifyByLinkIdPage() {
  const params = useParams<{ link_id: string }>();
  const searchParams = useSearchParams();
  const statusHint = searchParams.get("status") ?? undefined;

  const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    const stored = sessionStorage.getItem(`pay_token:${params.link_id}`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(stored ?? null); // null = not found
  }, [params.link_id]);

  if (token === undefined) {
    // Still reading from sessionStorage — render nothing to avoid flash.
    return null;
  }

  if (token === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white px-8 pb-10 pt-8 text-center shadow-xl shadow-slate-200/50">
          <div className="mb-6 flex justify-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full bg-slate-100" />
              <div className="relative w-16 h-16 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center shadow-lg shadow-slate-500/10">
                <svg
                  className="h-8 w-8 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="mb-1.5 text-xl font-bold text-slate-900 tracking-tight">
            Session Not Found
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            We couldn&apos;t find your payment session. This can happen if you
            opened the verify page in a new tab. Please return to your original
            payment tab.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white px-8 pb-10 pt-8 text-center shadow-xl shadow-slate-200/50">
        <VerifyPoller token={token} statusHint={statusHint} />
      </div>
    </main>
  );
}
