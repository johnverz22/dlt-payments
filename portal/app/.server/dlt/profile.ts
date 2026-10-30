import { dltGet, dltMutate } from './client';
import type { Result } from './errors';
import { userProfileSchema } from './schemas';
import { z } from 'zod';

export type UserProfile = z.infer<typeof userProfileSchema>;

export async function getProfile(pat: string): Promise<Result<UserProfile>> {
  const result = await dltGet<unknown>('/api/v1/portal/me', pat);
  if (!result.ok) return result;
  const parsed = userProfileSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid profile response' } };
  }
  return { ok: true, data: parsed.data };
}

export async function patchProfile(
  pat: string,
  fields: Partial<{ first_name: string; last_name: string; email: string }>,
): Promise<Result<UserProfile>> {
  const result = await dltMutate<unknown>({
    method: 'PATCH',
    path: '/api/v1/portal/me',
    bearer: pat,
    body: fields,
  });
  if (!result.ok) return result;
  const parsed = userProfileSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Invalid profile response' } };
  }
  return { ok: true, data: parsed.data };
}

const otpResponseSchema = z.object({ message: z.string().optional() });

export async function verifyEmailOtp(
  pat: string,
  otp: string,
): Promise<Result<{ message?: string }>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: '/api/v1/portal/me/email/verify',
    bearer: pat,
    body: { otp },
  });
  if (!result.ok) return result;
  const parsed = otpResponseSchema.safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}

export async function resendEmailOtp(pat: string): Promise<Result<{ message?: string }>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: '/api/v1/portal/me/email/resend',
    bearer: pat,
    body: {},
  });
  if (!result.ok) return result;
  const parsed = otpResponseSchema.safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}

export async function changePassword(
  pat: string,
  body: { current_password: string; password: string; password_confirmation: string },
): Promise<Result<{ reauthentication_required?: boolean }>> {
  const result = await dltMutate<unknown>({
    method: 'PUT',
    path: '/api/v1/portal/me/password',
    bearer: pat,
    body,
  });
  if (!result.ok) return result;
  const parsed = z.object({ reauthentication_required: z.boolean().optional() }).safeParse(result.data ?? {});
  return { ok: true, data: parsed.success ? parsed.data : {} };
}
