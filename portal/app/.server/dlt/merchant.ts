import { dltGet, dltMutate } from './client';
import type { Result } from './errors';
import { merchantSchema } from './schemas';
import { z } from 'zod';

export type Merchant = z.infer<typeof merchantSchema>;

export async function getMerchant(pat: string): Promise<Result<Merchant>> {
  const result = await dltGet<unknown>('/api/v1/portal/merchant', pat);
  if (!result.ok) return result;

  const parsed = merchantSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid merchant response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function patchMerchant(
  pat: string,
  fields: Partial<{
    name: string;
    contact_person: string;
    email: string;
    dial_code: string;
    phone: string;
    address: string;
    website: string | null;
  }>,
): Promise<Result<Merchant>> {
  const result = await dltMutate<unknown>({
    method: 'PATCH',
    path: '/api/v1/portal/merchant',
    bearer: pat,
    body: fields,
  });
  if (!result.ok) return result;

  const parsed = merchantSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid merchant response' } };
  }
  return { ok: true, data: parsed.data };
}

const logoUrlSchema = z.object({ url: z.string().nullable() });
export type MerchantLogo = z.infer<typeof logoUrlSchema>;

export async function getMerchantLogo(pat: string): Promise<Result<MerchantLogo>> {
  const result = await dltGet<unknown>('/api/v1/portal/merchant/logo', pat);
  if (!result.ok) return result;
  const parsed = logoUrlSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid logo response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function uploadMerchantLogo(pat: string, file: File): Promise<Result<MerchantLogo>> {
  const formData = new FormData();
  formData.append('file', file);

  const result = await dltMutate<unknown>({
    method: 'POST',
    path: '/api/v1/portal/merchant/logo',
    bearer: pat,
    multipart: formData,
  });
  if (!result.ok) return result;
  const parsed = logoUrlSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid logo response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function deleteMerchantLogo(pat: string): Promise<Result<void>> {
  return dltMutate<void>({
    method: 'DELETE',
    path: '/api/v1/portal/merchant/logo',
    bearer: pat,
  });
}
