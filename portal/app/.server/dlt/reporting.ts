import { dltGet } from './client';
import type { Result } from './errors';
import { metricsSchema, chartsSchema } from './schemas';
import { z } from 'zod';

export type Metrics = z.infer<typeof metricsSchema>;
export type Charts = z.infer<typeof chartsSchema>;

export type ReportingFilters = {
  currency: string;
  from: string;
  to: string;
  timezone?: string;
  payment_brand?: string;
};

export type ChartsFilters = ReportingFilters & {
  interval: 'day' | 'month' | 'year';
};

export async function getMetrics(
  pat: string,
  filters: ReportingFilters,
): Promise<Result<Metrics>> {
  const params = new URLSearchParams();
  params.set('currency', filters.currency);
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.timezone) params.set('timezone', filters.timezone);
  if (filters.payment_brand) params.set('payment_brand', filters.payment_brand);

  const result = await dltGet<unknown>(
    `/api/v1/portal/collections/metrics?${params.toString()}`,
    pat,
  );
  if (!result.ok) return result;

  const parsed = metricsSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid metrics response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function getCharts(
  pat: string,
  filters: ChartsFilters,
): Promise<Result<Charts>> {
  const params = new URLSearchParams();
  params.set('currency', filters.currency);
  params.set('from', filters.from);
  params.set('to', filters.to);
  params.set('interval', filters.interval);
  if (filters.timezone) params.set('timezone', filters.timezone);
  if (filters.payment_brand) params.set('payment_brand', filters.payment_brand);

  const result = await dltGet<unknown>(
    `/api/v1/portal/collections/charts?${params.toString()}`,
    pat,
  );
  if (!result.ok) return result;

  const parsed = chartsSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid charts response' } };
  }
  return { ok: true, data: parsed.data };
}
