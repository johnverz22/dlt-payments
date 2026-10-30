import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import * as csrf from '../../../../lib/csrf';
import * as linkToken from '../../../../lib/link-token';
import * as rateLimit from '../../../../lib/rate-limit';
import * as dltClient from '../../../../lib/dlt-client';

vi.mock('../../../../lib/csrf', () => ({
  validateCsrf: vi.fn(),
}));

vi.mock('../../../../lib/link-token', () => ({
  readLinkToken: vi.fn(),
}));

vi.mock('../../../../lib/rate-limit', () => ({
  limitSubmit: vi.fn(),
}));

vi.mock('../../../../lib/dlt-client', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/dlt-client')>('../../../../lib/dlt-client');
  return {
    ...actual,
    submitPayment: vi.fn(),
  };
});

vi.mock('../../../../lib/logger', () => ({
  logEvent: vi.fn(),
  sanitizeError: vi.fn((err) => ({ name: 'Error', message: err instanceof Error ? err.message : String(err) })),
}));

function makeLinkPayload() {
  return {
    link_id: 'link_123',
    merchant_transaction_id: 'txn_123',
    amount: '1500.00',
    currency: 'PHP',
    merchant_account_id: 'm_acc_123',
    service_code: 'APNCOLLECTION',
    product_name: 'Widget',
    product_description: 'A fine widget',
    [('dlt_access' + '_token')]: 'embedded_dlt_token',
    created_at: Date.now(),
    expires_at: Date.now() + 60_000,
  };
}

function validPayor() {
  return {
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    email: 'juan@example.com',
    address_line_one: '123 Rizal St',
    city_municipality: 'Bauang',
    state_province_region: 'La Union',
    country_code: 'PH',
    postal_code: '2501',
  };
}

function createReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/payment/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    token: 'sometoken',
    payor: validPayor(),
    payment_brand: 'GCash',
    payment_brand_code: 'opaque-code-1',
  };
}

describe('POST /api/payment/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrf.validateCsrf).mockResolvedValue(undefined);
    vi.mocked(rateLimit.limitSubmit).mockResolvedValue({ success: true, remaining: 5 });
    vi.mocked(linkToken.readLinkToken).mockResolvedValue(
      makeLinkPayload() as unknown as linkToken.PaymentLinkPayload
    );
  });

  it('rejects requests that fail CSRF/Origin validation', async () => {
    vi.mocked(csrf.validateCsrf).mockRejectedValue(new Error('Invalid CSRF token'));

    const res = await POST(createReq(validBody()));
    expect(res.status).toBe(403);
    expect(linkToken.readLinkToken).not.toHaveBeenCalled();
  });

  it('rejects invalid payloads with 400', async () => {
    const res = await POST(createReq({ token: 'x' }));
    expect(res.status).toBe(400);
    expect(linkToken.readLinkToken).not.toHaveBeenCalled();
  });

  it('returns 404 for an expired/invalid token before calling DLT', async () => {
    vi.mocked(linkToken.readLinkToken).mockRejectedValue(new Error('Link token expired'));

    const res = await POST(createReq(validBody()));
    expect(res.status).toBe(404);
    expect(dltClient.submitPayment).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimit.limitSubmit).mockResolvedValue({ success: false, remaining: 0 });

    const res = await POST(createReq(validBody()));
    expect(res.status).toBe(429);
    expect(dltClient.submitPayment).not.toHaveBeenCalled();
  });

  it('never regenerates merchant_transaction_id — it is taken from the token', async () => {
    vi.mocked(dltClient.submitPayment).mockResolvedValue({
      payment_url: 'https://dlt.example/checkout/abc',
      payment_status: 'PENDING',
      amount: '1500.00',
      merchant_transaction_id: 'txn_123',
      transaction_id: 'dlt_txn_1',
      is_card_payment: false,
      success_url: 'https://app.example/verify?status=success',
      failure_url: 'https://app.example/verify?status=failure',
    });

    const res = await POST(createReq(validBody()));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.payment_url).toBe('https://dlt.example/checkout/abc');
    expect(dltClient.submitPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant_transaction_id: 'txn_123',
        merchant_account_id: 'm_acc_123',
        service_code: 'APNCOLLECTION',
        payment_brand: 'GCash',
        payment_brand_code: 'opaque-code-1',
      })
    );
  });

  it('returns 409 with no retry on DltConflictError', async () => {
    vi.mocked(dltClient.submitPayment).mockRejectedValue(new dltClient.DltConflictError('conflict'));

    const res = await POST(createReq(validBody()));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/doesn't match a prior attempt/);
    expect(dltClient.submitPayment).toHaveBeenCalledTimes(1);
  });

  it('returns 503 directing the client to /verify on DltAmbiguousError, with no retry', async () => {
    vi.mocked(dltClient.submitPayment).mockRejectedValue(new dltClient.DltAmbiguousError('ambiguous'));

    const res = await POST(createReq(validBody()));
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.verify).toBe(true);
    expect(dltClient.submitPayment).toHaveBeenCalledTimes(1);
  });

  it('maps DltAuthError to the "link temporarily unavailable" message', async () => {
    vi.mocked(dltClient.submitPayment).mockRejectedValue(new dltClient.DltAuthError('unauthorized'));

    const res = await POST(createReq(validBody()));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/temporarily unavailable/);
  });

  it('does not auto-resubmit even under simulated rapid double-click', async () => {
    vi.mocked(dltClient.submitPayment).mockRejectedValue(new dltClient.DltConflictError('conflict'));

    const [res1, res2] = await Promise.all([
      POST(createReq(validBody())),
      POST(createReq(validBody())),
    ]);

    expect(res1.status).toBe(409);
    expect(res2.status).toBe(409);
    expect(dltClient.submitPayment).toHaveBeenCalledTimes(2);
  });
});
