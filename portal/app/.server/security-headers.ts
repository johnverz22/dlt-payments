/**
 * Security response headers applied to every response.
 */
export function getSecurityHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy': [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: https:`,
      `connect-src 'self'`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

/** No-store cache control for authenticated responses */
export function noCacheHeaders(): Record<string, string> {
  return { 'Cache-Control': 'no-store, max-age=0' };
}
