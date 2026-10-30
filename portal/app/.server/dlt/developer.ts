import { dltGet, dltMutate } from './client';
import { type Result } from './errors';
import { machineClientSchema, integrationKeysSchema, paginationMetaSchema } from './schemas';
import { z } from 'zod';
import { env } from '~/.server/env';
import { logger } from '~/.server/logger';

// ─── Extended schemas ───────────────────────────────────────────────────────

// The list endpoint includes delivery (available briefly for the issuing admin)
// and the numeric oauth_client_id field.
const machineClientWithDeliverySchema = machineClientSchema.extend({
  oauth_client_id: z.number().nullable().optional(),
  delivery: z
    .object({
      id: z.string().uuid(),
      expires_at: z.string(),
    })
    .nullable()
    .optional(),
});

const machineClientListSchema = z.object({
  data: z.array(machineClientWithDeliverySchema),
  meta: paginationMetaSchema,
});

const credentialPayloadSchema = z.object({
  oauth_client_id: z.number(),
  oauth_client_secret: z.string(),
  grant_type: z.literal('client_credentials'),
  token_url: z.string(),
});

const issueResponseSchema = z.object({
  client: machineClientSchema,
  delivery: z.object({
    id: z.string().uuid(),
    expires_at: z.string(),
  }),
});

// ─── Public types ───────────────────────────────────────────────────────────

export type MachineClient = z.infer<typeof machineClientWithDeliverySchema>;
export type IntegrationKeys = z.infer<typeof integrationKeysSchema>;
export type CredentialPayload = z.infer<typeof credentialPayloadSchema>;
export type MachineClientList = z.infer<typeof machineClientListSchema>;

// ─── Internal paginated GET (copied pattern from team.ts) ───────────────────

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
        let errorBody: {
          error_code?: string;
          message?: string;
          errors?: Record<string, string[]>;
        } = {};
        try {
          errorBody = await response.json();
        } catch {
          /* ignore */
        }

        const dltErr = {
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

// ─── Machine Client functions ───────────────────────────────────────────────

/**
 * GET /api/v1/portal/merchant/machine-clients
 * Both roles can list. Includes `delivery` for the issuing admin within 5 min.
 */
export async function listMachineClients(
  pat: string,
  params: { page?: number; per_page?: number } = {},
): Promise<Result<MachineClientList>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));

  const path = `/api/v1/portal/merchant/machine-clients?${qs.toString()}`;
  return dltGetPaginated<MachineClient>(path, pat, machineClientListSchema);
}

/**
 * POST /api/v1/portal/merchant/machine-clients
 * Admin only. Returns 201 with { client, delivery }.
 */
export async function issueMachineClient(
  pat: string,
  payload: { label: string; reason: string; current_password: string },
): Promise<Result<{ client: z.infer<typeof machineClientSchema>; delivery: { id: string; expires_at: string } }>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: '/api/v1/portal/merchant/machine-clients',
    bearer: pat,
    body: payload,
  });
  if (!result.ok) return result;

  const parsed = issueResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * POST /api/v1/portal/merchant/machine-clients/{clientId}/rotate
 * Admin only. Returns 201 with { client, delivery }.
 * 409 if already has a pending rotation.
 */
export async function rotateMachineClient(
  pat: string,
  clientId: number,
  payload: {
    label: string;
    reason: string;
    current_password: string;
    overlap_minutes?: number;
  },
): Promise<Result<{ client: z.infer<typeof machineClientSchema>; delivery: { id: string; expires_at: string } }>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: `/api/v1/portal/merchant/machine-clients/${clientId}/rotate`,
    bearer: pat,
    body: payload,
  });
  if (!result.ok) return result;

  const parsed = issueResponseSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * POST /api/v1/portal/merchant/machine-clients/{clientId}/revoke
 * Admin only. Returns 200 with the revoked client metadata.
 * 409 if already revoked.
 */
export async function revokeMachineClient(
  pat: string,
  clientId: number,
  payload: { reason: string; current_password: string },
): Promise<Result<z.infer<typeof machineClientSchema>>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: `/api/v1/portal/merchant/machine-clients/${clientId}/revoke`,
    bearer: pat,
    body: payload,
  });
  if (!result.ok) return result;

  const parsed = machineClientSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * POST /api/v1/portal/merchant/credential-deliveries/{deliveryId}/consume
 * Admin only (issuing admin). One-use. 410 if expired/consumed.
 * The returned secret must NEVER be stored persistently.
 */
export async function consumeCredentialDelivery(
  pat: string,
  deliveryId: string,
  payload: { current_password: string },
): Promise<Result<CredentialPayload>> {
  const result = await dltMutate<unknown>({
    method: 'POST',
    path: `/api/v1/portal/merchant/credential-deliveries/${deliveryId}/consume`,
    bearer: pat,
    body: payload,
  });
  if (!result.ok) return result;

  const parsed = credentialPayloadSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

// ─── Integration Key functions ──────────────────────────────────────────────

/**
 * GET /api/v1/portal/merchant/integration-keys
 * Both roles. Returns presence flags only — values are never readable.
 */
export async function getIntegrationKeys(pat: string): Promise<Result<IntegrationKeys>> {
  const result = await dltGet<unknown>(
    '/api/v1/portal/merchant/integration-keys',
    pat,
  );
  if (!result.ok) return result;

  const parsed = integrationKeysSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * PUT /api/v1/portal/merchant/integration-keys/{keyType}
 * Admin only. Returns updated IntegrationKeys.
 */
export async function putIntegrationKey(
  pat: string,
  keyType: 'authentication_token' | 'secret_key',
  payload: { value: string; current_password: string; reason: string },
): Promise<Result<IntegrationKeys>> {
  const result = await dltMutate<unknown>({
    method: 'PUT',
    path: `/api/v1/portal/merchant/integration-keys/${keyType}`,
    bearer: pat,
    body: payload,
  });
  if (!result.ok) return result;

  const parsed = integrationKeysSchema.safeParse(result.data);
  if (!parsed.success) {
    return { ok: false, error: { status: 0, message: 'Unexpected response shape from DLT' } };
  }
  return { ok: true, data: parsed.data };
}

/**
 * DELETE /api/v1/portal/merchant/integration-keys/{keyType}
 * Admin only. Requires JSON body with reason + current_password.
 * Returns 204 → ok(undefined).
 */
export async function deleteIntegrationKey(
  pat: string,
  keyType: 'authentication_token' | 'secret_key',
  payload: { current_password: string; reason: string },
): Promise<Result<void>> {
  return dltMutate<void>({
    method: 'DELETE',
    path: `/api/v1/portal/merchant/integration-keys/${keyType}`,
    bearer: pat,
    body: payload,
  });
}
