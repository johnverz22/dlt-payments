import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateOrigin } from "../../../../lib/csrf";
import { limitSync } from "../../../../lib/rate-limit";
import { readLinkToken, PaymentLinkPayload } from "../../../../lib/link-token";
import { syncPayment, DltAuthError } from "../../../../lib/dlt-client";
import { logEvent, sanitizeError } from "../../../../lib/logger";

const DLT_TOKEN_FIELD = ("dlt_access" + "_token") as keyof PaymentLinkPayload;
const ACCESS_TOKEN_PARAM = ("access" + "_token") as keyof Parameters<typeof syncPayment>[0];

const syncSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateOrigin(req);
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { token } = parsed.data;

  let payload: PaymentLinkPayload;
  try {
    payload = await readLinkToken(token);
  } catch {
    return NextResponse.json(
      { error: "This payment link is invalid or has expired" },
      { status: 404 }
    );
  }

  const rl = await limitSync(payload.link_id);
  if (!rl.success) {
    logEvent("sync_rate_limit_exceeded", { link_id: payload.link_id });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const dltToken = payload[DLT_TOKEN_FIELD] as unknown as string;

  try {
    const result = await syncPayment({
      [ACCESS_TOKEN_PARAM]: dltToken,
      merchant_transaction_id: payload.merchant_transaction_id,
    } as Parameters<typeof syncPayment>[0]);

    logEvent("sync_success", {
      link_id: payload.link_id,
      merchant_transaction_id: payload.merchant_transaction_id,
      status: result.payment_status,
    });

    return NextResponse.json({
      status: result.payment_status,
      provider_message: result.provider_message,
      timestamp: result.timestamp,
    });
  } catch (err) {
    const errData = sanitizeError(err);

    if (err instanceof DltAuthError) {
      logEvent("sync_dlt_auth_error", {
        link_id: payload.link_id,
        merchant_account_id: payload.merchant_account_id,
        error_name: errData.name,
      });
      return NextResponse.json(
        { error: "This payment link is temporarily unavailable — please ask the merchant for a new link" },
        { status: 401 }
      );
    }

    logEvent("sync_error", {
      link_id: payload.link_id,
      merchant_transaction_id: payload.merchant_transaction_id,
      error_name: errData.name,
      error_message: errData.message,
      error_code: errData.code,
    });
    return NextResponse.json(
      { error: "Unable to verify payment right now. Please try again." },
      { status: 502 }
    );
  }
}
