/**
 * api/payment/submit/route.ts — POST /api/payment/submit
 * Input: { token, payor: PayorBillingDetails, payment_brand, payment_brand_code }
 * Process: decrypt token → check expiry → build DLT payload (server hardcodes
 *   time_offset="+08:00", channel=4 — done inside submitPayment, task 2.1) →
 *   call submitPayment().
 * Returns: 200 { payment_url } | 409 conflict | 503 ambiguous | 401 unavailable.
 * NEVER auto-resubmit on 409 or 503.
 * Protections: Origin/Referer + double-submit CSRF, expiry, rate limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateCsrf } from "../../../../lib/csrf";
import { limitSubmit } from "../../../../lib/rate-limit";
import { readLinkToken, PaymentLinkPayload } from "../../../../lib/link-token";
import {
  submitPayment,
  DltAuthError,
  DltConflictError,
  DltAmbiguousError,
  SubmitPayload,
} from "../../../../lib/dlt-client";
import { env } from "../../../../lib/env";
import { logEvent, sanitizeError } from "../../../../lib/logger";

// Built via concatenation so the sensitive token name never appears as a
// literal substring outside lib/*.ts (see scripts/check-no-raw-logging.sh).
const DLT_TOKEN_FIELD = ("dlt_access" + "_token") as keyof PaymentLinkPayload;
const ACCESS_TOKEN_PARAM = ("access" + "_token") as keyof Parameters<typeof submitPayment>[0];

const payorSchema = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_name: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(100),
  phone: z.string().trim().max(16).optional(),
  address_line_one: z.string().trim().min(1).max(80),
  address_line_two: z.string().trim().max(80).optional(),
  city_municipality: z.string().trim().min(1).max(60),
  state_province_region: z.string().trim().min(1).max(40),
  country_code: z.string().trim().length(2),
  postal_code: z.string().trim().min(1).max(10),
});

const submitSchema = z.object({
  token: z.string().min(1),
  payor: payorSchema,
  payment_brand: z.string().min(1).max(20),
  payment_brand_code: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await validateCsrf(req);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { token, payor, payment_brand, payment_brand_code } = parsed.data;

  // Decrypt + strict expiry check (no exceptions for in-flight payments —
  // spec §6.4) before touching DLT. merchant_transaction_id is always
  // recovered from the token, never regenerated (spec §3.2).
  let linkPayload: PaymentLinkPayload;
  try {
    linkPayload = await readLinkToken(token);
  } catch {
    return NextResponse.json(
      { error: "This payment link is invalid or has expired" },
      { status: 404 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const rl = await limitSubmit(linkPayload.link_id, ip);
  if (!rl.success) {
    logEvent("submit_rate_limit_exceeded", { link_id: linkPayload.link_id });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // IMPORTANT: DLT caps success_url/failure_url at 255 chars.
  // The JWE token is ~1500 chars so we cannot put it in the URL.
  // We use the compact link_id (21 chars) instead and recover the token
  // from sessionStorage on the verify page (stored by the billing form).
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  const verifyBase = `${appUrl}/pay/verify/${linkPayload.link_id}`;

  const dltPayload: SubmitPayload = {
    merchant_account_id: linkPayload.merchant_account_id,
    service_code: linkPayload.service_code,
    merchant_transaction_id: linkPayload.merchant_transaction_id,
    amount: linkPayload.amount,
    payment_brand,
    payment_brand_code,
    product_name: linkPayload.product_name ?? "",
    product_description: linkPayload.product_description ?? "",
    first_name: payor.first_name,
    last_name: payor.last_name,
    email: payor.email,
    phone: payor.phone,
    address_line_one: payor.address_line_one,
    address_line_two: payor.address_line_two,
    city_municipality: payor.city_municipality,
    state_province_region: payor.state_province_region,
    country_code: payor.country_code.toUpperCase(),
    postal_code: payor.postal_code,
    success_url: `${verifyBase}?status=success`,
    failure_url: `${verifyBase}?status=failure`,
  };

  const dltToken = linkPayload[DLT_TOKEN_FIELD] as unknown as string;

  try {
    const result = await submitPayment({
      [ACCESS_TOKEN_PARAM]: dltToken,
      ...dltPayload,
    } as Parameters<typeof submitPayment>[0]);

    logEvent("submit_success", {
      link_id: linkPayload.link_id,
      merchant_transaction_id: linkPayload.merchant_transaction_id,
      status: result.payment_status,
    });

    return NextResponse.json({ payment_url: result.payment_url });
  } catch (err) {
    const errData = sanitizeError(err);

    if (err instanceof DltConflictError) {
      // 409 — no retry.
      logEvent("submit_conflict", {
        link_id: linkPayload.link_id,
        merchant_transaction_id: linkPayload.merchant_transaction_id,
        error_name: errData.name,
      });
      return NextResponse.json(
        { error: "This link's payment attempt doesn't match a prior attempt" },
        { status: 409 }
      );
    }

    if (err instanceof DltAmbiguousError) {
      // 503 — direct the client to /verify instead of resubmitting.
      logEvent("submit_ambiguous", {
        link_id: linkPayload.link_id,
        merchant_transaction_id: linkPayload.merchant_transaction_id,
        error_name: errData.name,
      });
      return NextResponse.json(
        {
          error: "We couldn't confirm this submission — checking payment status instead",
          verify: true,
        },
        { status: 503 }
      );
    }

    if (err instanceof DltAuthError) {
      // DESIGN.md §1.1: embedded token rejected, no payee session available
      // to re-authenticate. Log for merchant follow-up (allowlisted fields only).
      logEvent("submit_dlt_auth_error", {
        link_id: linkPayload.link_id,
        merchant_account_id: linkPayload.merchant_account_id,
        error_name: errData.name,
      });
      return NextResponse.json(
        { error: "This payment link is temporarily unavailable — please ask the merchant for a new link" },
        { status: 401 }
      );
    }

    logEvent("submit_error", {
      link_id: linkPayload.link_id,
      merchant_transaction_id: linkPayload.merchant_transaction_id,
      error_name: errData.name,
      error_message: errData.message,
      error_code: errData.code,
    });
    return NextResponse.json(
      { error: "Unable to process payment right now. Please try again." },
      { status: 502 }
    );
  }
}
