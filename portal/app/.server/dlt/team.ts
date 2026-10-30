import { dltMutate, dltLoginCall } from './client';
import { type DltError, type Result } from './errors';
import {
  teamMemberSchema,
  teamInvitationSchema,
  paginationMetaSchema,
} from './schemas';
import { z } from 'zod';
import { env } from '~/.server/env';
import { logger } from '~/.server/logger';

// === Paginated response wrappers ===

const teamMemberListSchema = z.object({
  data: z.array(teamMemberSchema),
  meta: paginationMetaSchema,
});

const teamInvitationListSchema = z.object({
  data: z.array(teamInvitationSchema),
  meta: paginationMetaSchema,
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamInvitation = z.infer<typeof teamInvitationSchema>;
export type TeamMemberList = z.infer<typeof teamMemberListSchema>;
export type TeamInvitationList = z.infer<typeof teamInvitationListSchema>;

// === Internal helper for paginated GET responses ===
//
// dltGet() from client.ts returns json.data (the array), losing the meta.
// These endpoints need both data[] and meta pagination, so we use a dedicated
// paginated fetch with retry that preserves the full envelope.

const DEFAULT_READ_TIMEOUT_MS = 10_000;
const MAX_READ_RETRIES = 2;

async function dltGetPaginated<T>(
  path: string,
  bearer: string,
  schema: z.ZodType<{ data: T[]; meta: z.infer<typeof paginationMetaSchema> }>,
): Promise<Result<{ data: T[]; meta: z.infer<typeof paginationMetaSchema> }>> {
  const url = new URL(path, env.DLT_ORIGIN);

  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_READ_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearer}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        let errorBody: { error_code?: string; message?: string; errors?: Record<string, string[]> } = {};
        try {
          errorBody = await response.json();
        } catch {
          /* ignore parse failure */
        }
        const dltErr: DltError = {
          status: response.status,
          errorCode: errorBody.error_code,
          message: errorBody.message ?? `DLT error ${response.status}`,
          fieldErrors: errorBody.errors,
          retryAfterSeconds:
            retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : undefined,
        };

        const isRetryable = [502, 503, 504].includes(response.status);
        if (!isRetryable || attempt === MAX_READ_RETRIES) {
          return { ok: false, error: dltErr };
        }
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const json = await response.json();
      // Paginated envelope: { success, message, data: [...], meta: {...} }
      const parsed = schema.safeParse({ data: json.data, meta: json.meta });
      if (!parsed.success) {
        logger.error('DLT paginated response schema mismatch', {
          path,
          issues: parsed.error.issues,
        });
        return {
          ok: false,
          error: { status: 0, message: 'Unexpected response shape from DLT' },
        };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      clearTimeout(timer);
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const message = isAbort
        ? `DLT request timed out after ${DEFAULT_READ_TIMEOUT_MS}ms`
        : `DLT network error: ${error instanceof Error ? error.message : 'unknown'}`;
      logger.error(message, { path });

      if (attempt === MAX_READ_RETRIES) {
        return { ok: false, error: { status: 0, message } };
      }
      const delay = Math.pow(2, attempt) * 500 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return { ok: false, error: { status: 0, message: 'Exhausted retries' } };
}

// === Members ===

/**
 * GET /api/v1/portal/team/members
 * Both roles can list members.
 */
export async function getMembers(
  pat: string,
  params: { page?: number; per_page?: number } = {},
): Promise<Result<TeamMemberList>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));

  const path = `/api/v1/portal/team/members?${qs.toString()}`;
  return dltGetPaginated<TeamMember>(path, pat, teamMemberListSchema);
}

/**
 * PATCH /api/v1/portal/team/members/{member}/role
 * Admin only. Returns updated member.
 */
export async function updateMemberRole(
  pat: string,
  memberId: number,
  role: 'administrator' | 'developer',
): Promise<Result<TeamMember>> {
  const result = await dltMutate<TeamMember>({
    method: 'PATCH',
    path: `/api/v1/portal/team/members/${memberId}/role`,
    bearer: pat,
    body: { role },
  });
  if (!result.ok) return result;
  const parsed = teamMemberSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * DELETE /api/v1/portal/team/members/{member}
 * Admin only. Returns 204 (no body).
 */
export async function removeMember(
  pat: string,
  memberId: number,
): Promise<Result<void>> {
  return dltMutate<void>({
    method: 'DELETE',
    path: `/api/v1/portal/team/members/${memberId}`,
    bearer: pat,
  });
}

// === Invitations ===

/**
 * GET /api/v1/portal/team/invitations
 * Admin only. Optional status filter.
 */
export async function getInvitations(
  pat: string,
  params: {
    page?: number;
    per_page?: number;
    status?: 'pending' | 'accepted' | 'expired' | 'revoked';
  } = {},
): Promise<Result<TeamInvitationList>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.status) qs.set('status', params.status);

  const path = `/api/v1/portal/team/invitations?${qs.toString()}`;
  return dltGetPaginated<TeamInvitation>(path, pat, teamInvitationListSchema);
}

/**
 * POST /api/v1/portal/team/invitations
 * Admin only. Returns 201 + invitation (including sent flag).
 */
export async function createInvitation(
  pat: string,
  email: string,
  role: 'administrator' | 'developer',
): Promise<Result<TeamInvitation>> {
  const result = await dltMutate<TeamInvitation>({
    method: 'POST',
    path: '/api/v1/portal/team/invitations',
    bearer: pat,
    body: { email, role },
  });
  if (!result.ok) return result;
  const parsed = teamInvitationSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * POST /api/v1/portal/team/invitations/{invitation}/resend
 * Admin only. No request body.
 */
export async function resendInvitation(
  pat: string,
  invitationId: string,
): Promise<Result<TeamInvitation>> {
  const result = await dltMutate<TeamInvitation>({
    method: 'POST',
    path: `/api/v1/portal/team/invitations/${invitationId}/resend`,
    bearer: pat,
  });
  if (!result.ok) return result;
  const parsed = teamInvitationSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * DELETE /api/v1/portal/team/invitations/{invitation}
 * Admin only. Returns 204. Repeated revocation also returns 204 (idempotent).
 */
export async function revokeInvitation(
  pat: string,
  invitationId: string,
): Promise<Result<void>> {
  return dltMutate<void>({
    method: 'DELETE',
    path: `/api/v1/portal/team/invitations/${invitationId}`,
    bearer: pat,
  });
}

// === Invitation acceptance ===

/**
 * POST /api/v1/portal/team/invitations/accept
 * Uses Basic auth (portal client credentials), NOT Bearer.
 * The server determines new vs existing account from the token's email.
 * No PAT is returned on success.
 */
export type AcceptInvitationPayload =
  | {
      token: string;
      first_name: string;
      last_name: string;
      password: string;
      password_confirmation: string;
    }
  | {
      token: string;
      current_password: string;
    };

export async function acceptInvitation(
  payload: AcceptInvitationPayload,
): Promise<Result<TeamMember>> {
  const result = await dltLoginCall<TeamMember>(
    '/api/v1/portal/team/invitations/accept',
    payload,
  );
  if (!result.ok) return result;
  const parsed = teamMemberSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}
