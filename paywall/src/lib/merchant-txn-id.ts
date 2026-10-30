/**
 * lib/merchant-txn-id.ts — Merchant transaction ID generator.
 * Uses nanoid restricted to [A-Za-z0-9_-], length <= 45.
 * Generated exactly once at link creation — NEVER regenerated on retry/resubmit.
 *
 * Implemented (Phase 0.3 scaffold — fully real, tested in Phase 1 task 1.9).
 */

import { customAlphabet } from "nanoid";

/** nanoid with DLT-safe alphabet: ASCII [A-Za-z0-9_-], max 45 chars */
const nanoid = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",
  21 // well within the 45-char max; leaves headroom for future prefix if needed
);

/**
 * Generate a unique merchant transaction ID.
 * Matches DLT's constraint: ASCII [A-Za-z0-9_-], max 45 chars.
 * Call this exactly once per payment link. Do not call it again on resubmit.
 */
export function generateMerchantTransactionId(): string {
  return nanoid();
}
