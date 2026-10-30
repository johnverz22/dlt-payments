import { dltGet } from './client';
import type { Result } from './errors';
import { currencyItemSchema } from './schemas';
import { z } from 'zod';

export type CurrencyItem = z.infer<typeof currencyItemSchema>;

// Server-side cache (1 hour)
let currencyCache: { data: CurrencyItem[]; expiresAt: number } | null = null;

export async function getCurrencyCatalogue(): Promise<Result<CurrencyItem[]>> {
  const now = Date.now();
  if (currencyCache && currencyCache.expiresAt > now) {
    return { ok: true, data: currencyCache.data };
  }

  // Currency catalogue is public — no bearer needed
  const result = await dltGet<unknown>('/api/v1/json/currency', '');
  if (!result.ok) return result;

  const parsed = z.array(currencyItemSchema).safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid currency catalogue response' } };
  }

  currencyCache = { data: parsed.data, expiresAt: now + 60 * 60 * 1000 };
  return { ok: true, data: parsed.data };
}
