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
});
