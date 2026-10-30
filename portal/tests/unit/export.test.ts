/**
 * Unit tests for CSV and PDF export helpers.
 *
 * Tests cover:
 *   - RFC 4180 quoting (comma, quote, newline)
 *   - Formula injection guard
 *   - Null / undefined handling
 *   - transactionToCsvRow field order
 *   - computeSummary decimal arithmetic (no float drift)
 *   - describeFilters output
 *   - Row cap behaviour in fetchAllTransactionPages (mocked)
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import {
  csvTextField,
  csvVerbatimField,
  transactionToCsvRow,
  CSV_HEADER,
  BOM,
  CSV_ROW_CAP,
  PDF_ROW_CAP,
  fetchAllTransactionPages,
} from '../../app/.server/dlt/export';
import { computeSummary, describeFilters } from '../../app/.server/dlt/pdf';
import type { Transaction } from '../../app/.server/dlt/collections';
import Decimal from 'decimal.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 1001,
    merchant_transaction_id: 'ORDER-001',
    amount: '1500.00',
    currency: 'PHP',
    status: 'PAID',
    payment_brand: 'ExampleBrand',
    payment_method: null,
    created_at: '2026-10-01T08:00:00+08:00',
    updated_at: '2026-10-01T08:01:00+08:00',
    history_available: true,
    ...overrides,
  };
}

// ─── csvTextField ─────────────────────────────────────────────────────────────

describe('csvTextField', () => {
  it('returns empty string for null', () => {
    expect(csvTextField(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(csvTextField(undefined)).toBe('');
  });

  it('passes through a plain value unchanged', () => {
    expect(csvTextField('hello')).toBe('hello');
  });

  it('quotes a value containing a comma', () => {
    expect(csvTextField('a,b')).toBe('"a,b"');
  });

  it('quotes a value containing a double-quote and doubles it', () => {
    expect(csvTextField('say "hello"')).toBe('"say ""hello"""');
  });

  it('quotes a value containing a newline', () => {
    expect(csvTextField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('prefixes "=" with a single quote (formula injection guard)', () => {
    expect(csvTextField('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it('prefixes "+" with a single quote', () => {
    expect(csvTextField('+1234')).toBe("'+1234");
  });

  it('prefixes "-" with a single quote', () => {
    expect(csvTextField('-DROP TABLE')).toBe("'-DROP TABLE");
  });

  it('prefixes "@" with a single quote', () => {
    expect(csvTextField('@user')).toBe("'@user");
  });

  it('prefixes a tab character with a single quote', () => {
    expect(csvTextField('\tindented')).toBe("'\tindented");
  });

  it('prefixes a carriage return with a single quote (and quotes the result)', () => {
    // \r triggers injection guard → "'\rvalue" (with literal CR), then \r triggers RFC 4180 quoting
    const cr = '\r';
    expect(csvTextField(cr + 'value')).toBe(`"'${cr}value"`);
  });

  it('quotes the guarded value if it contains a comma after prefix', () => {
    // e.g. =a,b → guarded to '=a,b → needs quoting because of comma
    expect(csvTextField('=a,b')).toBe('"\'=a,b"');
  });
});

// ─── csvVerbatimField ─────────────────────────────────────────────────────────

describe('csvVerbatimField', () => {
  it('returns empty string for null', () => {
    expect(csvVerbatimField(null)).toBe('');
  });

  it('returns "true" for boolean true', () => {
    expect(csvVerbatimField(true)).toBe('true');
  });

  it('returns "false" for boolean false', () => {
    expect(csvVerbatimField(false)).toBe('false');
  });

  it('returns a number as string', () => {
    expect(csvVerbatimField(1500)).toBe('1500');
  });

  it('does NOT apply formula injection guard', () => {
    // Amounts starting with = should NOT be guarded — they are verbatim
    expect(csvVerbatimField('=1500.00')).toBe('=1500.00');
  });

  it('quotes if contains comma', () => {
    expect(csvVerbatimField('1,500.00')).toBe('"1,500.00"');
  });
});

// ─── transactionToCsvRow ──────────────────────────────────────────────────────

describe('transactionToCsvRow', () => {
  it('matches the CSV_HEADER column order', () => {
    // Header: id,merchant_transaction_id,amount,currency,status,payment_brand,created_at,updated_at,history_available
    const tx = makeTx();
    const row = transactionToCsvRow(tx);
    const parts = row.split(',');
    expect(parts[0]).toBe('1001');
    expect(parts[1]).toBe('ORDER-001');
    expect(parts[2]).toBe('1500.00');
    expect(parts[3]).toBe('PHP');
    expect(parts[4]).toBe('PAID');
    expect(parts[5]).toBe('ExampleBrand');
    expect(parts[6]).toBe('2026-10-01T08:00:00+08:00');
    expect(parts[7]).toBe('2026-10-01T08:01:00+08:00');
    expect(parts[8]).toBe('true');
  });

  it('outputs empty cells for null fields', () => {
    const tx = makeTx({ amount: null, currency: null, payment_brand: null, created_at: null, updated_at: null });
    const row = transactionToCsvRow(tx);
    const parts = row.split(',');
    expect(parts[2]).toBe('');   // amount
    expect(parts[3]).toBe('');   // currency
    expect(parts[5]).toBe('');   // payment_brand
    expect(parts[6]).toBe('');   // created_at
    expect(parts[7]).toBe('');   // updated_at
  });

  it('applies formula injection guard to merchant_transaction_id', () => {
    const tx = makeTx({ merchant_transaction_id: '=EVIL' });
    const row = transactionToCsvRow(tx);
    const parts = row.split(',');
    expect(parts[1]).toBe("'=EVIL");
  });

  it('applies formula injection guard to payment_brand', () => {
    const tx = makeTx({ payment_brand: '+Brand' });
    const row = transactionToCsvRow(tx);
    const parts = row.split(',');
    expect(parts[5]).toBe("'+Brand");
  });

  it('does NOT apply formula injection guard to amount', () => {
    // Amounts are numeric strings — no injection risk; guard must not break them
    const tx = makeTx({ amount: '1500.00' });
    const row = transactionToCsvRow(tx);
    const parts = row.split(',');
    expect(parts[2]).toBe('1500.00');
  });
});

// ─── CSV_HEADER and BOM ───────────────────────────────────────────────────────

describe('CSV constants', () => {
  it('CSV_HEADER has the correct field order', () => {
    expect(CSV_HEADER).toBe(
      'id,merchant_transaction_id,amount,currency,status,payment_brand,created_at,updated_at,history_available',
    );
  });

  it('BOM is the UTF-8 BOM character', () => {
    expect(BOM).toBe('\uFEFF');
  });
});

// ─── computeSummary ───────────────────────────────────────────────────────────

describe('computeSummary', () => {
  it('returns zero totals for empty rows', () => {
    const summary = computeSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.byStatus.PAID.count).toBe(0);
    expect(summary.byStatus.PAID.amount.toNumber()).toBe(0);
    expect(Object.keys(summary.byCurrencyStatus)).toHaveLength(0);
  });

  it('counts and sums correctly for a single row', () => {
    const summary = computeSummary([makeTx()]);
    expect(summary.total).toBe(1);
    expect(summary.byStatus.PAID.count).toBe(1);
    expect(summary.byStatus.PAID.amount.toFixed(2)).toBe('1500.00');
    expect(summary.byCurrencyStatus['PHP']?.count).toBe(1);
    expect(summary.byCurrencyStatus['PHP']?.PAID.amount.toFixed(2)).toBe('1500.00');
  });

  it('handles floating-point exact: 0.1 + 0.2 = 0.30 (not 0.30000000000000004)', () => {
    const rows = [
      makeTx({ amount: '0.10', currency: 'PHP', status: 'PAID' }),
      makeTx({ amount: '0.20', currency: 'PHP', status: 'PAID' }),
    ];
    const summary = computeSummary(rows);
    expect(summary.byStatus.PAID.amount.toFixed(2)).toBe('0.30');
    expect(summary.byCurrencyStatus['PHP']?.PAID.amount.toFixed(2)).toBe('0.30');
  });

  it('separates currencies correctly', () => {
    const rows = [
      makeTx({ amount: '100.00', currency: 'PHP', status: 'PAID' }),
      makeTx({ amount: '200.00', currency: 'USD', status: 'PAID' }),
      makeTx({ amount: '50.00',  currency: 'PHP', status: 'PENDING' }),
    ];
    const summary = computeSummary(rows);
    expect(summary.total).toBe(3);
    // PHP: PAID=100.00, PENDING=50.00
    const php = summary.byCurrencyStatus['PHP']!;
    expect(php.PAID.amount.toFixed(2)).toBe('100.00');
    expect(php.PENDING.amount.toFixed(2)).toBe('50.00');
    const usd = summary.byCurrencyStatus['USD']!;
    expect(usd.PAID.amount.toFixed(2)).toBe('200.00');
  });

  it('skips null amounts but still counts the transaction', () => {
    const rows = [
      makeTx({ amount: null, currency: 'PHP', status: 'PAID' }),
      makeTx({ amount: '300.00', currency: 'PHP', status: 'PAID' }),
    ];
    const summary = computeSummary(rows);
    expect(summary.byStatus.PAID.count).toBe(2);
    expect(summary.byStatus.PAID.amount.toFixed(2)).toBe('300.00');
  });

  it('handles large amounts without precision loss', () => {
    // 5000 rows × 9999.99 PHP
    const rows = Array.from({ length: 5000 }, () =>
      makeTx({ amount: '9999.99', currency: 'PHP', status: 'PAID' }),
    );
    const summary = computeSummary(rows);
    // Exact: 5000 × 9999.99 = 49999950.00
    expect(summary.byStatus.PAID.amount.toFixed(2)).toBe('49999950.00');
  });
});

// ─── describeFilters ──────────────────────────────────────────────────────────

describe('describeFilters', () => {
  it('returns "Date range: All dates" for empty filters (always includes date range)', () => {
    const pairs = describeFilters({});
    expect(pairs).toContainEqual(['Date range', 'All dates']);
    expect(pairs.find(([k]) => k === 'Date range')).toBeDefined();
  });

  it('includes date range when both from and to are set', () => {
    const pairs = describeFilters({
      from: '2026-10-01T00:00:00+08:00',
      to:   '2026-10-31T23:59:59+08:00',
    });
    expect(pairs.some(([k]) => k === 'Date range')).toBe(true);
  });

  it('includes status when set', () => {
    const pairs = describeFilters({ status: 'PAID' });
    expect(pairs).toContainEqual(['Status', 'PAID']);
  });

  it('includes all set filters', () => {
    const pairs = describeFilters({
      status:   'PENDING',
      currency: 'PHP',
      payment_brand: 'ExampleBrand',
      merchant_transaction_id: 'ORDER-001',
    });
    const keys = pairs.map(([k]) => k);
    expect(keys).toContain('Status');
    expect(keys).toContain('Currency');
    expect(keys).toContain('Payment brand');
    expect(keys).toContain('Merchant Tx ID');
  });
});

// ─── fetchAllTransactionPages — row cap ───────────────────────────────────────

// We test the cap logic by mocking listTransactions
vi.mock('../../app/.server/dlt/collections', () => ({
  listTransactions: vi.fn(),
}));

describe('fetchAllTransactionPages', () => {
  it('stops at the cap and marks capped=true', async () => {
    const { listTransactions } = await import('../../app/.server/dlt/collections');
    const mockListTransactions = listTransactions as Mock;

    // Each page returns 100 rows; total = 200 pages = 20 000 rows
    let page = 0;
    mockListTransactions.mockImplementation(async (_pat: string, filters: { page?: number }) => {
      page = filters.page ?? 1;
      return {
        ok: true,
        data: {
          data: Array.from({ length: 100 }, (_, i) =>
            makeTx({ id: (page - 1) * 100 + i + 1 }),
          ),
          meta: { current_page: page, per_page: 100, total: 20000, last_page: 200 },
        },
      };
    });

    const CAP = 250; // small test cap
    const result = await fetchAllTransactionPages('pat', {}, CAP);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows.length).toBe(CAP);
      expect(result.capped).toBe(true);
    }
  });

  it('returns all rows when under the cap', async () => {
    const { listTransactions } = await import('../../app/.server/dlt/collections');
    const mockListTransactions = listTransactions as Mock;

    mockListTransactions.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [makeTx({ id: 1 }), makeTx({ id: 2 })],
        meta: { current_page: 1, per_page: 100, total: 2, last_page: 1 },
      },
    });

    const result = await fetchAllTransactionPages('pat', {}, 5000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows.length).toBe(2);
      expect(result.capped).toBe(false);
    }
  });

  it('returns 0 rows for empty result set', async () => {
    const { listTransactions } = await import('../../app/.server/dlt/collections');
    const mockListTransactions = listTransactions as Mock;

    mockListTransactions.mockResolvedValueOnce({
      ok: true,
      data: {
        data: [],
        meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 },
      },
    });

    const result = await fetchAllTransactionPages('pat', {}, 5000);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows.length).toBe(0);
      expect(result.capped).toBe(false);
    }
  });

  it('propagates non-429 errors', async () => {
    const { listTransactions } = await import('../../app/.server/dlt/collections');
    const mockListTransactions = listTransactions as Mock;

    mockListTransactions.mockResolvedValueOnce({
      ok: false,
      error: { status: 500, message: 'Internal server error' },
    });

    const result = await fetchAllTransactionPages('pat', {}, 5000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
    }
  });
});
