/**
 * PDF report generation for the DLT Merchant Portal.
 *
 * Two reports:
 *   generateTransactionListPdf   — portrait A4 list with header, filters,
 *                                   summary cards, currency×status table, transactions table.
 *   generateTransactionDetailPdf — portrait A4 single-transaction with history.
 *
 * Shared:
 *   - drawPageHeader  — logo (36 pt), 20 pt bold title, right-aligned meta block, brand rule
 *   - stampPageFooter — "Confidential …" | timestamp | "Page X of Y"
 *   - drawStatusPill  — pill (tinted bg + coloured text)
 *   - formatMoneyStr  — pure string-manipulation; never parseFloat/Number
 *   - brandLabel      — display-name map with raw-value fallback
 *   - reportRef       — DLT-{LIST|TXN}-{YYYYMMDD}-{HHmmss}-{4 random alphanum}
 *
 * Uses PDFKit (already in package.json). Decimal arithmetic via decimal.js.
 * Logo loaded from app/assets/dlt.png at module init — fails loudly if missing.
 */

import PDFDocument from 'pdfkit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { logger } from '../logger';
import type { Transaction, HistoryList, HistoryCoverage } from './collections';
import type { TransactionFiltersApi } from './collections';

// ─── Asset resolution ────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../assets/dlt.png');

if (!fs.existsSync(LOGO_PATH)) {
  throw new Error(`[pdf.ts] Logo asset not found at ${LOGO_PATH}. Fix before generating PDFs.`);
}

// ─── Page geometry ───────────────────────────────────────────────────────────

const A4_W = 595.28;
const A4_H = 841.89;

const MM = 2.8346;
const MARGIN = Math.round(18 * MM); // 18 mm ≈ 51 pt

// ─── Colour palette ──────────────────────────────────────────────────────────
// All muted text uses #6B7280 (≥ 4.5:1 on white) — never #9CA3AF.

const C = {
  ink:        '#111827', // gray-900
  ink2:       '#374151', // gray-700  ≥ 9:1 on white
  ink3:       '#6B7280', // gray-500  ≥ 4.5:1 on white  (was #9CA3AF → fixed)
  border:     '#E5E7EB', // gray-200
  headerBg:   '#F9FAFB', // gray-50   (table header only, very light)
  zebra:      '#F9FAFB', // gray-50
  white:      '#FFFFFF',
  brand:      '#172d99', // brand-800 (matches DESIGN_SYSTEM.md)
  // status
  paid:       '#166534', // green-800
  paidBg:     '#DCFCE7',
  pending:    '#92400E', // amber-800
  pendingBg:  '#FEF3C7',
  rejected:   '#991B1B', // red-800
  rejectedBg: '#FEE2E2',
  notCap:     '#374151',
  notCapBg:   '#F3F4F6',
  purged:     '#991B1B',
  purgedBg:   '#FEE2E2',
  amber:      '#92400E',
  amberBg:    '#FEF3C7',
};

// ─── Type helpers ────────────────────────────────────────────────────────────

type PdfUser = {
  firstName: string;
  lastName: string;
  email: string;
  merchantName: string;
};

type ActiveFilters = Pick<
  TransactionFiltersApi,
  'from' | 'to' | 'status' | 'merchant_transaction_id' | 'currency' | 'payment_brand' | 'query'
>;

type HeaderMeta = {
  merchant: string;
  generated: string;   // already formatted string
  generatedByName: string;
  generatedByEmail: string;
  reportRef: string;
};

// ─── Report reference ────────────────────────────────────────────────────────

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no O/0/I/1

function randomAlphanum(n: number): string {
  // Use crypto if available (Node 19+), otherwise fall back to Math.random
  let result = '';
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * ALPHANUM.length);
    result += ALPHANUM[idx];
  }
  return result;
}

export function makeReportRef(kind: 'LIST' | 'TXN'): string {
  const stamp = DateTime.now().setZone(REPORT_TZ).toFormat('yyyyMMdd-HHmmss');
  return `DLT-${kind}-${stamp}-${randomAlphanum(4)}`;
}

// ─── Brand display-label map ─────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa:        'Visa',
  mastercard:  'Mastercard',
  amex:        'Amex',
  jcb:         'JCB',
  discover:    'Discover',
  diners:      'Diners',
  gcash:       'GCash',
  maya:        'Maya',
  paymaya:     'Maya',
  'qr ph':     'QR Ph',
  'qr_ph':     'QR Ph',
  grabpay:     'GrabPay',
  shopeepay:   'ShopeePay',
  unionpay:    'UnionPay',
};

/** Return a display label for a brand stored value. Unknown values fall back unchanged. */
export function brandLabel(raw: string | null | undefined): string {
  if (!raw) return '—';
  const key = raw.toLowerCase().trim();
  return BRAND_LABELS[key] ?? raw;
}

// ─── Money formatting ─────────────────────────────────────────────────────────

/**
 * Format a decimal API string as thousands-separated with exactly 2 decimals.
 * NEVER uses parseFloat or Number. Null amount → "—".
 *
 * Examples:
 *   "52214.14"   → "52,214.14"
 *   "1000000.00" → "1,000,000.00"
 *   null         → "—"
 */
export function formatMoneyStr(amount: string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  // Use Decimal for safe toFixed then format the resulting string
  let dec: Decimal;
  try {
    dec = new Decimal(amount);
  } catch {
    return '—';
  }
  const fixed = dec.toFixed(2); // e.g. "52214.14"
  const [intPart, fracPart] = fixed.split('.');
  // Add thousands separators to integer part
  const formatted = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formatted}.${fracPart}`;
}

// ─── Date/time formatting ─────────────────────────────────────────────────────

const REPORT_TZ = 'Asia/Singapore';

/** List report: "2 Oct 2026, 8:05 PM" (no seconds) */
export function fmtListDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat("d MMM yyyy, h:mm a") : '—';
}

/** Detail report: "2 Oct 2026, 8:05:03 PM SGT" (with seconds and timezone label) */
export function fmtDetailDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat("d MMM yyyy, h:mm:ss a 'SGT'") : '—';
}

/** Plain date: "2 Oct 2026" */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = DateTime.fromISO(iso, { zone: REPORT_TZ });
  return dt.isValid ? dt.toFormat('d MMM yyyy') : '—';
}

/** Header timestamp: "30 Oct 2026, 8:13 PM SGT" */
function fmtGenerated(now: DateTime): string {
  return now.toFormat("d MMM yyyy, h:mm a 'SGT'");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function makeFilename(merchantName: string, prefix: string): string {
  const slug = slugify(merchantName) || 'merchant';
  const stamp = DateTime.now().setZone(REPORT_TZ).toFormat('yyyyMMdd-HHmm');
  return `${prefix}_${slug}_${stamp}.pdf`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ─── Summary computation ──────────────────────────────────────────────────────

type StatusTotals = {
  count: number;
  amount: Decimal;
};

export type ReportSummary = {
  total: number;
  byStatus: Record<'PAID' | 'PENDING' | 'REJECTED', StatusTotals>;
  /** byCurrency → byStatus totals (never null-amounts added to amount, but count always incremented) */
  byCurrencyStatus: Record<
    string,
    {
      count: number;
      PAID:     StatusTotals;
      PENDING:  StatusTotals;
      REJECTED: StatusTotals;
    }
  >;
};

export function computeSummary(rows: Transaction[]): ReportSummary {
  const byStatus: ReportSummary['byStatus'] = {
    PAID:     { count: 0, amount: new Decimal(0) },
    PENDING:  { count: 0, amount: new Decimal(0) },
    REJECTED: { count: 0, amount: new Decimal(0) },
  };
  const byCurrencyStatus: ReportSummary['byCurrencyStatus'] = {};

  for (const tx of rows) {
    const s = tx.status;
    byStatus[s].count++;
    if (tx.amount !== null) {
      byStatus[s].amount = byStatus[s].amount.plus(new Decimal(tx.amount));
    }

    const cc = tx.currency ?? '_unknown';
    if (!byCurrencyStatus[cc]) {
      byCurrencyStatus[cc] = {
        count: 0,
        PAID:     { count: 0, amount: new Decimal(0) },
        PENDING:  { count: 0, amount: new Decimal(0) },
        REJECTED: { count: 0, amount: new Decimal(0) },
      };
    }
    const entry = byCurrencyStatus[cc]!;
    entry.count++;
    entry[s].count++;
    if (tx.amount !== null) {
      entry[s].amount = entry[s].amount.plus(new Decimal(tx.amount));
    }
  }

  return { total: rows.length, byStatus, byCurrencyStatus };
}

// ─── Filter display ───────────────────────────────────────────────────────────

export function describeFilters(filters: ActiveFilters, tz = REPORT_TZ): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];

  if (filters.from && filters.to) {
    const from = DateTime.fromISO(filters.from, { zone: tz });
    const to = DateTime.fromISO(filters.to, { zone: tz });
    const label = `${from.isValid ? from.toFormat('d MMM yyyy') : filters.from} – ${to.isValid ? to.toFormat('d MMM yyyy') : filters.to} (${tz})`;
    pairs.push(['Date range', label]);
  } else if (filters.from) {
    pairs.push(['Date range', `From ${fmtDate(filters.from)} (${tz})`]);
  } else if (filters.to) {
    pairs.push(['Date range', `To ${fmtDate(filters.to)} (${tz})`]);
  } else {
    pairs.push(['Date range', 'All dates']);
  }

  if (filters.status) pairs.push(['Status', filters.status]);
  if (filters.currency) pairs.push(['Currency', filters.currency]);
  if (filters.payment_brand) pairs.push(['Payment brand', brandLabel(filters.payment_brand)]);
  if (filters.merchant_transaction_id) pairs.push(['Merchant Tx ID', filters.merchant_transaction_id]);
  if (filters.query) pairs.push(['Search', filters.query]);

  return pairs;
}

// ─── PDFKit helpers ───────────────────────────────────────────────────────────

/** Draw a filled rectangle */
function fillRect(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, w: number, h: number,
  color: string,
) {
  doc.rect(x, y, w, h).fillColor(color).fill();
}

/** Draw a horizontal rule */
function hRule(
  doc: InstanceType<typeof PDFDocument>,
  x: number, y: number, w: number,
  color = C.border,
  lw = 0.5,
) {
  doc.moveTo(x, y).lineTo(x + w, y).lineWidth(lw).strokeColor(color).stroke();
}

/**
 * Draw the shared page header.
 *
 * First page (showTitle=true, default):
 *   Logo (44 pt) + title split across 2 lines ("Collection Transactions" / "Report")
 *   at 18 pt bold on the left, right meta block right-aligned.
 *
 * Subsequent pages (showTitle=false):
 *   Only the right meta block + brand rule (no logo/title).
 *
 * Meta rows are inline: "Label  Value" on a single line, right-aligned.
 * Report ref is omitted (auto-generated, not useful to display).
 *
 * Returns the Y position immediately below the brand rule (ready for content).
 */
function drawPageHeader(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  pageW: number,
  margin: number,
  meta?: HeaderMeta,
  showTitle = true,
): number {
  const LOGO_H = 44;
  const topY = margin - 18;

  if (showTitle) {
    // ── Logo ──
    doc.image(LOGO_PATH, margin, topY, { height: LOGO_H, width: LOGO_H });

    // ── Title: split at last space before "Report" so line 1 = everything before,
    //    line 2 = "Report". Line 1 at 19 pt, line 2 at 18 pt bold.
    const TITLE_FONT_L1 = 19;
    const TITLE_FONT_L2 = 18;
    const LINE_H = 22; // leading between the two title lines
    // Split: "Collection Transactions Report" → ["Collection Transactions", "Report"]
    const lastSpace = title.lastIndexOf(' ');
    const titleLine1 = lastSpace > 0 ? title.slice(0, lastSpace) : title;
    const titleLine2 = lastSpace > 0 ? title.slice(lastSpace + 1) : '';

    const titleX = margin + LOGO_H + 10;
    const titleY = topY + 2;

    doc.font('Helvetica-Bold').fontSize(TITLE_FONT_L1).fillColor(C.ink)
      .text(titleLine1, titleX, titleY, { lineBreak: false });
    if (titleLine2) {
      doc.font('Helvetica-Bold').fontSize(TITLE_FONT_L2).fillColor(C.ink)
        .text(titleLine2, titleX, titleY + LINE_H, { lineBreak: false });
    }
  }

  // ── Right meta block (first page only) ──
  // Each row: label (muted) + em-space + bold value — all right-aligned on one line.
  if (meta && showTitle) {
    const META_W = 210;
    const metaX = pageW - margin - META_W;
    const META_FONT = 7.5;
    const ROW_GAP = 13;
    let my = topY;

    const drawMetaRow = (label: string, value: string) => {
      // Draw label (muted) then value (bold) as two separate text calls on the same baseline,
      // right-aligned together by measuring label width and placing value flush right.
      doc.font('Helvetica').fontSize(META_FONT).fillColor(C.ink3);
      const labelW = doc.widthOfString(label + '  ');
      // Place label so that value ends flush at metaX + META_W
      doc.font('Helvetica-Bold').fontSize(META_FONT).fillColor(C.ink2);
      const valueW = doc.widthOfString(value);
      const totalW = labelW + valueW;
      const startX = metaX + META_W - totalW;

      doc.font('Helvetica').fontSize(META_FONT).fillColor(C.ink3)
        .text(label + '  ', startX, my, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(META_FONT).fillColor(C.ink2)
        .text(value, startX + labelW, my, { lineBreak: false });
      my += ROW_GAP;
    };

    // "Generated by" email goes on its own line beneath the name
    const drawMetaRowWithSub = (label: string, value: string, subValue: string) => {
      drawMetaRow(label, value);
      // Sub-value (email) right-aligned, regular weight
      doc.font('Helvetica').fontSize(META_FONT - 0.5).fillColor(C.ink3)
        .text(subValue, metaX, my - ROW_GAP + 11, { width: META_W, align: 'right', lineBreak: false });
      my += 2; // small extra gap after the email line
    };

    drawMetaRow('Merchant', truncate(meta.merchant, 30));
    drawMetaRow('Generated', meta.generated);
    drawMetaRowWithSub('Generated by', meta.generatedByName, meta.generatedByEmail);
    // Report ref intentionally omitted (auto-generated value)
  }

  // ── Blue rule ──
  const ruleY = topY + LOGO_H + 4;
  hRule(doc, margin, ruleY, pageW - margin * 2, C.brand, 2);
  return ruleY + 8;
}

/**
 * Stamp running page footer on the *current* page.
 * Left: "Confidential: for merchant use only"
 * Center: generated timestamp
 * Right: "Page X of Y"
 */
function stampPageFooter(
  doc: InstanceType<typeof PDFDocument>,
  pageIndex: number,
  totalPages: number,
  pageH: number,
  pageW: number,
  margin: number,
  generatedAt: string,
) {
  const y = pageH - margin + 10;
  const colW = (pageW - margin * 2) / 3;

  const savedBottom = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  hRule(doc, margin, y - 8, pageW - margin * 2, C.border, 0.5);

  doc.font('Helvetica').fontSize(7).fillColor(C.ink3);
  doc.text('Confidential: for merchant use only', margin, y, {
    width: colW,
    align: 'left',
    lineBreak: false,
  });
  doc.text(generatedAt, margin + colW, y, {
    width: colW,
    align: 'center',
    lineBreak: false,
  });
  doc.text(`Page ${pageIndex + 1} of ${totalPages}`, margin + colW * 2, y, {
    width: colW,
    align: 'right',
    lineBreak: false,
  });

  doc.page.margins.bottom = savedBottom;
}

/** Draw status as color-coded bold text (no pill background). */
function drawStatusText(
  doc: InstanceType<typeof PDFDocument>,
  status: string,
  x: number,
  y: number,
  w = 60,
): void {
  let fg = C.notCap;
  if (status === 'PAID')     fg = C.paid;
  if (status === 'PENDING')  fg = C.pending;
  if (status === 'REJECTED') fg = C.rejected;

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(fg)
    .text(status, x, y, { width: w, align: 'left', lineBreak: false });
}

// ─── PDFKit async finalization ────────────────────────────────────────────────

function finalizePdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

// ─── Section heading ──────────────────────────────────────────────────────────

/**
 * Small semibold heading + 1 px hairline (#E5E7EB).
 * No full-width gray bar.
 */
function drawSectionHeading(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  x: number,
  y: number,
  w: number,
): number {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
    .text(label, x, y, { width: w, lineBreak: false });
  hRule(doc, x, y + 13, w, C.border, 1);
  return y + 20;
}

// ─── Transaction list PDF ─────────────────────────────────────────────────────

/**
 * Generate a portrait A4 PDF for the transactions list.
 *
 * @param rows         Transaction rows (already capped to PDF_ROW_CAP)
 * @param filters      Active filters as passed to the API
 * @param user         User metadata for the header
 * @param capped       true if rows were truncated at the cap
 * @param metaTotal    The real total from the API meta (may exceed rows.length if capped)
 * @param oldestDate   ISO string of the oldest transaction in the full set (from API)
 * @param newestDate   ISO string of the newest transaction in the full set (from API)
 */
export async function generateTransactionListPdf(
  rows: Transaction[],
  filters: ActiveFilters,
  user: PdfUser,
  capped: boolean,
  metaTotal?: number,
  oldestDate?: string | null,
  newestDate?: string | null,
): Promise<Buffer> {
  const PAGE_W = A4_W;
  const PAGE_H = A4_H;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const now = DateTime.now().setZone(REPORT_TZ);
  const generatedAt = fmtGenerated(now);
  const reportRef = makeReportRef('LIST');

  const headerMeta: HeaderMeta = {
    merchant: user.merchantName,
    generated: generatedAt,
    generatedByName: `${user.firstName} ${user.lastName}`,
    generatedByEmail: user.email,
    reportRef,
  };

  logger.info('pdf.list.generate', {
    reportRef,
    rows: rows.length,
    metaTotal,
    capped,
    merchant: user.merchantName,
    generatedBy: user.email,
  });

  const REPORT_TITLE = 'Collection Transactions Report';

  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN + 10, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: REPORT_TITLE,
      Author: `${user.firstName} ${user.lastName}`,
      Producer: 'DLT Merchant Portal',
      CreationDate: new Date(),
    },
  });

  const bufferPromise = finalizePdf(doc);

  let y = drawPageHeader(doc, REPORT_TITLE, PAGE_W, MARGIN, headerMeta);

  // ── Filters panel ─────────────────────────────────────────────────────────
  y = drawSectionHeading(doc, 'Filters applied', MARGIN, y, CONTENT_W);

  const filterPairs = describeFilters(filters, REPORT_TZ);
  if (filterPairs.length === 0) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.ink2)
      .text('None (all transactions)', MARGIN, y, { lineBreak: false });
    y += 14;
  } else {
    const half = Math.ceil(filterPairs.length / 2);
    let leftY = y;
    let rightY = y;
    filterPairs.forEach(([label, value], i) => {
      const col = i < half ? 0 : 1;
      const cx = MARGIN + col * (CONTENT_W / 2 + 6);
      const rowY = col === 0 ? leftY : rightY;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink3)
        .text(label + ':', cx, rowY, { width: 100, lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(C.ink)
        .text(truncate(value, 45), cx + 104, rowY, { width: CONTENT_W / 2 - 110, lineBreak: false });
      if (col === 0) leftY += 13; else rightY += 13;
    });
    y = Math.max(leftY, rightY) + 4;
  }

  // ── Coverage line ─────────────────────────────────────────────────────────
  const totalDisplayed = metaTotal ?? rows.length;
  const oldest = oldestDate ? fmtListDate(oldestDate) : null;
  const newest = newestDate ? fmtListDate(newestDate) : null;
  const coverageText = oldest && newest
    ? `Showing ${rows.length.toLocaleString()} of ${totalDisplayed.toLocaleString()} transactions · Oldest ${oldest} · Newest ${newest} · Sorted newest first`
    : `Showing ${rows.length.toLocaleString()} of ${totalDisplayed.toLocaleString()} transactions · Sorted newest first`;

  doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
    .text(coverageText, MARGIN, y, { width: CONTENT_W, lineBreak: false });
  y += 14;

  if (capped) {
    fillRect(doc, MARGIN, y, CONTENT_W, 20, C.amberBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2).strokeColor(C.pending).lineWidth(0.75).stroke();
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.amber)
      .text(
        `Warning: Report limited to the first ${rows.length.toLocaleString()} transactions. ${totalDisplayed > rows.length ? `${(totalDisplayed - rows.length).toLocaleString()} transactions not shown.` : ''} Narrow your filters or use CSV export for the full dataset.`,
        MARGIN + 6, y + 5, { width: CONTENT_W - 12, lineBreak: false },
      );
    y += 26;
  }

  hRule(doc, MARGIN, y, CONTENT_W);
  y += 10;

  // ── Summary KPI cards ─────────────────────────────────────────────────────
  y = drawSectionHeading(doc, 'Summary', MARGIN, y, CONTENT_W);

  const summary = computeSummary(rows);
  const currencies = Object.keys(summary.byCurrencyStatus).filter(cc => cc !== '_unknown');
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;

  const CARD_W = (CONTENT_W - 12) / 4;
  const CARD_H = 52;
  const CARD_GAP = 4;

  type CardDef = { label: string; count: number; amountStr: string; color: string; zeroAmount: boolean };

  const makeCard = (
    label: string,
    status: 'PAID' | 'PENDING' | 'REJECTED',
    color: string,
  ): CardDef => {
    const st = summary.byStatus[status];
    let amountStr: string;
    let zeroAmount = st.count === 0;
    if (st.count === 0) {
      amountStr = '—';
    } else if (singleCurrency) {
      amountStr = `${singleCurrency} ${formatMoneyStr(st.amount.toFixed(2))}`;
    } else {
      amountStr = 'see breakdown below';
    }
    return { label, count: st.count, amountStr, color, zeroAmount };
  };

  const cards: CardDef[] = [
    {
      label: 'Total',
      count: summary.total,
      amountStr: singleCurrency && summary.total > 0
        ? `${singleCurrency} ${formatMoneyStr(
            Object.values(summary.byCurrencyStatus).reduce(
              (acc, cs) => acc.plus(cs.PAID.amount).plus(cs.PENDING.amount).plus(cs.REJECTED.amount),
              new Decimal(0),
            ).toFixed(2),
          )}`
        : summary.total > 0 ? 'see breakdown below' : '—',
      color: C.brand,
      zeroAmount: summary.total === 0,
    },
    makeCard('PAID',     'PAID',     C.paid),
    makeCard('PENDING',  'PENDING',  C.pending),
    makeCard('REJECTED', 'REJECTED', C.rejected),
  ];

  cards.forEach(({ label, count, amountStr, color, zeroAmount }, i) => {
    const cx = MARGIN + i * (CARD_W + CARD_GAP);
    fillRect(doc, cx, y, CARD_W, CARD_H, C.white);
    doc.roundedRect(cx, y, CARD_W, CARD_H, 3).strokeColor(C.border).lineWidth(0.75).stroke();

    // Label
    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
      .text(label, cx + 8, y + 7, { width: CARD_W - 16, lineBreak: false });
    // Count (large)
    doc.font('Helvetica-Bold').fontSize(22).fillColor(zeroAmount ? C.ink3 : color)
      .text(String(count), cx + 8, y + 17, { width: CARD_W - 16, lineBreak: false });
    // Amount sub-line
    doc.font('Helvetica').fontSize(7).fillColor(zeroAmount ? C.ink3 : C.ink2)
      .text(amountStr, cx + 8, y + 41, { width: CARD_W - 16, lineBreak: false });
  });

  y += CARD_H + 10;

  // ── Totals by currency and status table ───────────────────────────────────
  if (currencies.length > 0) {
    y = drawSectionHeading(doc, 'Totals by currency and status', MARGIN, y, CONTENT_W);

    // Table header
    const CC_COL_W  = 52;
    const STAT_COL_W = (CONTENT_W - CC_COL_W) / 4;
    const CURR_ROW_H = 16;

    fillRect(doc, MARGIN, y, CONTENT_W, CURR_ROW_H, C.headerBg);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink2);
    doc.text('Currency', MARGIN + 4, y + 4, { width: CC_COL_W - 4, align: 'left', lineBreak: false });
    const statLabels = ['Paid (collected)', 'Pending', 'Rejected', 'All statuses'];
    statLabels.forEach((lbl, i) => {
      const cx = MARGIN + CC_COL_W + i * STAT_COL_W;
      doc.text(lbl, cx, y + 4, { width: STAT_COL_W - 4, align: 'right', lineBreak: false });
    });
    y += CURR_ROW_H;

    currencies.forEach((cc, idx) => {
      const cs = summary.byCurrencyStatus[cc]!;
      const allAmount = cs.PAID.amount.plus(cs.PENDING.amount).plus(cs.REJECTED.amount);
      if (idx % 2 === 1) fillRect(doc, MARGIN, y, CONTENT_W, CURR_ROW_H, C.zebra);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink)
        .text(cc, MARGIN + 4, y + 4, { width: CC_COL_W - 4, align: 'left', lineBreak: false });
      const statValues = [
        { amount: cs.PAID.amount,     count: cs.PAID.count,     color: C.paid },
        { amount: cs.PENDING.amount,  count: cs.PENDING.count,  color: C.pending },
        { amount: cs.REJECTED.amount, count: cs.REJECTED.count, color: C.rejected },
        { amount: allAmount,          count: cs.count,           color: C.ink },
      ];
      statValues.forEach(({ amount, count, color }, i) => {
        const cx = MARGIN + CC_COL_W + i * STAT_COL_W;
        const txt = count > 0 ? formatMoneyStr(amount.toFixed(2)) : '—';
        doc.font('Helvetica').fontSize(8).fillColor(count > 0 ? color : C.ink3)
          .text(txt, cx, y + 4, { width: STAT_COL_W - 4, align: 'right', lineBreak: false });
      });
      y += CURR_ROW_H;
    });

    hRule(doc, MARGIN, y, CONTENT_W, C.border, 0.5);
    y += 8;

    // Note
    doc.font('Helvetica').fontSize(7).fillColor(C.ink3)
      .text(
        'Only PAID amounts have been collected. PENDING and REJECTED amounts are shown for reference.',
        MARGIN, y, { width: CONTENT_W, lineBreak: false },
      );
    y += 14;
  }

  hRule(doc, MARGIN, y, CONTENT_W);
  y += 10;

  // ── Transactions table ────────────────────────────────────────────────────

  if (rows.length === 0) {
    y += 20;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink2)
      .text('No transactions match these filters.', MARGIN, y, { align: 'center', width: CONTENT_W, lineBreak: false });
  } else {
    // Column definitions — explicit widths, Amount right-padded, Currency left-padded
    // Total CONTENT_W ≈ 493 pt
    // Reference narrowed to 100 (was 120) so Currency never wraps; Brand gets the slack.
    const cols = [
      { label: 'Date & time',  w: 90,  align: 'left'  as const, pad: 4 },
      { label: 'Reference',    w: 100, align: 'left'  as const, pad: 4 },
      { label: 'Amount',       w: 74,  align: 'right' as const, rpad: 12 },
      { label: 'Currency',     w: 56,  align: 'left'  as const, lpad: 8 },
      { label: 'Status',       w: 60,  align: 'left'  as const, pad: 4 },
      { label: 'Brand',        w: 113, align: 'left'  as const, pad: 4 },
    ] as const;

    const ROW_H = 16;
    const HEAD_H = 18;

    const drawTableHeader = (atY: number): number => {
      fillRect(doc, MARGIN, atY, CONTENT_W, HEAD_H, C.headerBg);
      let cx = MARGIN;
      for (const col of cols) {
        const lpad = 'lpad' in col ? col.lpad : ('pad' in col ? col.pad : 4);
        const rpad = 'rpad' in col ? col.rpad : 0;
        const innerX = cx + lpad;
        const innerW = col.w - lpad - rpad - 4;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink2)
          .text(col.label, innerX, atY + 5, { width: innerW, align: col.align, lineBreak: false });
        cx += col.w;
      }
      return atY + HEAD_H;
    };

    y = drawTableHeader(y);

    rows.forEach((tx, idx) => {
      // Page break — guarantee full row fits
      if (y + ROW_H > PAGE_H - MARGIN - 20) {
        doc.addPage({
          size: [PAGE_W, PAGE_H],
          margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
        });
        y = MARGIN;
        y = drawTableHeader(y);
      }

      if (idx % 2 === 1) fillRect(doc, MARGIN, y, CONTENT_W, ROW_H, C.zebra);

      let cx = MARGIN;

      // Date & time
      {
        const col = cols[0];
        const lpad = 'pad' in col ? col.pad : 4;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
          .text(fmtListDate(tx.created_at), cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      // Reference (monospace, wrapped)
      {
        const col = cols[1];
        const lpad = 'pad' in col ? col.pad : 4;
        doc.font('Courier').fontSize(7).fillColor(C.ink)
          .text(tx.merchant_transaction_id, cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      // Amount (right-aligned, 12px right padding)
      {
        const col = cols[2];
        const rpad = 'rpad' in col ? col.rpad : 0;
        doc.font('Helvetica').fontSize(8).fillColor(C.ink)
          .text(formatMoneyStr(tx.amount), cx, y + 4, { width: col.w - rpad, align: 'right', lineBreak: false });
        cx += col.w;
      }
      // Currency (left-aligned, 8px left padding)
      {
        const col = cols[3];
        const lpad = 'lpad' in col ? col.lpad : 4;
        doc.font('Helvetica').fontSize(8).fillColor(C.ink)
          .text(tx.currency ?? '—', cx + lpad, y + 4, { width: col.w - lpad - 4, align: col.align, lineBreak: false });
        cx += col.w;
      }
      // Status (color-coded text)
      {
        const col = cols[4];
        const lpad = 'pad' in col ? col.pad : 4;
        drawStatusText(doc, tx.status, cx + lpad, y + 4, col.w - lpad - 4);
        cx += col.w;
      }
      // Brand (display label)
      {
        const col = cols[5];
        const lpad = 'pad' in col ? col.pad : 4;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
          .text(truncate(brandLabel(tx.payment_brand), 22), cx + lpad, y + 4, {
            width: col.w - lpad - 4, align: col.align, lineBreak: false,
          });
      }

      y += ROW_H;
    });

    if (y + 24 > PAGE_H - MARGIN - 20) {
      doc.addPage({
        size: [PAGE_W, PAGE_H],
        margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
      });
      y = MARGIN;
    }

    hRule(doc, MARGIN, y, CONTENT_W);
    y += 6;

    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
      .text(
        'Note: Statuses are normalised (PAID, PENDING, REJECTED). Data is as stored at generation time. Timestamps are in Asia/Singapore (SGT).',
        MARGIN, y, { width: CONTENT_W, lineBreak: false },
      );
  }

  // ── Stamp footers on every page ───────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    stampPageFooter(doc, i, range.count, PAGE_H, PAGE_W, MARGIN, generatedAt);
  }

  doc.end();
  return bufferPromise;
}

// ─── Transaction detail PDF ───────────────────────────────────────────────────

const OMISSION_REASON_LABELS: Record<string, string> = {
  portal_field_allowlist:               'Field not included in portal allowlist',
  merchant_response_field_allowlist:    'Merchant response field not in allowlist',
  payment_url_excluded:                 'Payment URL excluded for security',
  pci_dss_exclusion:                    'Excluded for PCI-DSS compliance',
  oversize:                             'Value too large to store',
  binary_content:                       'Binary content not recorded',
  sensitive_header:                     'Sensitive header redacted',
  unsupported_content_type:             'Unsupported content type',
};

const COVERAGE_LABELS: Record<string, string> = {
  merchant_request:          'Merchant Request',
  dlt_response:              'DLT Response',
  merchant_webhook_request:  'Webhook Sent',
  merchant_webhook_response: 'Webhook Reply',
};

const EVENT_LABELS: Record<string, string> = {
  merchant_request:          'Merchant Request',
  dlt_response:              'DLT Response',
  merchant_webhook_request:  'Webhook Notification',
  merchant_webhook_response: 'Webhook Response',
};

const DIRECTION_LABELS: Record<string, string> = {
  merchant_to_dlt: 'Merchant -> DLT',
  dlt_to_merchant: 'DLT -> Merchant',
};

const CAPTURE_STATUS_LABELS: Record<string, string> = {
  available:   'Available',
  omitted:     'Omitted',
  unavailable: 'Unavailable',
  purged:      'Purged',
};

function coverageColor(status: string): [string, string] {
  if (status === 'captured')     return [C.paidBg,   C.paid];
  if (status === 'purged')       return [C.purgedBg,  C.purged];
  return [C.notCapBg, C.notCap];
}

function coverageStatusLabel(status: string): string {
  if (status === 'captured')     return 'Captured';
  if (status === 'not_captured') return 'Not captured';
  if (status === 'purged')       return 'Purged';
  return status;
}

/**
 * Generate a portrait A4 PDF for a single transaction with history.
 * Always calls history API regardless of history_available flag.
 */
export async function generateTransactionDetailPdf(
  tx: Transaction,
  history: HistoryList | null,
  user: PdfUser,
): Promise<Buffer> {
  const PAGE_W = A4_W;
  const PAGE_H = A4_H;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const now = DateTime.now().setZone(REPORT_TZ);
  const generatedAt = fmtGenerated(now);
  const reportRef = makeReportRef('TXN');
  const REPORT_TITLE = 'Transaction Report';

  const headerMeta: HeaderMeta = {
    merchant: user.merchantName,
    generated: generatedAt,
    generatedByName: `${user.firstName} ${user.lastName}`,
    generatedByEmail: user.email,
    reportRef,
  };

  logger.info('pdf.detail.generate', {
    reportRef,
    transactionId: tx.id,
    merchantTxId: tx.merchant_transaction_id,
    merchant: user.merchantName,
    generatedBy: user.email,
    historyItems: history?.data.length ?? 0,
  });

  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN + 10, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Title: `${REPORT_TITLE} — ${tx.merchant_transaction_id}`,
      Author: `${user.firstName} ${user.lastName}`,
      Producer: 'DLT Merchant Portal',
      CreationDate: new Date(),
    },
  });

  const bufferPromise = finalizePdf(doc);
  let y = drawPageHeader(doc, REPORT_TITLE, PAGE_W, MARGIN, headerMeta);

  // ── Transaction summary ───────────────────────────────────────────────────
  y = drawSectionHeading(doc, 'Transaction Summary', MARGIN, y, CONTENT_W);

  // Amount string: "PHP 28.33" (combined, no separate Currency row)
  const amountDisplay =
    tx.amount !== null && tx.currency
      ? `${tx.currency} ${formatMoneyStr(tx.amount)}`
      : '—';

  // Exchange history: always show, but label differs
  const exchangeHistoryValue: string = (() => {
    if (!history) return 'None recorded';
    if (history.data.length === 0) return 'None recorded';
    return `${history.data.length} event${history.data.length !== 1 ? 's' : ''} recorded`;
  })();

  const LBL_W = 130;
  const VAL_X = MARGIN + LBL_W + 8;
  const VAL_W = CONTENT_W - LBL_W - 8;
  const ROW_H_DEF = 15;

  const summaryFields: Array<[string, string | 'STATUS_PILL']> = [
    ['Merchant reference',  tx.merchant_transaction_id],
    ['Internal ID',         String(tx.id)],
    ['Amount',              amountDisplay],
    ['Status',              'STATUS_PILL'],
    ['Payment brand',       brandLabel(tx.payment_brand)],
    ['Created',             fmtDetailDate(tx.created_at)],
    ['Updated',             fmtDetailDate(tx.updated_at)],
    ['Exchange history',    exchangeHistoryValue],
  ];

  for (const [label, value] of summaryFields) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink3)
      .text(label, MARGIN, y, { width: LBL_W, lineBreak: false });

    if (value === 'STATUS_PILL') {
      drawStatusText(doc, tx.status, VAL_X, y, 80);
    } else {
      doc.font('Helvetica').fontSize(8.5).fillColor(C.ink)
        .text(value, VAL_X, y, { width: VAL_W, lineBreak: false });
    }
    y += ROW_H_DEF;
  }

  y += 6;
  hRule(doc, MARGIN, y, CONTENT_W);
  y += 12;

  // ── Exchange history section ──────────────────────────────────────────────
  y = drawSectionHeading(doc, 'Exchange History', MARGIN, y, CONTENT_W);

  if (!history || history.data.length === 0) {
    // Bordered empty-state box
    const BOX_H = 56;
    fillRect(doc, MARGIN, y, CONTENT_W, BOX_H, C.headerBg);
    doc.roundedRect(MARGIN, y, CONTENT_W, BOX_H, 4).strokeColor(C.border).lineWidth(1).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
      .text('No recorded exchanges', MARGIN + 10, y + 10, { width: CONTENT_W - 20, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
      .text(
        'No merchant <-> DLT exchanges are stored for this transaction. Payload capture currently covers supported APN hosted checkout flows, so other providers may show no history. This does not indicate whether the payment succeeded.',
        MARGIN + 10, y + 24, { width: CONTENT_W - 20, lineBreak: true },
      );
    y += BOX_H + 12;
  } else {
    // Coverage block (4 pills)
    const coverage = history.meta.coverage as Record<string, string>;
    const coverageKeys: Array<keyof HistoryCoverage> = [
      'merchant_request',
      'dlt_response',
      'merchant_webhook_request',
      'merchant_webhook_response',
    ];
    const pillW = (CONTENT_W - 3 * 4) / 4; // 4 equal pills with 4pt gaps
    const COV_H = 30;

    coverageKeys.forEach((key, i) => {
      const status = coverage[key] ?? 'not_captured';
      const [bg, fg] = coverageColor(status);
      const cx = MARGIN + i * (pillW + 4);
      fillRect(doc, cx, y, pillW, COV_H, bg);
      doc.roundedRect(cx, y, pillW, COV_H, 2).strokeColor(fg).lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).fillColor(C.ink3)
        .text(COVERAGE_LABELS[key] ?? key, cx + 4, y + 4, { width: pillW - 8, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(fg)
        .text(coverageStatusLabel(status), cx + 4, y + 16, { width: pillW - 8, lineBreak: false });
    });
    y += COV_H + 10;

    // Timeline header
    doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
      .text(
        `${history.data.length} event${history.data.length !== 1 ? 's' : ''}, ascending by capture time`,
        MARGIN, y, { width: CONTENT_W, lineBreak: false },
      );
    y += 12;

    // Sort ascending by captured_at
    const sorted = [...history.data].sort((a, b) =>
      a.captured_at.localeCompare(b.captured_at),
    );

    for (const item of sorted) {
      const EVENT_BLOCK_MIN = 70;
      if (y + EVENT_BLOCK_MIN > PAGE_H - MARGIN - 20) {
        doc.addPage({
          size: [PAGE_W, PAGE_H],
          margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
        });
        y = MARGIN;
      }

      const eventLabel = EVENT_LABELS[item.event_type] ?? item.event_type;
      const dirLabel   = DIRECTION_LABELS[item.direction] ?? item.direction;

      // Event row header
      fillRect(doc, MARGIN, y, CONTENT_W, 18, C.zebra);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink)
        .text(eventLabel, MARGIN + 4, y + 4, { width: 180, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(C.ink2)
        .text(dirLabel, MARGIN + 188, y + 5, { width: 140, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(C.ink2)
        .text(fmtDetailDate(item.captured_at), MARGIN + 332, y + 5, {
          width: CONTENT_W - 336,
          align: 'right',
          lineBreak: false,
        });
      y += 20;

      // Detail fields
      const detailFields: Array<[string, string]> = [
        ['Capture status', CAPTURE_STATUS_LABELS[item.capture_status] ?? item.capture_status],
      ];
      if (item.http_status != null)   detailFields.push(['HTTP status', String(item.http_status)]);
      if (item.attempt_number != null) detailFields.push(['Attempt', String(item.attempt_number)]);
      if (item.delivery) {
        detailFields.push(['Delivery state', item.delivery.state]);
        if (item.delivery.duration_ms != null) detailFields.push(['Duration', `${item.delivery.duration_ms} ms`]);
      }
      if (item.response) {
        if (item.response.capture_stage) detailFields.push(['Capture stage', item.response.capture_stage]);
        if (item.response.is_repeated_request != null)
          detailFields.push(['Repeated request', item.response.is_repeated_request ? 'Yes' : 'No']);
      }
      if (item.retain_until) detailFields.push(['Retained until', fmtDetailDate(item.retain_until)]);
      if (item.purged_at)    detailFields.push(['Purged at',      fmtDetailDate(item.purged_at)]);

      for (const [lbl, val] of detailFields) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink3)
          .text(lbl + ':', MARGIN + 10, y, { width: 110, lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor(C.ink)
          .text(val, MARGIN + 124, y, { width: CONTENT_W - 134, lineBreak: false });
        y += 11;
      }

      // Payload key/value
      if (item.payload !== null && typeof item.payload === 'object' && !Array.isArray(item.payload)) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink3)
          .text('Payload:', MARGIN + 10, y, { lineBreak: false });
        y += 11;
        for (const [k, v] of Object.entries(item.payload as Record<string, unknown>)) {
          if (y + 11 > PAGE_H - MARGIN - 20) {
            doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
            y = MARGIN;
          }
          const display = typeof v === 'object' ? JSON.stringify(v) : String(v);
          doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
            .text(`${k}:`, MARGIN + 18, y, { width: 100, lineBreak: false });
          doc.fillColor(C.ink)
            .text(truncate(display, 120), MARGIN + 122, y, { width: CONTENT_W - 132, lineBreak: false });
          y += 10;
        }
      }

      // Omissions
      if (item.omissions.length > 0) {
        if (y + 12 > PAGE_H - MARGIN - 20) {
          doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
          y = MARGIN;
        }
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.ink3)
          .text('Omitted fields:', MARGIN + 10, y, { lineBreak: false });
        y += 10;
        for (const omission of item.omissions) {
          if (y + 10 > PAGE_H - MARGIN - 20) {
            doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN } });
            y = MARGIN;
          }
          const reason = OMISSION_REASON_LABELS[omission.reason_code] ?? omission.reason_code;
          doc.font('Helvetica').fontSize(7).fillColor(C.ink3)
            .text(`${omission.field_path}: ${reason}`, MARGIN + 18, y, { width: CONTENT_W - 28, lineBreak: false });
          y += 10;
        }
      }

      hRule(doc, MARGIN, y + 2, CONTENT_W);
      y += 10;
    }
  }

  // ── Notes block (end of content, no gray bar) ─────────────────────────────
  const NOTES_H = 44;
  if (y + NOTES_H > PAGE_H - MARGIN - 20) {
    doc.addPage({
      size: [PAGE_W, PAGE_H],
      margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
    });
    y = MARGIN;
  }

  y = drawSectionHeading(doc, 'Notes', MARGIN, y, CONTENT_W);
  doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3)
    .text(
      'History shows sanitized, recorded exchanges between the merchant integration and DLT. ' +
      'Sent or queued does not mean the payment succeeded. ' +
      'This is not a reconstruction of original traffic.',
      MARGIN, y, { width: CONTENT_W },
    );

  // ── Stamp running header + footer on every page ───────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    stampPageFooter(doc, i, range.count, PAGE_H, PAGE_W, MARGIN, generatedAt);
  }

  doc.end();
  return bufferPromise;
}
