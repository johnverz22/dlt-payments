/**
 * Normalized DLT error. HTTP status is authoritative.
 * `errorCode` is the machine-readable code (absent on legacy/OAuth/public-reset shapes).
 */
export type DltError = {
  status: number;
  errorCode?: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: DltError };

/** Create a success result */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/** Create an error result */
export function err<T>(error: DltError): Result<T> {
  return { ok: false, error };
}

/** Check if a DLT error indicates the session is invalid (needs re-login) */
export function isSessionInvalid(error: DltError): boolean {
  return (
    error.status === 401 &&
    error.errorCode !== 'INVALID_CREDENTIALS'
  );
}
