/**
 * Client-side CSV generation for per-page data export.
 * No extra API calls — exports only the currently loaded page.
 */

type CsvRow = Record<string, string | number | boolean | null | undefined>;

export function generateCsv(headers: string[], rows: CsvRow[], keys: string[]): string {
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const values = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Escape if contains comma, quote or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
