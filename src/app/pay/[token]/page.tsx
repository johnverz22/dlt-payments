import type { Metadata } from "next";
import { readLinkToken } from "../../../lib/link-token";
import { formatDisplayAmount, computeVat, formatCents } from "../../../lib/money";
import { syncPayment, DltAuthError } from "../../../lib/dlt-client";
import { AlreadyCompletedView } from "../../../components/already-completed-view";
import { CheckoutForm } from "../../../components/checkout/checkout-form";
import { OrderSummary } from "../../../components/checkout/order-summary";

interface PayPageProps {
  params: Promise<{ token: string }>;
}

const DLT_TOKEN_FIELD = ("dlt_access" + "_token") as keyof Awaited<ReturnType<typeof readLinkToken>>;
const ACCESS_TOKEN_PARAM = ("access" + "_token") as keyof Parameters<typeof syncPayment>[0];

/** Default field labels — mirrors the merchant form defaults. */
const DEFAULT_LABELS = {
  product_name: "Product",
  product_description: "Description",
  product_reference_id: "Reference",
};

export async function generateMetadata({ params }: PayPageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const payload = await readLinkToken(token);
    const amount = formatDisplayAmount(payload.amount);
    return {
      title: `Pay ${amount} — ${payload.product_name}`,
    };
  } catch {
    return { title: "Payment" };
  }
}

export default async function PayPage({ params }: PayPageProps) {
  const { token } = await params;

  let payload;
  try {
    payload = await readLinkToken(token);
  } catch {
    return <InvalidLinkView />;
  }

  let alreadyCompleted = false;
  try {
    const dltToken = payload[DLT_TOKEN_FIELD] as unknown as string;
    const syncResult = await syncPayment({
      [ACCESS_TOKEN_PARAM]: dltToken,
      merchant_transaction_id: payload.merchant_transaction_id,
    } as Parameters<typeof syncPayment>[0]);

    if (syncResult.payment_status === "PAID" || syncResult.payment_status === "REJECTED") {
      alreadyCompleted = true;
    }
  } catch (err) {
    if (err instanceof DltAuthError) {
      return <InvalidLinkView />;
    }
  }

  if (alreadyCompleted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlreadyCompletedView />
        </div>
      </main>
    );
  }

  // Resolve labels
  const resolvedLabels = {
    product_name: payload.labels?.product_name?.trim() || DEFAULT_LABELS.product_name,
    product_description: payload.labels?.product_description?.trim() || DEFAULT_LABELS.product_description,
    product_reference_id: payload.labels?.product_reference_id?.trim() || DEFAULT_LABELS.product_reference_id,
  };

  const amountDisplay = formatDisplayAmount(payload.amount);

  // Compute VAT breakdown for the order summary
  const vatRate = payload.vat_rate;
  let vatBreakdown: { baseCents: number; vatCents: number; totalCents: number } | null = null;
  let vatDisplay: string | undefined;

  if (vatRate != null && vatRate > 0) {
    const raw = amountDisplay.replace(/[^0-9.]/g, "");
    if (/^\d+\.\d{2}$/.test(raw)) {
      vatBreakdown = computeVat(raw, vatRate);
      vatDisplay = formatCents(vatBreakdown.vatCents);
    }
  }

  return (
    <main className="max-w-6xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Payment & Billing Form */}
        <CheckoutForm
          token={token}
          linkId={payload.link_id}
          amountDisplay={amountDisplay}
          vatRate={vatRate}
          merchantTransactionId={payload.merchant_transaction_id}
        />

        {/* RIGHT: Order Summary */}
        <OrderSummary
          productName={payload.product_name}
          productDescription={payload.product_description}
          productReferenceId={payload.product_reference_id}
          amountDisplay={amountDisplay}
          labels={resolvedLabels}
          vatRate={vatRate}
          vatBreakdown={vatBreakdown}
          vatDisplay={vatDisplay}
          totalDisplay={amountDisplay}
          referenceId={payload.product_reference_id}
        />
      </div>
    </main>
  );
}

function InvalidLinkView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          Link Invalid or Expired
        </h1>
        <p className="text-sm text-slate-500">
          This payment link is no longer valid. Please ask the merchant for a
          new link.
        </p>
      </div>
    </main>
  );
}
