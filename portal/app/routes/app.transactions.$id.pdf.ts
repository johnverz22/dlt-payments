/**
 * Resource route: GET /transactions/:id/pdf
 *
 * Exports a single transaction with its full exchange history as a portrait A4 PDF.
 * Always fetches history (page 1, per_page=100) regardless of history_available —
 * a false value may mean "all purged", not "never captured".
 */

import type { LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';
import { requireUser } from '~/.server/session';
import { getTransaction, listTransactionHistory, type HistoryItem } from '~/.server/dlt/collections';
import { generateTransactionDetailPdf, makeFilename } from '~/.server/dlt/pdf';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { pat, user } = await requireUser(request);
  const rawId = params.id;
  const id = rawId ? parseInt(rawId, 10) : NaN;

  if (!rawId || isNaN(id)) {
    throw data({ message: 'Invalid transaction ID' }, { status: 400 });
  }

  const txResult = await getTransaction(pat, id);
  if (!txResult.ok) {
    const status = txResult.error.status === 404 ? 404 : 500;
    throw data(
      { message: txResult.error.status === 404 ? 'Transaction not found' : txResult.error.message },
      { status },
    );
  }

  const tx = txResult.data;

  // Always fetch history (per spec: history_available=false may mean "purged",
  // not "never captured"). Non-fatal on error — render PDF without history.
  let history = null;
  {
    const allItems: HistoryItem[] = [];
    let page = 1;
    let lastPage = 1;
    let coverage = null;

    do {
      const histResult = await listTransactionHistory(pat, id, page, 100);
      if (!histResult.ok) {
        // Non-fatal: generate PDF without history rather than failing entirely
        allItems.length = 0;
        coverage = null;
        break;
      }
      allItems.push(...histResult.data.data);
      lastPage = histResult.data.meta.last_page;
      coverage = histResult.data.meta.coverage;
      page++;
    } while (page <= lastPage);

    if (coverage !== null) {
      history = {
        data: allItems,
        meta: {
          current_page: 1,
          per_page:     allItems.length,
          total:        allItems.length,
          last_page:    1,
          coverage,
        },
      };
    }
  }

  const pdfBuffer = await generateTransactionDetailPdf(
    tx,
    history,
    {
      firstName:    user.firstName,
      lastName:     user.lastName,
      email:        user.email,
      merchantName: user.merchantName,
    },
  );

  const filename = makeFilename(user.merchantName, `dlt-transaction-${rawId}`);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store, private',
    },
  });
}
