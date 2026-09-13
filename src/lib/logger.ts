export interface AllowlistedFields {
  link_id?: string;
  merchant_transaction_id?: string;
  merchant_account_id?: string;
  status?: string;
  created_at?: number;
  expires_at?: number;
  request_time?: number;
  method?: string;
  path?: string;
  response_status?: number;
  error_name?: string;
  error_message?: string;
  error_code?: string | number;
}

export function logEvent(eventName: string, fields: AllowlistedFields) {
  // In a real app, this would use a structured logger like Pino
  console.log(JSON.stringify({ eventName, ...fields }));
}

export function sanitizeError(err: unknown): { name: string; message: string; code?: string | number } {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      code: (err as { code?: string | number }).code
    };
  }
  return {
    name: 'UnknownError',
    message: String(err)
  };
}
