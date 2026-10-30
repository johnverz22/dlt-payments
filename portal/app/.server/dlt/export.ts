/**
 * Server-side export helpers shared by the CSV and PDF resource routes.
 *
 * fetchAllTransactionPages — paginates through the API collecting all rows up to
 * a hard cap, honouring 429 Retry-After with a single retry per page.
 *
 * csvRow / csvHeader — RFC 4180 formatting with BOM + CRLF.
 */

import { listTransactions } from './collections';
import type { Transaction, TransactionFiltersApi } from './collections';

// ─── Constants ──────────────────────────────────────────────────────────────

export const CSV_ROW_CAP = 50_000;
export const PDF_ROW_CAP = 5_000;
const PER_PAGE = 100;

// ─── Pagination ──────────────────────────────────────────────────────────────

export type FetchAllResult =
  | {
      ok: true;
      rows: Transaction[];
      capped: boolean;
      totalFetched: number;
      /** Real total from the API meta (may be larger than rows.length when capped). */
      metaTotal: number;
      /** ISO string of the oldest transaction in rows (first page last item or last page), may be null. */
      oldestDate: string | null;
      /** ISO string of the newest transaction in rows (first item of first page), may be null. */
      newestDate: string | null;
    }
  | { ok: false; status: number; message: string };

/**
 * Fetches all pages of transactions matching `filters` up to `cap` rows.
 * Sequential requests with a single 429-retry per page.
 * Returns metaTotal (real API total), oldestDate and newestDate from the collected rows.
 */
export async function fetchAllTransactionPages(
  pat: string,
  filters: Omit<TransactionFiltersApi, 'page' | 'per_page'>,
  cap: number,
): Promise<FetchAllResult> {
  const rows: Transaction[] = [];
  let page = 1;
  let lastPage = 1;
  let metaTotal = 0;

  do {
    const result = await listTransactions(pat, {
      ...filters,
      page,
      per_page: PER_PAGE,
    });

    if (!result.ok) {
      // Single retry on 429: honour Retry-After then try once more
      if (result.error.status === 429) {
        const delay = (result.error.retryAfterSeconds ?? 5) * 1000;
        await new Promise((r) => setTimeout(r, delay));

        const retry = await listTransactions(pat, {
          ...filters,
          page,
          per_page: PER_PAGE,
        });

        if (!retry.ok) {
          return {
            ok: false,
            status: retry.error.status,
            message: retry.error.message,
          };
        }

        lastPage = retry.data.meta.last_page;
        metaTotal = retry.data.meta.total;
        rows.push(...retry.data.data);
      } else {
        return {
          ok: false,
          status: result.error.status,
          message: result.error.message,
        };
      }
    } else {
      lastPage = result.data.meta.last_page;
      metaTotal = result.data.meta.total;
      rows.push(...result.data.data);
    }

    if (rows.length >= cap) {
      const capped = rows.slice(0, cap);
      return {
        ok: true,
        rows: capped,
        capped: true,
        totalFetched: rows.length,
        metaTotal,
        newestDate: capped[0]?.created_at ?? null,
        oldestDate: capped[capped.length - 1]?.created_at ?? null,
      };
    }

    page++;
  } while (page <= lastPage);

  return {
    ok: true,
    rows,
    capped: false,
    totalFetched: rows.length,
    metaTotal,
    newestDate: rows[0]?.created_at ?? null,
    oldestDate: rows[rows.length - 1]?.created_at ?? null,
  };
}

// ─── CSV formatting ───────────────────────────────────────────────────────────

const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/;

/**
 * Escape a text field per RFC 4180.
 * Applies formula-injection guard on text fields (merchant_transaction_id, payment_brand).
 */
export function csvTextField(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Formula injection guard — prefix with single quote (visible in raw CSV only;
  // most spreadsheets display the value without it unless the cell is text-formatted).
  const guarded = FORMULA_INJECTION_RE.test(s) ? `'${s}` : s;
  // RFC 4180: quote if contains comma, double-quote, newline, or carriage return
  if (guarded.includes(',') || guarded.includes('"') || guarded.includes('\n') || guarded.includes('\r')) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Verbatim field — no formula guard (used for amounts, timestamps, booleans, ids). */
export function csvVerbatimField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const CSV_HEADER = 'id,merchant_transaction_id,amount,currency,status,payment_brand,created_at,updated_at,history_available';
export const BOM = '\uFEFF';

/** Format a single transaction row as a CSV line (no trailing CRLF). */
export function transactionToCsvRow(tx: Transaction): string {
  return [
    csvVerbatimField(tx.id),
    csvTextField(tx.merchant_transaction_id),
    csvVerbatimField(tx.amount),           // null → ''
    csvVerbatimField(tx.currency),
    csvVerbatimField(tx.status),
    csvTextField(tx.payment_brand),        // formula-guard
    csvVerbatimField(tx.created_at),
    csvVerbatimField(tx.updated_at),
    csvVerbatimField(tx.history_available),
  ].join(',');
}
