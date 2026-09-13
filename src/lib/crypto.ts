import { CompactEncrypt, compactDecrypt, decodeProtectedHeader, base64url } from 'jose';

export class UnsupportedTokenVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedTokenVersionError';
  }
}

export const CURRENT_TOKEN_VERSION = 1;

export async function encryptJWE(
  payload: Record<string, unknown>,
  secretCurrentBase64: string,
  kid: string = 'CURRENT'
): Promise<string> {
  const secretBytes = base64url.decode(secretCurrentBase64);
  
  const fullPayload = {
    ...payload,
    token_version: CURRENT_TOKEN_VERSION,
  };
  
  const textEncoder = new TextEncoder();
  const payloadBytes = textEncoder.encode(JSON.stringify(fullPayload));

  return new CompactEncrypt(payloadBytes)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', kid })
    .encrypt(secretBytes);
}

export async function decryptJWE(
  token: string,
  secrets: { current: string; previous?: string }
): Promise<{ payload: Record<string, unknown>; kid: string }> {
  const header = decodeProtectedHeader(token);
  const kid = header.kid;

  let secretToTry: string;

  if (kid === 'CURRENT') {
    secretToTry = secrets.current;
  } else if (kid === 'PREVIOUS' && secrets.previous) {
    secretToTry = secrets.previous;
  } else {
    // If kid mismatch with CURRENT, fallback to PREVIOUS
    if (secrets.previous) {
      secretToTry = secrets.previous;
    } else {
      throw new Error(`Invalid kid: ${kid} and no previous secret available`);
    }
  }

  try {
    const secretBytes = base64url.decode(secretToTry);
    const { plaintext } = await compactDecrypt(token, secretBytes);
    
    const textDecoder = new TextDecoder();
    const payload = JSON.parse(textDecoder.decode(plaintext));

    if (payload.token_version !== CURRENT_TOKEN_VERSION) {
      throw new UnsupportedTokenVersionError(`Token version ${payload.token_version} is not supported.`);
    }

    return { payload, kid: kid || 'UNKNOWN' };
  } catch (error) {
    if (error instanceof UnsupportedTokenVersionError) {
      throw error;
    }
    // If kid was 'CURRENT' but it failed (maybe secret rotated but token still has kid 'CURRENT'), try previous as fallback
    if (secretToTry === secrets.current && secrets.previous) {
      try {
        const previousBytes = base64url.decode(secrets.previous);
        const { plaintext } = await compactDecrypt(token, previousBytes);
        const textDecoder = new TextDecoder();
        const payload = JSON.parse(textDecoder.decode(plaintext));
        
        if (payload.token_version !== CURRENT_TOKEN_VERSION) {
          throw new UnsupportedTokenVersionError(`Token version ${payload.token_version} is not supported.`);
        }
        
        return { payload, kid: kid || 'UNKNOWN' };
      } catch (innerError) {
        if (innerError instanceof UnsupportedTokenVersionError) {
          throw innerError;
        }
        throw new Error('Failed to decrypt JWE with both current and previous secrets');
      }
    }
    throw new Error('Failed to decrypt JWE');
  }
}
