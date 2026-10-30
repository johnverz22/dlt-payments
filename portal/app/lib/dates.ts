import { DateTime, type Zone } from 'luxon';

const DEFAULT_TZ = 'Asia/Manila';

/**
 * Create an ISO instant string for the start of a day in a timezone.
 * Always includes seconds and explicit offset (never bare +08:00 as space).
 */
export function startOfDay(date: string, tz: string = DEFAULT_TZ): string {
  const dt = DateTime.fromISO(date, { zone: tz }).startOf('day');
  return dt.toISO({ suppressMilliseconds: true })!;
}

/**
 * Create an ISO instant string for the start of the next day (exclusive end).
 */
export function endOfDay(date: string, tz: string = DEFAULT_TZ): string {
  const dt = DateTime.fromISO(date, { zone: tz }).plus({ days: 1 }).startOf('day');
  return dt.toISO({ suppressMilliseconds: true })!;
}

/**
 * Format a timestamp for display in a specific timezone.
 */
export function formatTimestamp(
  iso: string | null,
  tz: string = DEFAULT_TZ,
  format: 'short' | 'long' = 'short',
): string {
  if (!iso) return '—';
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (!dt.isValid) return '—';

  return format === 'long'
    ? dt.toFormat('MMM d, yyyy h:mm:ss a ZZZZ')
    : dt.toFormat('MMM d, yyyy h:mm a');
}

/**
 * Format relative time (e.g., "5 minutes ago").
 */
export function formatRelative(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '—';
  return dt.toRelative() ?? '—';
}

/**
 * Choose the right chart interval based on the date range.
 * ≤ 62 days → day, ≤ 24 months → month, otherwise year.
 */
export function autoInterval(
  from: string,
  to: string,
  tz: string = DEFAULT_TZ,
): 'day' | 'month' | 'year' {
  const start = DateTime.fromISO(from, { zone: tz });
  const end = DateTime.fromISO(to, { zone: tz });
  const days = end.diff(start, 'days').days;
  const months = end.diff(start, 'months').months;

  if (days <= 62) return 'day';
  if (months <= 24) return 'month';
  return 'year';
}
