export class DltError extends Error {
  constructor(message: string, public readonly status?: number, public readonly data?: unknown) {
    super(message);
    this.name = 'DltError';
  }
}

export class DltAuthError extends DltError {
  constructor(message: string, data?: unknown) {
    super(message, 401, data);
    this.name = 'DltAuthError';
  }
}

export class DltRateLimitError extends DltError {
  constructor(message: string, data?: unknown) {
    super(message, 429, data);
    this.name = 'DltRateLimitError';
  }
}

export class DltConflictError extends DltError {
  constructor(message: string, data?: unknown) {
    super(message, 409, data);
    this.name = 'DltConflictError';
  }
}

export class DltAmbiguousError extends DltError {
  constructor(message: string, data?: unknown) {
    super(message, 503, data);
    this.name = 'DltAmbiguousError';
  }
}

export class DltValidationError extends DltError {
  constructor(message: string, data?: unknown) {
    super(message, 400, data);
    this.name = 'DltValidationError';
  }
}

export class DltUnavailableError extends DltError {
  constructor(message: string, status?: number, data?: unknown) {
    super(message, status, data);
    this.name = 'DltUnavailableError';
  }
}

import { env } from './env';

const getBaseUrl = () => {
  return env.DLT_API_BASE_URL;
};

async function handleResponse(response: Response) {
  if (response.ok) {
    const data = await response.json();
    if (data.success === false) {
      if (data.errors) {
        throw new DltValidationError('DLT validation error: ' + JSON.stringify(data.errors), data);
      }
      throw new DltUnavailableError('DLT request failed: ' + data.message, response.status, data);
    }
    return data;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  const message = (data && data.message) ? data.message : `HTTP ${response.status}`;

  switch (response.status) {
    case 401:
    case 403:
      throw new DltAuthError(message, data);
    case 429:
      throw new DltRateLimitError(message, data);
    case 409:
      throw new DltConflictError(message, data);
    case 503:
      throw new DltAmbiguousError(message, data);
    default:
      if (response.status >= 500) {
        throw new DltUnavailableError(message, response.status, data);
      }
      if (data && data.errors) {
        throw new DltValidationError('DLT validation error: ' + JSON.stringify(data.errors), data);
      }
      throw new DltError(message, response.status, data);
  }
}

export async function getAccessToken({ client_id, client_secret }: { client_id: string; client_secret: string }) {
  try {
    const response = await fetch(`${getBaseUrl()}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id, client_secret }),
    });
    const data = await handleResponse(response);
    return { access_token: data.access_token, expires_in: data.expires_in };
  } catch (error) {
    if (error instanceof DltError) throw error;
    throw new DltUnavailableError(error instanceof Error ? error.message : String(error));
  }
}

export interface Brand {
  value: string;
  code: string;
  image: string | null;
  is_card: boolean;
}

export async function getBrands({ access_token, merchant_account_id, service_code }: { access_token: string; merchant_account_id: string; service_code: string }): Promise<Brand[]> {
  try {
    const url = new URL(`${getBaseUrl()}/api/v1/collection/apn/brands`);
    url.searchParams.set('merchant_account_id', merchant_account_id);
    url.searchParams.set('service_code', service_code);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    });
    // The response might be just an array directly or wrapped in data.
    // Based on the skill doc, it "Returns an array of brand objects". We'll assume the top level or data array.
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    if (error instanceof DltError) throw error;
    throw new DltUnavailableError(error instanceof Error ? error.message : String(error));
  }
}

export interface SubmitPayload {
  merchant_account_id: string;
  service_code: string;
  merchant_transaction_id: string;
  amount: string;
  payment_brand: string;
  payment_brand_code: string;
  product_name: string;
  product_description: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address_line_one: string;
  address_line_two?: string;
  city_municipality: string;
  state_province_region: string;
  country_code: string;
  postal_code: string;
  success_url: string;
  failure_url: string;
}

export interface SubmitResult {
  payment_url: string;
  payment_status: string;
  amount: string;
  merchant_transaction_id: string;
  transaction_id: string;
  is_card_payment: boolean;
  success_url: string;
  failure_url: string;
}

export async function submitPayment({ access_token, ...payload }: { access_token: string } & SubmitPayload): Promise<SubmitResult> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/v1/collection/apn/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        time_offset: '+08:00',
        channel: 4,
        currency: 'PHP',
      }),
    });
    const data = await handleResponse(response);
    return data.data;
  } catch (error) {
    if (error instanceof DltError) throw error;
    throw new DltUnavailableError(error instanceof Error ? error.message : String(error));
  }
}

export interface SyncResult {
  payment_status: string;
  provider_message?: string;
  timestamp?: string;
}

export async function syncPayment({ access_token, merchant_transaction_id }: { access_token: string; merchant_transaction_id: string }): Promise<SyncResult> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/v1/collection/apn/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ merchant_transaction_id }),
    });
    const data = await handleResponse(response);
    return data.data;
  } catch (error) {
    if (error instanceof DltError) throw error;
    throw new DltUnavailableError(error instanceof Error ? error.message : String(error));
  }
}
