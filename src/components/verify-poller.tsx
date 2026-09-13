"use client";

import { useState, useEffect, useCallback } from "react";

type PollStatus = "PENDING" | "PAID" | "REJECTED";

interface SyncResponse {
  status: string;
  provider_message?: string;
  timestamp?: string;
}

const MAX_ATTEMPTS = 6;
const BASE_DELAYS = [0, 1000, 2000, 4000, 8000, 16000];
const HARD_CEILING_MS = 60_000;

interface VerifyPollerProps {
  token: string;
  statusHint?: string;
}

export function VerifyPoller({ token, statusHint }: VerifyPollerProps) {
  const [status, setStatus] = useState<PollStatus | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | undefined>();
  const [exhausted, setExhausted] = useState(false);
  const [manualRetrying, setManualRetrying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const callSync = useCallback(async (): Promise<SyncResponse | null> => {
    try {
      const res = await fetch("/api/payment/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return null;
      return (await res.json()) as SyncResponse;
    } catch {
      return null;
    }
  }, [token]);

  const handleResult = useCallback((data: SyncResponse): boolean => {
    const s = data.status as PollStatus;
    if (s === "PAID" || s === "REJECTED") {
      setStatus(s);
      setProviderMessage(data.provider_message);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = { cancelled: false };

    async function start() {
      const startTime = Date.now();

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (controller.cancelled || !mounted) return;

        const elapsed = Date.now() - startTime;
        if (elapsed >= HARD_CEILING_MS) {
          if (mounted) setExhausted(true);
          return;
        }

        if (mounted) setAttemptCount(i + 1);
        const data = await callSync();
        if (controller.cancelled || !mounted) return;

        if (data) {
          const s = data.status as PollStatus;
          if (s === "PAID" || s === "REJECTED") {
            if (mounted) {
              setStatus(s);
              setProviderMessage(data.provider_message);
            }
            return;
          }
        }

        if (i < MAX_ATTEMPTS - 1) {
          const baseDelay = BASE_DELAYS[i + 1] ?? 16000;
          const remaining = HARD_CEILING_MS - (Date.now() - startTime);
          // Floor at 1ms so the setTimeout always registers with fake timers;
          // full jitter: uniformly random in [1, baseDelay].
          const jittered = Math.max(1, Math.floor(Math.random() * baseDelay));
          const delay = Math.min(jittered, remaining);
          if (delay <= 0) {
            if (mounted) setExhausted(true);
            return;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      if (!controller.cancelled && mounted) {
        setExhausted(true);
      }
    }

    start();

    return () => {
      mounted = false;
      controller.cancelled = true;
    };
  }, [callSync]);

  const handleManualRetry = useCallback(async () => {
    if (manualRetrying) return;
    setManualRetrying(true);
    const data = await callSync();
    setManualRetrying(false);
    if (data) handleResult(data);
  }, [callSync, handleResult, manualRetrying]);

  if (status === "PAID") {
    return (
      <div className="py-4">
        {/* Success icon with glow ring */}
        <div className="mb-6 flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-emerald-100 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="mb-1.5 text-2xl font-bold text-slate-900 tracking-tight">
          Payment Successful
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Your payment has been confirmed. Thank you!
        </p>

        {providerMessage && (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">{providerMessage}</p>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            You may now close this window safely.
          </p>
        </div>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="py-4">
        {/* Rejected icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-red-50" />
            <div className="relative w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shadow-lg shadow-red-500/10">
              <svg
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="mb-1.5 text-2xl font-bold text-slate-900 tracking-tight">
          Payment Rejected
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Your payment could not be processed. Please contact the merchant for assistance.
        </p>

        {providerMessage && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{providerMessage}</p>
          </div>
        )}
      </div>
    );
  }

  if (exhausted) {
    return (
      <div className="py-4">
        {/* Delayed / clock icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-amber-50 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <svg
                className="h-8 w-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="mb-1.5 text-2xl font-bold text-slate-900 tracking-tight">
          Verification Delayed
        </h1>
        <p className="mb-6 text-sm text-slate-500 leading-relaxed">
          We couldn&apos;t confirm your payment yet. This doesn&apos;t mean it
          failed — it may still be processing on the network.
        </p>

        <button
          onClick={handleManualRetry}
          disabled={manualRetrying}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] hover:bg-[#0045d8] active:scale-[0.99] text-white font-semibold text-sm px-6 py-3 transition duration-150 shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {manualRetrying ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Checking…
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Check Again
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-slate-400">
          If your payment was deducted but not confirmed, please contact support.
        </p>
      </div>
    );
  }

  const initialCopy =
    statusHint === "failure"
      ? "Confirming payment status…"
      : "Verifying your payment…";

  return (
    <div className="py-4">
      {/* Animated spinner */}
      <div className="mb-6 flex justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#0052FF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#0052FF] opacity-40 animate-pulse" />
          </div>
        </div>
      </div>

      <h1 className="mb-1.5 text-xl font-bold text-slate-900 tracking-tight">
        {initialCopy}
      </h1>
      <p className="text-sm text-slate-500">
        Please wait while we confirm with the payment network.
      </p>

      {/* Progress dots */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < attemptCount
                ? "w-4 bg-[#0052FF]"
                : i === attemptCount
                ? "w-3 bg-[#0052FF] opacity-50"
                : "w-1.5 bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Check {attemptCount} of {MAX_ATTEMPTS}
      </p>
    </div>
  );
}
