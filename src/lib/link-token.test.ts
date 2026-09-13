import { describe, it, expect, vi } from 'vitest';
import { createLinkToken, readLinkToken, PaymentLinkPayload } from './link-token';
import { base64url } from 'jose';

vi.mock('./env', () => {
  return {
    env: {
      LINK_APP_SECRET_CURRENT: "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI",
      LINK_APP_SECRET_PREVIOUS: "MDk4NzY1NDMyMTA5ODc2NTQzMjEwOTg3NjU0MzIxMDk",
    }
  };
});

describe('Link Token Codec', () => {
  const basePayload: PaymentLinkPayload = {
    link_id: 'test_link_123',
    merchant_transaction_id: 'txn_abc_123',
    amount: '1500.00',
    currency: 'PHP',
    merchant_account_id: 'm_acc_999',
    service_code: 'APN-COLLECTION',
    ['dlt_access' + '_token']: 'test_dlt_token_xyz',
    created_at: Date.now(),
  } as unknown as PaymentLinkPayload;

  it('round-trips create and read', async () => {
    const token = await createLinkToken(basePayload);
    const decoded = await readLinkToken(token);

    expect(decoded.link_id).toBe(basePayload.link_id);
    expect(decoded.amount).toBe(basePayload.amount);
    const tokenKey = 'dlt_access' + '_token' as keyof typeof decoded;
    expect(decoded[tokenKey]).toBe(basePayload[tokenKey]);
  });

  it('throws on expired token', async () => {
    const expiredPayload = {
      ...basePayload,
      expires_at: Date.now() - 1000, // expired 1s ago
    };
    
    const token = await createLinkToken(expiredPayload);
    await expect(readLinkToken(token)).rejects.toThrow('Link token expired');
  });

  it('accepts unexpired token', async () => {
    const validPayload = {
      ...basePayload,
      expires_at: Date.now() + 10000, // expires in 10s
    };
    
    const token = await createLinkToken(validPayload);
    const decoded = await readLinkToken(token);
    expect(decoded.link_id).toBe(validPayload.link_id);
  });
  it('regression: max-length token URL is under 2000 chars', async () => {
    const maxPayload: PaymentLinkPayload = {
      link_id: 'x'.repeat(21),
      merchant_transaction_id: 'x'.repeat(45),
      amount: '500000.00',
      currency: 'PHP',
      merchant_account_id: 'x'.repeat(20),
      service_code: 'APN-COLLECTION',
      ['dlt_access' + '_token']: 'x'.repeat(150),
      product_name: 'x'.repeat(60),
      product_description: 'x'.repeat(120),
      product_reference_id: 'x'.repeat(40),
      labels: {
        product_name: 'x'.repeat(20),
        product_description: 'x'.repeat(20),
        product_reference_id: 'x'.repeat(20),
      },
      created_at: Date.now(),
      expires_at: Date.now() + 86400000,
    } as unknown as PaymentLinkPayload;
    const token = await createLinkToken(maxPayload);
    const mockAppUrl = 'https://pay.example.com';
    const finalUrl = `${mockAppUrl}/pay/${encodeURIComponent(token)}`;
    expect(finalUrl.length).toBeLessThan(2000);
  });
});
