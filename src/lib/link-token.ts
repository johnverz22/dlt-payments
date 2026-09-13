/**
 * lib/link-token.ts — Payment link token codec.
 * Uses LINK_APP_SECRET_CURRENT/PREVIOUS via lib/crypto.ts.
 * PaymentLinkPayload carries merchant credentials (§1.1 of DESIGN.md).
 * dlt_access_token is NEVER logged, NEVER sent to clients.
 *
 * TODO (Phase 1 — task 1.3): implement createLinkToken / readLinkToken
 */

import { encryptJWE, decryptJWE } from "./crypto";
import { env } from "./env";
import { isTokenExpired } from "./expiry";

export interface PaymentLinkPayload {
  link_id: string;
  /** Generated once at link creation. ASCII [A-Za-z0-9_-], max 45. Immutable. */
  merchant_transaction_id: string;
  /** Decimal string, e.g. "1500.00". 0 < amount <= 500000.00 */
  amount: string;
  currency: "PHP";

  // Embedded credentials — required so anonymous payor requests can call DLT
  merchant_account_id: string;
  service_code: string;
  /** NEVER log, NEVER send to client. Copied from payee session at creation. */
  dlt_access_token: string;

  /** Max 60 chars (app-level cap; DLT allows 80) */
  product_name?: string;
  /** Max 120 chars. Treat as required — DLT 500s without it in practice. */
  product_description?: string;
  /** Max 40 chars */
  product_reference_id?: string;

  labels?: {
    product_name?: string;
    product_description?: string;
    product_reference_id?: string;
  };

  /** Unix timestamp (ms) */
  created_at: number;
  /** Unix timestamp (ms), exclusive — current_time >= expires_at ⇒ expired */
  expires_at?: number;
}

export async function createLinkToken(
  payload: PaymentLinkPayload
): Promise<string> {
  return await encryptJWE(
    payload as unknown as Record<string, unknown>,
    env.LINK_APP_SECRET_CURRENT,
    "CURRENT"
  );
}

export async function readLinkToken(
  token: string
): Promise<PaymentLinkPayload> {
  const secrets = {
    current: env.LINK_APP_SECRET_CURRENT,
    previous: env.LINK_APP_SECRET_PREVIOUS,
  };
  const { payload } = await decryptJWE(token, secrets);
  
  if (isTokenExpired(payload as { expires_at?: number })) {
    throw new Error("Link token expired");
  }

  return payload as unknown as PaymentLinkPayload;
}
