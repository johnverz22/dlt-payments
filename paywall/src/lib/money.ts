/**
 * lib/money.ts — Money validation and display utilities.
 * amount is ALWAYS a decimal string (e.g. "1500.00").
 * NEVER use parseFloat/Number() on the canonical value anywhere in the pipeline.
 *
 * Implemented (Phase 0.3 scaffold — fully real, tested in Phase 1 task 1.8).
 */

const AMOUNT_REGEX = /^\d{1,10}\.\d{2}$/;
const MAX_CENTS = 50_000_000; // 500000.00 in cents

/**
 * Validates an amount string.
 * - Format: /^\d{1,10}\.\d{2}$/
 * - Range: 0 < amount <= 500000.00 (integer-cents comparison, no parseFloat)
 */
export function isValidAmount(amount: string): boolean {
  if (!AMOUNT_REGEX.test(amount)) return false;

  // Integer-cents comparison — never parseFloat
  const dotIndex = amount.indexOf(".");
  const wholePart = amount.slice(0, dotIndex);
  const centPart = amount.slice(dotIndex + 1);
  const cents = parseInt(wholePart, 10) * 100 + parseInt(centPart, 10);

  return cents > 0 && cents <= MAX_CENTS;
}

/**
 * Format an amount for display only (thousands separator, currency symbol).
 * ONLY for rendering — never use this value as the canonical amount.
 */
export function formatDisplayAmount(amount: string): string {
  const num = Number(amount); // safe here: display only
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Compute VAT breakdown from a gross amount using integer-cents arithmetic.
 * The amount is assumed to be VAT-inclusive (the standard PH practice where
 * the displayed price already includes VAT). Returns base and vat in cents.
 *
 * @param amount  Validated decimal string, e.g. "1500.00"
 * @param rateBps VAT rate in basis points (e.g. 1200 = 12.00%). Default 1200.
 * @returns       { baseCents, vatCents, totalCents } — all integers.
 *
 * Formula (VAT-inclusive):
 *   totalCents = parsed integer cents from amount
 *   vatCents   = round( totalCents * rate / (10000 + rate) )
 *   baseCents  = totalCents - vatCents
 */
export function computeVat(
  amount: string,
  rateBps: number = 1200
): { baseCents: number; vatCents: number; totalCents: number } {
  const dotIndex = amount.indexOf(".");
  const wholePart = amount.slice(0, dotIndex);
  const centPart = amount.slice(dotIndex + 1);
  const totalCents = parseInt(wholePart, 10) * 100 + parseInt(centPart, 10);

  // VAT-inclusive formula: vat = total * rate / (10000 + rate)
  const vatCents = Math.round((totalCents * rateBps) / (10000 + rateBps));
  const baseCents = totalCents - vatCents;

  return { baseCents, vatCents, totalCents };
}

/**
 * Format integer cents as a display currency string (en-PH).
 * ONLY for rendering.
 */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
