import Decimal from 'decimal.js';

/**
 * Format a decimal string as currency for display.
 * Uses Intl.NumberFormat — converts to Number only at the display layer.
 */
export function formatMoney(amount: string | null, currency: string, locale = 'en-PH'): string {
  if (amount === null) return '—';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Safe decimal arithmetic. Use for derived calculations only
 * (e.g., average ticket size). Never for financial state.
 */
export function divideDecimal(a: string, b: string): string {
  if (b === '0' || b === '0.00') return '0.00';
  return new Decimal(a).dividedBy(new Decimal(b)).toFixed(2);
}

/**
 * Format a percentage (decimal string from 0-100).
 */
export function formatPercent(value: string | null): string {
  if (value === null) return 'No transactions';
  return `${Number(value).toFixed(2)}%`;
}
