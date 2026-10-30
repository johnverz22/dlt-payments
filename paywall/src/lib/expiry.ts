export function isTokenExpired(payload: { expires_at?: number }): boolean {
  if (payload.expires_at === undefined) {
    return false;
  }
  return Date.now() >= payload.expires_at;
}
