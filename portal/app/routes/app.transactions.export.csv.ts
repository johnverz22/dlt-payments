/**
 * Resource route: GET /transactions/export.csv
 *
 * Exports ALL transactions matching the current filters as a UTF-8 BOM CSV.
 * Re-fetches from the DLT API using the session PAT — never trusts client data.
 *
 * Features:
 *  - RFC 4180 quoting, CRLF, BOM so Excel opens cleanly
 *  - Formula injection guard on text fields
 *  - Hard cap at CSV_ROW_CAP rows (configurable in export.ts)
 *  - Single 429 retry honouring Retry-After
 *  - Audit log line (no row data)
 */

import type { LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';
import { requireUser } from '~/.server/session';
import { parseTransactionFilters } from '~/lib/filters';
import { logger } from '~/.server/logger';
import {
  fetchAllTransactionPages,
  transactionToCsvRow,
  CSV_HEADER,
  BOM,
  CSV_ROW_CAP,
} from '~/.server/dlt/export';
import { DateTime } from 'luxon';

const REPORT_TZ = 'Asia/Singapore';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat, user } = await requireUser(request);
  const url = new URL(request.url);

  // Parse and validate filters (reuse the same logic as the list page).
  // page and per_page are intentionally ignored for exports.
  const rawFilters = parseTransactionFilters(url.searchParams);
  const filters = {
    from:                   rawFilters.from,
    to:                     rawFilters.to,
    status:                 rawFilters.status,
    merchant_transaction_id: rawFilters.merchant_transaction_id,
    currency:               rawFilters.currency,
    payment_brand:          rawFilters.payment_brand,
    query:                  (rawFilters as Record<string, unknown>).query as string | undefined,
  };

  // Fetch all pages
  const result = await fetchAllTransactionPages(pat, filters, CSV_ROW_CAP);

  if (!result.ok) {
    if (result.status === 401) {
      throw data({ message: 'Session expired. Please sign in again.' }, { status: 401 });
    }
    if (result.status === 403) {
      throw data({ message: 'You do not have permission to export transactions.' }, { status: 403 });
    }
    throw data({ message: result.message || 'Failed to fetch transactions.' }, { status: result.status || 500 });
  }

  const { rows, capped, totalFetched } = result;

  // Audit log — no row data, no PAT
  logger.info('csv_export', {
    userId:     user.id,
    merchantId: user.merchantId,
    filters:    JSON.stringify(filters),
    rowCount:   rows.length,
    capped,
  });

  // Build filename
  const slug  = slugify(user.merchantName) || 'merchant';
  const stamp = DateTime.now().setZone(REPORT_TZ).toFormat('yyyyMMdd-HHmm');
  const filename = `dlt-transactions_${slug}_${stamp}.csv`;

  // Stream the response: BOM + header + rows
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // BOM
      controller.enqueue(encoder.encode(BOM));
      // Header row
      controller.enqueue(encoder.encode(CSV_HEADER + '\r\n'));
      // Data rows
      for (const tx of rows) {
        controller.enqueue(encoder.encode(transactionToCsvRow(tx) + '\r\n'));
      }
      // Cap notice as a comment row (prefixed with #, ignored by most parsers)
      if (capped) {
        controller.enqueue(
          encoder.encode(
            `# Export limited to ${rows.length.toLocaleString()} rows (cap: ${CSV_ROW_CAP.toLocaleString()}). Total matched: ${totalFetched.toLocaleString()}. Narrow your filters.\r\n`,
          ),
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store, private',
    },
  });
}
