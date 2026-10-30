import { z } from 'zod';

// === Auth ===

export const loginUserSchema = z.object({
  id: z.number(),
  reference_id: z.string(),
  merchant_reference_id: z.string(),
  merchant_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.number(),
  email: z.string(),
  email_verified_at: z.string().nullable(),
  created_at: z.string(),
});

export const loginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_at: z.string(),
  user: loginUserSchema,
});

// === Profile ===

export const userProfileSchema = z.object({
  id: z.number(),
  reference_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.enum(['administrator', 'developer']),
  username: z.string(),
  pending_email: z.string().nullable().optional(),
  pending_email_expires_at: z.string().nullable().optional(),
  email_verified_at: z.string().nullable(),
  is_active: z.boolean(),
  merchant: z.object({
    id: z.number(),
    reference_id: z.string(),
    name: z.string(),
  }),
});

// === Merchant ===

export const merchantServiceSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.string(),
  is_active: z.boolean(),
});

export const merchantSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_person: z.string().nullable(),
  email: z.string().nullable(),
  dial_code: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  website: z.string().nullable(),
  logo_url: z.string().nullable(),
  currency: z.string(),
  is_active: z.boolean(),
  services: z.array(merchantServiceSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

// === Transactions ===

export const transactionSchema = z.object({
  id: z.number(),
  merchant_transaction_id: z.string(),
  amount: z.string().nullable(),
  currency: z.string().nullable(),
  status: z.enum(['PAID', 'PENDING', 'REJECTED']),
  payment_brand: z.string().nullable(),
  payment_method: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  history_available: z.boolean(),
});

export const paginationMetaSchema = z.object({
  current_page: z.number(),
  per_page: z.number(),
  total: z.number(),
  last_page: z.number(),
});

export const transactionListSchema = z.object({
  data: z.array(transactionSchema),
  meta: paginationMetaSchema,
});

// === History ===

export const historyCoverageSchema = z.object({
  merchant_request: z.enum(['captured', 'not_captured', 'purged']),
  dlt_response: z.enum(['captured', 'not_captured', 'purged']),
  merchant_webhook_request: z.enum(['captured', 'not_captured', 'purged']),
  merchant_webhook_response: z.enum(['captured', 'not_captured', 'purged']),
});

export const historyDeliverySchema = z.object({
  state: z.string(),
  duration_ms: z.number().nullable(),
  body_capture_status: z.enum([
    'no_response',
    'empty',
    'omitted_oversize',
    'omitted_unsupported_content_type',
    'omitted_binary',
    'omitted_sensitive',
    'captured',
    'captured_sanitized',
    'captured_invalid_json_text',
  ]).nullable(),
});

// Synchronous DLT response metadata (only on dlt_response event type)
export const historyResponseSchema = z.object({
  is_repeated_request: z.boolean().nullable(),
  capture_stage: z.string().nullable(),
  body_capture_status: z.string().nullable(),
});

// Omission entries are objects with field_path and reason_code (not plain strings)
export const historyOmissionSchema = z.object({
  field_path: z.string(),
  reason_code: z.string(),
});

export type HistoryOmission = z.infer<typeof historyOmissionSchema>;

// JsonValue for payload/response (concrete type that survives serialization)
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const historyItemSchema = z.object({
  id: z.string(),
  transaction_id: z.number(),
  event_type: z.string(),
  direction: z.string(),
  captured_at: z.string(),
  capture_format: z.string(),
  capture_status: z.enum(['available', 'omitted', 'unavailable', 'purged']),
  event_id: z.string().nullable(),
  attempt_number: z.number().nullable(),
  http_status: z.number().nullable(),
  delivery: historyDeliverySchema.nullable(),
  response: historyResponseSchema.nullable(),
  payload: jsonValueSchema.nullable(),
  omissions: z.array(historyOmissionSchema),
  retain_until: z.string().nullable(),
  purged_at: z.string().nullable(),
});

// === Metrics ===

export const metricsSchema = z.object({
  currency: z.string(),
  timezone: z.string(),
  from: z.string(),
  to: z.string(),
  as_of: z.string(),
  date_basis: z.string(),
  collection_total: z.string(),
  transaction_count: z.number(),
  successful_count: z.number(),
  pending_count: z.number(),
  rejected_count: z.number(),
  success_rate_percent: z.string().nullable(),
});

export const chartBucketSchema = z.object({
  period: z.string(),
  from: z.string(),
  to: z.string(),
  partial: z.boolean(),
  collection_total: z.string(),
  transaction_count: z.number(),
  successful_count: z.number(),
  pending_count: z.number(),
  rejected_count: z.number(),
  success_rate_percent: z.string().nullable(),
});

export const chartsSchema = z.object({
  currency: z.string(),
  timezone: z.string(),
  from: z.string(),
  to: z.string(),
  as_of: z.string(),
  date_basis: z.string(),
  interval: z.enum(['day', 'month', 'year']),
  totals: z.object({
    collection_total: z.string(),
    transaction_count: z.number(),
    successful_count: z.number(),
    pending_count: z.number(),
    rejected_count: z.number(),
    success_rate_percent: z.string().nullable(),
  }),
  buckets: z.array(chartBucketSchema),
});

// === Team ===

export const teamMemberSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.enum(['administrator', 'developer']),
  is_active: z.boolean(),
  joined_at: z.string().nullable(),
});

export const teamInvitationSchema = z.object({
  id: z.string(), // UUID
  email: z.string(),
  role: z.enum(['administrator', 'developer']),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
  invited_by: z.number().optional(),
  sent: z.boolean().optional(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
});

// === Machine Clients ===

export const machineClientSchema = z.object({
  id: z.number(),
  label: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  rotation_deadline: z.string().nullable(),
  replaces: z.number().nullable(),
});

// === Integration Keys ===

export const integrationKeysSchema = z.object({
  has_authentication_token: z.boolean(),
  has_secret_key: z.boolean(),
  updated_at: z.string().nullable(),
});

// === Currency ===

export const currencyItemSchema = z.object({
  cc: z.string(),
  name: z.string(),
  symbol: z.string(),
});
