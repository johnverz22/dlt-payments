/**
 * Bucket-limit validation for chart intervals.
 * Daily ≤ 366, monthly ≤ 120, yearly ≤ 10, total range ≤ 10 calendar years.
 */

import { DateTime } from 'luxon';

export type IntervalType = 'day' | 'month' | 'year';

export const BUCKET_LIMITS: Record<IntervalType, number> = {
  day: 366,
  month: 120,
  year: 10,
};

/**
 * Estimate bucket count for a given range and interval.
 */
export function estimateBuckets(
  from: string,
  to: string,
  interval: IntervalType,
  tz: string = 'Asia/Manila',
): number {
  const start = DateTime.fromISO(from, { zone: tz });
  const end = DateTime.fromISO(to, { zone: tz });

  switch (interval) {
    case 'day':
      return Math.ceil(end.diff(start, 'days').days);
    case 'month':
      return Math.ceil(end.diff(start, 'months').months);
    case 'year':
      return Math.ceil(end.diff(start, 'years').years);
  }
}

/**
 * Validate that a given interval won't exceed bucket limits.
 */
export function validateInterval(
  from: string,
  to: string,
  interval: IntervalType,
  tz?: string,
): { valid: boolean; buckets: number; limit: number } {
  const buckets = estimateBuckets(from, to, interval, tz);
  const limit = BUCKET_LIMITS[interval];
  return { valid: buckets <= limit, buckets, limit };
}
