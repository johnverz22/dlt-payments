import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import * as csrf from '../../../../lib/csrf';
import * as linkToken from '../../../../lib/link-token';
import * as rateLimit from '../../../../lib/rate-limit';
import * as dltClient from '../../../../lib/dlt-client';

vi.mock('../../../../lib/csrf', () => ({
  validateOrigin: vi.fn(),
}));

vi.mock('../../../../lib/link-token', () => ({
  readLinkToken: vi.fn(),
}));

vi.mock('../../../../lib/rate-limit', () => ({
  limitBrands: vi.fn(),
}));

vi.mock('../../../../lib/dlt-client', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/dlt-client')>('../../../../lib/dlt-client');
  return {
    ...actual,
    getBrands: vi.fn(),
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
    [('dlt_access' + '_token')]: 'embedded_dlt_token',
    created_at: Date.now(),
    expires_at: Date.now() + 60_000,
  };
}

function createReq(token?: string) {
  const url = token
    ? `http://localhost:3000/api/payment/brands?token=${encodeURIComponent(token)}`
    : 'http://localhost:3000/api/payment/brands';
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/payment/brands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrf.validateOrigin).mockImplementation(() => {});
    vi.mocked(rateLimit.limitBrands).mockResolvedValue({ success: true, remaining: 10 });
  });

  it('rejects requests with a bad Origin/Referer', async () => {
    vi.mocked(csrf.validateOrigin).mockImplementation(() => {
      throw new Error('Invalid Origin');
    });

    const res = await GET(createReq('sometoken'));
    expect(res.status).toBe(403);
    expect(linkToken.readLinkToken).not.toHaveBeenCalled();
  });

  it('returns 400 when token is missing', async () => {
    const res = await GET(createReq());
    expect(res.status).toBe(400);
  });

  it('returns 404 for an expired/invalid token before calling DLT', async () => {
    vi.mocked(linkToken.readLinkToken).mockRejectedValue(new Error('Link token expired'));

    const res = await GET(createReq('badtoken'));
    expect(res.status).toBe(404);
    expect(dltClient.getBrands).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(linkToken.readLinkToken).mockResolvedValue(makeLinkPayload() as unknown as linkToken.PaymentLinkPayload);
    vi.mocked(rateLimit.limitBrands).mockResolvedValue({ success: false, remaining: 0 });

    const res = await GET(createReq('goodtoken'));
    expect(res.status).toBe(429);
    expect(dltClient.getBrands).not.toHaveBeenCalled();
  });

  it('passes brand codes through byte-for-byte on success', async () => {
    vi.mocked(linkToken.readLinkToken).mockResolvedValue(makeLinkPayload() as unknown as linkToken.PaymentLinkPayload);
    const brands = [
      { value: 'GCash', code: 'opaque-code-1', image: 'https://x/gcash.png', is_card: false },
      { value: 'Visa', code: 'opaque-code-2', image: null, is_card: true },
    ];
    vi.mocked(dltClient.getBrands).mockResolvedValue(brands);

    const res = await GET(createReq('goodtoken'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(brands);
    expect(dltClient.getBrands).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant_account_id: 'm_acc_123',
        service_code: 'APNCOLLECTION',
      })
    );
  });

  it('maps a DLT 401 to the "link temporarily unavailable" message', async () => {
    vi.mocked(linkToken.readLinkToken).mockResolvedValue(makeLinkPayload() as unknown as linkToken.PaymentLinkPayload);
    vi.mocked(dltClient.getBrands).mockRejectedValue(new dltClient.DltAuthError('Unauthorized'));

    const res = await GET(createReq('goodtoken'));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/temporarily unavailable/);
  });

  it('maps other DLT failures to a generic 502', async () => {
    vi.mocked(linkToken.readLinkToken).mockResolvedValue(makeLinkPayload() as unknown as linkToken.PaymentLinkPayload);
    vi.mocked(dltClient.getBrands).mockRejectedValue(new dltClient.DltUnavailableError('down', 503));

    const res = await GET(createReq('goodtoken'));
    expect(res.status).toBe(502);
  });
});
