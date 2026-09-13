/**
 * pay/[token]/page.tsx — Payor checkout page.
 * Decrypts JWE token server-side; renders billing form on success.
 * On expiry/failure: renders generic invalid-link view (no leakage of why).
 * NOTE: No /sync call here — the transaction doesn't exist until /submit.
 * TODO (Phase 5 — task 5.2): implement.
 */

interface PayPageProps {
  params: Promise<{ token: string }>;
}

export default async function PayPage({ params }: PayPageProps) {
  const { token: _token } = await params;

  // TODO (Phase 5 task 5.2):
  // 1. Decrypt token server-side via readLinkToken()
  // 2. Check expiry via isTokenExpired()
  // 3. On failure/expiry: render 404/"invalid link" view
  // 4. On success: render checkout form (brand picker + billing form)

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          Payment
        </h1>
        <p className="text-sm text-slate-500">
          TODO (Phase 5 task 5.2): payor checkout form.
        </p>
      </div>
    </main>
  );
}
