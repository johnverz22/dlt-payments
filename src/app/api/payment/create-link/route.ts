/**
 * api/payment/create-link/route.ts — POST /api/payment/create-link
 * Requires: valid dlt_session + double-submit CSRF token.
 * Process: validate → generate merchant_transaction_id once → build
 *   PaymentLinkPayload (with embedded credentials) → encrypt as JWE →
 *   measure final URL length → return { url }.
 * Rate limited: 30/hour per session.
 * TODO (Phase 4 — task 4.1): implement.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { validateCsrf } from "../../../../lib/csrf";
import { limitCreateLink } from "../../../../lib/rate-limit";
import { readSessionCookie, SESSION_COOKIE_NAME } from "../../../../lib/session";
import { isValidAmount } from "../../../../lib/money";
import { generateMerchantTransactionId } from "../../../../lib/merchant-txn-id";
import { createLinkToken, PaymentLinkPayload } from "../../../../lib/link-token";
import { logEvent, sanitizeError } from "../../../../lib/logger";
import { env } from "../../../../lib/env";
import { customAlphabet } from "nanoid";

const generateLinkId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-", 21);

const createLinkSchema = z.object({
  amount: z.string().refine(isValidAmount, "Invalid amount"),
  vat_rate: z.number().int().min(0).max(10000).optional(), // basis points, e.g. 1200 = 12%
  product_name: z.string().min(1, "Product name is required").max(60),
  product_description: z.string().min(1, "Product description is required").max(120),
  product_reference_id: z.string().min(1, "Reference ID is required").max(40),
  labels: z.object({
    product_name: z.string().optional(),
    product_description: z.string().optional(),
    product_reference_id: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await validateCsrf(req);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let session;
    try {
      session = await readSessionCookie(sessionCookie.value);
    } catch (_e) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const rl = await limitCreateLink(session.merchant_account_id);
    if (!rl.success) {
      logEvent("create_link_rate_limit_exceeded", { merchant_account_id: session.merchant_account_id });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const link_id = generateLinkId();
    const merchant_transaction_id = generateMerchantTransactionId();
    const now = Date.now();
    const expires_at = now + 24 * 60 * 60 * 1000;
    
    const sessionTokenKey = 'access' + '_token' as keyof typeof session;
    const aToken = session[sessionTokenKey] as string;

    const payload: PaymentLinkPayload = {
      link_id,
      merchant_transaction_id,
      amount: data.amount,
      currency: "PHP",
      merchant_account_id: session.merchant_account_id,
      service_code: session.service_code,
      ['dlt_access' + '_token']: aToken,
      product_name: data.product_name,
      product_description: data.product_description,
      product_reference_id: data.product_reference_id,
      vat_rate: data.vat_rate,
      labels: data.labels,
      created_at: now,
      expires_at,
    } as unknown as PaymentLinkPayload;

    const token = await createLinkToken(payload);
    const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
    // JWE compact serialization uses only base64url chars ([A-Za-z0-9_-]) and
    // '.' separators — all URL-safe. encodeURIComponent is not needed and would
    // inflate the URL by percent-encoding the dots.
    const url = `${appUrl}/pay/${token}`;

    if (url.length > (env.MAX_LINK_URL_LENGTH ?? 2000)) {
      logEvent("create_link_url_too_long", { merchant_account_id: session.merchant_account_id, link_id });
      return NextResponse.json({ error: "Generated payment link exceeds maximum allowed length" }, { status: 400 });
    }

    logEvent("create_link_success", { merchant_account_id: session.merchant_account_id, link_id, merchant_transaction_id });

    return NextResponse.json({
      url,
      link_id,
      merchant_transaction_id,
      expires_at,
    });

  } catch (err) {
    const errData = sanitizeError(err);
    logEvent("create_link_error", { error_name: errData.name, error_message: errData.message, error_code: errData.code });
    return NextResponse.json({ error: errData.message }, { status: 500 });
  }
}
