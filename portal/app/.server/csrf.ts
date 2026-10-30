import { randomBytes, timingSafeEqual } from 'node:crypto';

const CSRF_TOKEN_LENGTH = 32;

/** Generate a new CSRF token (hex string). */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/** Validate a submitted CSRF token against the session token. */
export function validateCsrfToken(submitted: string | null, session: string): boolean {
  if (!submitted || submitted.length !== session.length) return false;
  try {
    return timingSafeEqual(Buffer.from(submitted), Buffer.from(session));
  } catch {
    return false;
  }
}

/**
 * Check that the request origin matches our app origin (same-origin check).
 * Used as the first line of defense before CSRF token check.
 */
export function isSameOrigin(request: Request, appOrigin: string): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const origin = request.headers.get('Origin');
  if (origin) return origin === appOrigin;

  // Fallback: Sec-Fetch-Site
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  return fetchSite === 'same-origin' || fetchSite === 'none';
}
