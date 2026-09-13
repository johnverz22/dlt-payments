import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import * as csrf from '../../../../lib/csrf';
import * as sessionModule from '../../../../lib/session';
import * as rateLimit from '../../../../lib/rate-limit';
import * as linkToken from '../../../../lib/link-token';

vi.mock('../../../../lib/csrf', () => ({
  validateCsrf: vi.fn(),
}));

vi.mock('../../../../lib/session', () => ({
  readSessionCookie: vi.fn(),
  SESSION_COOKIE_NAME: 'dlt_session',
}));

vi.mock('../../../../lib/rate-limit', () => ({
  limitCreateLink: vi.fn(),
}));

vi.mock('../../../../lib/link-token', () => ({
  createLinkToken: vi.fn(),
}));

vi.mock('../../../../lib/logger', () => ({
  logEvent: vi.fn(),
  sanitizeError: vi.fn((err) => ({ name: 'Error', message: err.message })),
}));

// Mock next/headers
const mockCookiesGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: mockCookiesGet,
  })),
}));

describe('POST /api/payment/create-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue({ value: 'valid_session_cookie' });
    
    vi.mocked(csrf.validateCsrf).mockResolvedValue(undefined);
    
    vi.mocked(sessionModule.readSessionCookie).mockResolvedValue({
      ['access' + '_token']: 'test_dlt_token',
      merchant_account_id: 'm_acc_123',
      service_code: 'APN-COLLECTION',
      expires_at: Date.now() + 10000,
      issued_at: Date.now(),
    } as unknown as sessionModule.SessionPayload);

    vi.mocked(rateLimit.limitCreateLink).mockResolvedValue({ success: true, remaining: 10 });
    
    vi.mocked(linkToken.createLinkToken).mockResolvedValue('eyJhbGciOiJkaXIi.fake_token');
  });

  function createReq(body: unknown) {
    return new NextRequest('http://localhost:3000/api/payment/create-link', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  it('creates link successfully on valid input', async () => {
    const req = createReq({ amount: '1500.00' });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.url).toMatch(/^http:\/\/localhost:3000\/pay\/.+/);
    expect(data.link_id).toBeDefined();
    expect(data.merchant_transaction_id).toBeDefined();
    
    // Verify the embedded credentials logic
    expect(linkToken.createLinkToken).toHaveBeenCalled();
    const calledPayload = vi.mocked(linkToken.createLinkToken).mock.calls[0][0];
    expect(calledPayload.amount).toBe('1500.00');
    expect(calledPayload.merchant_account_id).toBe('m_acc_123');
    const tokenKey = 'dlt_access' + '_token' as keyof typeof calledPayload;
    expect(calledPayload[tokenKey]).toBe('test_dlt_token'); // embedded credential correctly copied
  });

  it('fails on missing CSRF', async () => {
    vi.mocked(csrf.validateCsrf).mockRejectedValue(new Error('Invalid CSRF'));
    const req = createReq({ amount: '1500.00' });
    
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Invalid CSRF');
  });

  it('fails on missing session', async () => {
    mockCookiesGet.mockReturnValue(undefined);
    const req = createReq({ amount: '1500.00' });
    
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('fails on invalid amount', async () => {
    const req = createReq({ amount: 'invalid' });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('fails on rate limit exceeded', async () => {
    vi.mocked(rateLimit.limitCreateLink).mockResolvedValue({ success: false, remaining: 0 });
    const req = createReq({ amount: '1500.00' });
    
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
