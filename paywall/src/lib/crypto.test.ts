import { describe, it, expect } from 'vitest';
import { encryptJWE, decryptJWE, UnsupportedTokenVersionError } from './crypto';
import { base64url } from 'jose';

describe('JWE Crypto Core', () => {
  const secret1 = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
  const secret2 = base64url.encode(crypto.getRandomValues(new Uint8Array(32)));

  const payload = { test: 'data', amount: '100.00' };

  it('round-trips encrypt/decrypt with current secret', async () => {
    const token = await encryptJWE(payload, secret1);
    const decrypted = await decryptJWE(token, { current: secret1 });
    
    expect(decrypted.kid).toBe('CURRENT');
    expect(decrypted.payload.test).toBe(payload.test);
    expect(decrypted.payload.amount).toBe(payload.amount);
    expect(decrypted.payload.token_version).toBe(1);
  });

  it('kid rotation (encrypt with PREVIOUS, decrypt succeeds)', async () => {
    const token = await encryptJWE(payload, secret2, 'PREVIOUS');
    const decrypted = await decryptJWE(token, { current: secret1, previous: secret2 });
    
    expect(decrypted.kid).toBe('PREVIOUS');
    expect(decrypted.payload.test).toBe(payload.test);
  });

  it('wrong secret fails', async () => {
    const token = await encryptJWE(payload, secret1);
    await expect(decryptJWE(token, { current: secret2 })).rejects.toThrow('Failed to decrypt JWE');
  });

  it('tampered ciphertext fails', async () => {
    const token = await encryptJWE(payload, secret1);
    const tampered = token.slice(0, -5) + 'xxxxx';
    await expect(decryptJWE(tampered, { current: secret1 })).rejects.toThrow('Failed to decrypt JWE');
  });

  it('token_version mismatch throws UnsupportedTokenVersionError', async () => {
    // We would need to mock the version to test this properly, or create a token with a different version manually.
    // For now we assume the logic holds if we change the version inside encryptJWE.
    // Let's create a raw token with version 2
    const textEncoder = new TextEncoder();
    const payloadBytes = textEncoder.encode(JSON.stringify({ ...payload, token_version: 999 }));
    const { CompactEncrypt } = await import('jose');
    const token = await new CompactEncrypt(payloadBytes)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', kid: 'CURRENT' })
      .encrypt(base64url.decode(secret1));

    await expect(decryptJWE(token, { current: secret1 })).rejects.toThrow(UnsupportedTokenVersionError);
  });
});
