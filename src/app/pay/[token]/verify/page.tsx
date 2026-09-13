/**
 * pay/[token]/verify/page.tsx — Polling landing page after DLT redirect.
 * DLT redirects here as: /pay/[token]/verify?status=success|failure
 * The ?status param is a NON-AUTHORITATIVE hint only — /sync is the source of truth.
 * Polling state machine: 1 immediate + 5 retries (6 total), backoff 1/2/4/8/16s
 * with full jitter, 60s hard ceiling. See spec §5.2.
 * TODO (Phase 6 — task 6.2): implement.
 */

interface VerifyPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function VerifyPage({
  params,
  searchParams,
}: VerifyPageProps) {
  const { token: _token } = await params;
  const { status: _statusHint } = await searchParams;

  // TODO (Phase 6 task 6.2):
  // 1. Render client component with polling state machine
  // 2. Status hint (success/failure) used only to pick initial spinner copy
  // 3. POST /api/payment/sync → authoritative status
  // 4. PAID/REJECTED → stop, render result
  // 5. Exhaustion → "Verification Delayed" + debounced manual retry

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          Verifying Payment…
        </h1>
        <p className="text-sm text-slate-500">
          TODO (Phase 6 task 6.2): polling state machine.
        </p>
      </div>
    </main>
  );
}
