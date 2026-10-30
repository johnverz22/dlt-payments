/**
 * Resource route: GET /transactions/pdf
 *
 * Exports ALL transactions matching the current filters as a portrait A4 PDF.
 * Re-fetches all pages from the DLT API using the session PAT.
 * Hard cap: PDF_ROW_CAP rows (5 000 by default).
 */

import type { LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';
import { requireUser } from '~/.server/session';
import { parseTransactionFilters } from '~/lib/filters';
import { generateTransactionListPdf, makeFilename } from '~/.server/dlt/pdf';
import { fetchAllTransactionPages, PDF_ROW_CAP } from '~/.server/dlt/export';

export async function loader({ request }: LoaderFunctionArgs) {
  const { pat, user } = await requireUser(request);
  const url = new URL(request.url);
  const rawFilters = parseTransactionFilters(url.searchParams);

  const filters = {
    from:                    rawFilters.from,
    to:                      rawFilters.to,
    status:                  rawFilters.status,
    merchant_transaction_id: rawFilters.merchant_transaction_id,
    currency:                rawFilters.currency,
    payment_brand:           rawFilters.payment_brand,
    query:                   (rawFilters as Record<string, unknown>).query as string | undefined,
  };

  const result = await fetchAllTransactionPages(pat, filters, PDF_ROW_CAP);
  if (!result.ok) {
    const status = result.status === 401 ? 401 : result.status === 403 ? 403 : 500;
    throw data({ message: result.message }, { status });
  }

  const pdfBuffer = await generateTransactionListPdf(
    result.rows,
    filters,
    {
      firstName:    user.firstName,
      lastName:     user.lastName,
      email:        user.email,
      merchantName: user.merchantName,
    },
    result.capped,
    result.metaTotal,
    result.oldestDate,
    result.newestDate,
  );

  const filename = makeFilename(user.merchantName, 'dlt-transactions');

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store, private',
    },
  });
}
