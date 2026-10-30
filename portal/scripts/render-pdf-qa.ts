/**
 * QA render script: generate both PDF reports to PNG for visual inspection.
 * Run from project root: npx tsx scripts/render-pdf-qa.ts
 *
 * Generates PDFs for several fixture scenarios, then converts each to PNG
 * using pdftoppm (poppler) if available, otherwise just saves the PDFs.
 */

import { DateTime } from 'luxon';
import {
  generateTransactionListPdf,
  generateTransactionDetailPdf,
} from '../app/.server/dlt/pdf.js';
import type { Transaction, HistoryList } from '../app/.server/dlt/collections.js';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUT_DIR = path.join(process.cwd(), 'qa-output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const USER = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@merchant.example.com',
  merchantName: 'Acme Merchant Corp',
};

const EMPTY_FILTERS = {};

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1001,
    merchant_transaction_id: 'ORDER-202610010001',
    amount: '1500.00',
    currency: 'PHP',
    status: 'PAID',
    payment_brand: 'visa',
    payment_method: null,
    created_at: '2026-10-02T08:05:03+08:00',
    updated_at: '2026-10-02T08:06:00+08:00',
    history_available: true,
    ...overrides,
  };
}

// ── Fixture sets ──────────────────────────────────────────────────────────────

/** Scenario: 0 rows */
const ROWS_EMPTY: Transaction[] = [];

/** Scenario: 1 row */
const ROWS_ONE: Transaction[] = [tx()];

/** Scenario: Multiple currencies (PHP + USD) */
const ROWS_MULTI_CURRENCY: Transaction[] = [
  tx({ id: 1, amount: '22540.10', currency: 'PHP', status: 'PAID', payment_brand: 'gcash' }),
  tx({ id: 2, amount: '1250.00', currency: 'PHP', status: 'PENDING', payment_brand: 'mastercard' }),
  tx({ id: 3, amount: '320.75', currency: 'PHP', status: 'REJECTED', payment_brand: 'visa' }),
  tx({ id: 4, amount: '500.00', currency: 'USD', status: 'PAID', payment_brand: 'qr ph' }),
  tx({ id: 5, amount: null, currency: 'PHP', status: 'PAID', payment_brand: null,
    merchant_transaction_id: 'VERY-LONG-REFERENCE-ORDER-2026100500012345678-EXTRA' }),
];

/** Scenario: ~20 rows spanning content, including large amounts */
const ROWS_MEDIUM: Transaction[] = Array.from({ length: 20 }, (_, i) =>
  tx({
    id: 2000 + i,
    merchant_transaction_id: `ORDER-202610${String(i + 1).padStart(2, '0')}-${String(i * 1234567).padStart(8, '0')}`,
    amount: i % 5 === 0 ? '1000000.00' : `${(i + 1) * 1234}.${String((i * 13) % 100).padStart(2, '0')}`,
    currency: i % 3 === 0 ? 'USD' : 'PHP',
    status: (['PAID', 'PENDING', 'REJECTED'] as const)[i % 3]!,
    payment_brand: (['visa', 'gcash', 'mastercard', 'qr ph', null] as (string | null)[])[i % 5] ?? null,
    created_at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T08:05:03+08:00`,
  }),
);

// ── Detail fixtures ───────────────────────────────────────────────────────────

const TX_SIMPLE = tx({ history_available: false });

const TX_WITH_HISTORY = tx({ id: 9999 });
const HISTORY_ALL_EVENTS: HistoryList = {
  data: [
    {
      id: 'hist-001',
      transaction_id: 9999,
      event_type: 'merchant_request',
      direction: 'merchant_to_dlt',
      captured_at: '2026-10-02T08:05:00+08:00',
      capture_format: 'snapshot',
      capture_status: 'available',
      event_id: null,
      attempt_number: 1,
      http_status: null,
      delivery: null,
      response: null,
      payload: {
        merchant_transaction_id: 'ORDER-001',
        amount: '28.33',
        currency: 'PHP',
        payment_brand: 'gcash',
      },
      omissions: [
        { field_path: 'headers.authorization', reason_code: 'sensitive_header' },
      ],
      retain_until: '2027-10-02T08:05:00+08:00',
      purged_at: null,
    },
    {
      id: 'hist-002',
      transaction_id: 9999,
      event_type: 'dlt_response',
      direction: 'dlt_to_merchant',
      captured_at: '2026-10-02T08:05:01+08:00',
      capture_format: 'sanitized_snapshot',
      capture_status: 'available',
      event_id: null,
      attempt_number: null,
      http_status: 200,
      delivery: null,
      response: {
        is_repeated_request: false,
        capture_stage: 'prepared_for_return',
        body_capture_status: 'captured_sanitized',
      },
      payload: {
        success: true,
        data: { payment_status: 'PENDING', amount: '28.33' },
      },
      omissions: [
        { field_path: 'data.payment_url', reason_code: 'payment_url_excluded' },
      ],
      retain_until: '2027-10-02T08:05:01+08:00',
      purged_at: null,
    },
    {
      id: 'hist-003',
      transaction_id: 9999,
      event_type: 'merchant_webhook_request',
      direction: 'dlt_to_merchant',
      captured_at: '2026-10-02T08:05:05+08:00',
      capture_format: 'snapshot',
      capture_status: 'purged',
      event_id: 'evt-abc123',
      attempt_number: 1,
      http_status: null,
      delivery: { state: 'delivered', duration_ms: 142 },
      response: null,
      payload: null,
      omissions: [],
      retain_until: null,
      purged_at: '2026-11-02T08:05:05+08:00',
    },
    {
      id: 'hist-004',
      transaction_id: 9999,
      event_type: 'merchant_webhook_response',
      direction: 'merchant_to_dlt',
      captured_at: '2026-10-02T08:05:06+08:00',
      capture_format: 'snapshot',
      capture_status: 'omitted',
      event_id: 'evt-abc123',
      attempt_number: 1,
      http_status: 200,
      delivery: { state: 'sent', duration_ms: null },
      response: null,
      payload: null,
      omissions: [
        { field_path: 'body', reason_code: 'oversize' },
      ],
      retain_until: '2027-10-02T08:05:06+08:00',
      purged_at: null,
    },
  ],
  meta: {
    current_page: 1,
    per_page: 100,
    total: 4,
    last_page: 1,
    coverage: {
      merchant_request: 'captured',
      dlt_response: 'captured',
      merchant_webhook_request: 'purged',
      merchant_webhook_response: 'not_captured',
    },
  },
};

// ── Rendering helper ──────────────────────────────────────────────────────────

async function savePdf(name: string, buf: Buffer) {
  const pdfPath = path.join(OUT_DIR, `${name}.pdf`);
  fs.writeFileSync(pdfPath, buf);
  console.log(`  Saved ${pdfPath} (${(buf.length / 1024).toFixed(1)} KB)`);

  // Try to convert to PNG using pdftoppm (poppler)
  try {
    execSync(`pdftoppm -r 150 -png "${pdfPath}" "${path.join(OUT_DIR, name)}"`, { stdio: 'pipe' });
    console.log(`  → Converted to PNG(s) in ${OUT_DIR}`);
  } catch {
    // pdftoppm not installed — try ImageMagick convert
    try {
      execSync(
        `convert -density 150 "${pdfPath}" -quality 90 "${path.join(OUT_DIR, name + '.png')}"`,
        { stdio: 'pipe' },
      );
      console.log(`  → Converted with ImageMagick to ${OUT_DIR}/${name}.png`);
    } catch {
      console.log(`  → PDF saved; install pdftoppm or ImageMagick to auto-convert to PNG`);
    }
  }
}

// ── Run scenarios ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== DLT Portal PDF QA Render ===\n');

  // List report scenarios
  console.log('LIST REPORT SCENARIOS:');

  console.log('\n[1] Empty (0 rows)');
  await savePdf(
    'list-empty',
    await generateTransactionListPdf(ROWS_EMPTY, EMPTY_FILTERS, USER, false, 0, null, null),
  );

  console.log('\n[2] Single row');
  await savePdf(
    'list-one-row',
    await generateTransactionListPdf(ROWS_ONE, EMPTY_FILTERS, USER, false, 1, ROWS_ONE[0]?.created_at ?? null, ROWS_ONE[0]?.created_at ?? null),
  );

  console.log('\n[3] Multi-currency (PHP + USD), null amount, long reference');
  await savePdf(
    'list-multi-currency',
    await generateTransactionListPdf(
      ROWS_MULTI_CURRENCY,
      EMPTY_FILTERS,
      USER,
      false,
      ROWS_MULTI_CURRENCY.length,
      ROWS_MULTI_CURRENCY[ROWS_MULTI_CURRENCY.length - 1]?.created_at ?? null,
      ROWS_MULTI_CURRENCY[0]?.created_at ?? null,
    ),
  );

  console.log('\n[4] Medium set (20 rows, large amounts, capped)');
  await savePdf(
    'list-medium-capped',
    await generateTransactionListPdf(
      ROWS_MEDIUM,
      { status: 'PAID', currency: 'PHP' },
      USER,
      true,  // capped
      500,   // metaTotal > rows.length
      ROWS_MEDIUM[ROWS_MEDIUM.length - 1]?.created_at ?? null,
      ROWS_MEDIUM[0]?.created_at ?? null,
    ),
  );

  console.log('\n[5] With date filter');
  await savePdf(
    'list-with-date-filter',
    await generateTransactionListPdf(
      ROWS_ONE,
      { from: '2026-10-01T00:00:00+08:00', to: '2026-10-31T23:59:59+08:00' },
      USER,
      false,
      1,
      ROWS_ONE[0]?.created_at ?? null,
      ROWS_ONE[0]?.created_at ?? null,
    ),
  );

  // Detail report scenarios
  console.log('\nDETAIL REPORT SCENARIOS:');

  console.log('\n[6] Transaction with no history');
  await savePdf(
    'detail-no-history',
    await generateTransactionDetailPdf(TX_SIMPLE, null, USER),
  );

  console.log('\n[7] Transaction with all 4 event types (one purged, one omitted)');
  await savePdf(
    'detail-full-history',
    await generateTransactionDetailPdf(TX_WITH_HISTORY, HISTORY_ALL_EVENTS, USER),
  );

  console.log('\n[8] Transaction with null amount and REJECTED status');
  await savePdf(
    'detail-null-amount-rejected',
    await generateTransactionDetailPdf(
      tx({ amount: null, status: 'REJECTED', history_available: false }),
      null,
      USER,
    ),
  );

  console.log('\n[9] Transaction with amount ≥ 1,000,000');
  await savePdf(
    'detail-large-amount',
    await generateTransactionDetailPdf(
      tx({ amount: '1250000.50', currency: 'PHP', status: 'PAID', payment_brand: 'mastercard' }),
      { data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1,
        coverage: { merchant_request: 'not_captured', dlt_response: 'not_captured', merchant_webhook_request: 'not_captured', merchant_webhook_response: 'not_captured' } } },
      USER,
    ),
  );

  console.log('\n✅ Done. Check qa-output/ for PDFs (and PNGs if converter is available).\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
