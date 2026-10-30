import type { Metadata } from "next";
import { VerifyPoller } from "../../../../components/verify-poller";

export const metadata: Metadata = {
  title: "Verifying Payment",
};

interface VerifyPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function VerifyPage({
  params,
  searchParams,
}: VerifyPageProps) {
  const { token } = await params;
  const { status: statusHint } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white px-8 pb-10 pt-8 shadow-xl shadow-slate-200/50 text-center">
        <VerifyPoller token={token} statusHint={statusHint} />
      </div>
    </main>
  );
}
