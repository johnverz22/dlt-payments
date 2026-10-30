import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAccessToken,
  getBrands,
  submitPayment,
  syncPayment,
  DltAuthError,
  DltRateLimitError,
  DltConflictError,
  DltAmbiguousError,
  DltValidationError,
  DltUnavailableError,
} from './dlt-client';

describe('dlt-client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, DLT_API_BASE_URL: 'https://checkout.dxp.dtic.com.ph' };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getAccessToken', () => {
    it('returns access_token on success', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token123', expires_in: 3600 }), { status: 200 }));
      const result = await getAccessToken({ client_id: 'client1', client_secret: 'secret1' });
      expect(result).toEqual({ access_token: 'token123', expires_in: 3600 });
    });

    it('throws DltAuthError on 401', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }));
      await expect(getAccessToken({ client_id: 'c', client_secret: 's' })).rejects.toThrow(DltAuthError);
    });
  });

  describe('getBrands', () => {
    it('returns brands', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([{ value: 'GCash', code: 'gc', image: null, is_card: false }]), { status: 200 }));
      const brands = await getBrands({ access_token: 't', merchant_account_id: 'm', service_code: 's' });
      expect(brands).toHaveLength(1);
    });
  });

  describe('submitPayment', () => {
    const payload = {
      merchant_account_id: 'm1',
      service_code: 's1',
      merchant_transaction_id: 'tx1',
      amount: '100.00',
      payment_brand: 'Visa',
      payment_brand_code: 'visa_code',
      product_name: 'Product 1',
      product_description: 'Desc',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      address_line_one: '123 Street',
      city_municipality: 'City',
      state_province_region: 'State',
      country_code: 'PH',
      postal_code: '1234',
      success_url: 'http://success',
      failure_url: 'http://fail',
    };

    it('succeeds and sends all required fields', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { payment_url: 'http://pay' } }), { status: 200 }));
      const result = await submitPayment({ access_token: 't', ...payload });
      expect(result.payment_url).toBe('http://pay');
      
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body).toMatchObject({
        ...payload,
        time_offset: '+08:00',
        channel: 4,
        currency: 'PHP',
      });
    });

    it('throws DltConflictError on 409', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Conflict' }), { status: 409 }));
      await expect(submitPayment({ access_token: 't', ...payload })).rejects.toThrow(DltConflictError);
    });

    it('throws DltAmbiguousError on 503', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Service Unavailable' }), { status: 503 }));
      await expect(submitPayment({ access_token: 't', ...payload })).rejects.toThrow(DltAmbiguousError);
    });

    it('throws DltRateLimitError on 429', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Too Many Requests' }), { status: 429 }));
      await expect(submitPayment({ access_token: 't', ...payload })).rejects.toThrow(DltRateLimitError);
    });

    it('throws DltValidationError on 200 with success:false', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: false, errors: ['bad field'] }), { status: 200 }));
      await expect(submitPayment({ access_token: 't', ...payload })).rejects.toThrow(DltValidationError);
    });
    
    it('throws DltUnavailableError on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      await expect(submitPayment({ access_token: 't', ...payload })).rejects.toThrow(DltUnavailableError);
    });
  });

  describe('syncPayment', () => {
    it('returns sync result', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { payment_status: 'PAID' } }), { status: 200 }));
      const result = await syncPayment({ access_token: 't', merchant_transaction_id: 'tx1' });
      expect(result.payment_status).toBe('PAID');
    });
  });
});
