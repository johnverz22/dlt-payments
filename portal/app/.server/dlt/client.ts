import { env } from '~/.server/env';
import { type DltError, type Result, ok, err } from './errors';
import { logger } from '~/.server/logger';

const DEFAULT_READ_TIMEOUT_MS = 10_000;
const DEFAULT_MUTATION_TIMEOUT_MS = 15_000;
const MAX_READ_RETRIES = 2;

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  bearer?: string;
  body?: unknown;
  multipart?: FormData;
  timeoutMs?: number;
};

/**
 * Parse a DLT response into a normalized error.
 * Handles both Portal envelope (with error_code) and legacy shapes.
 */
async function parseDltError(response: Response): Promise<DltError> {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

  try {
    const body = await response.json();
    return {
      status: response.status,
      errorCode: body.error_code ?? undefined,
      message: body.message ?? `DLT error ${response.status}`,
      fieldErrors: body.errors ?? undefined,
      retryAfterSeconds:
        retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : undefined,
    };
  } catch {
    return {
      status: response.status,
      message: `DLT error ${response.status}`,
      retryAfterSeconds:
        retryAfterSeconds && !isNaN(retryAfterSeconds) ? retryAfterSeconds : undefined,
    };
  }
}

/**
 * Perform a single DLT API request.
 */
async function dltFetch<T>(options: RequestOptions): Promise<Result<T>> {
  const { method, path, bearer, body, multipart, timeoutMs } = options;
  const url = new URL(path, env.DLT_ORIGIN);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (bearer) {
    headers['Authorization'] = `Bearer ${bearer}`;
  }

  let fetchBody: BodyInit | undefined;

  if (multipart) {
    fetchBody = multipart;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const timeout = timeoutMs ?? (method === 'GET' ? DEFAULT_READ_TIMEOUT_MS : DEFAULT_MUTATION_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: fetchBody,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 204) {
      return ok(undefined as T);
    }

    if (!response.ok) {
      return err<T>(await parseDltError(response));
    }

    const json = await response.json();
    return ok(json.data as T);
  } catch (error) {
    clearTimeout(timer);
    const message =
      error instanceof DOMException && error.name === 'AbortError'
        ? `DLT request timed out after ${timeout}ms`
        : `DLT network error: ${error instanceof Error ? error.message : 'unknown'}`;

    logger.error(message, { method, path: path.replace(/\/\d+/g, '/:id') });
    return err<T>({ status: 0, message });
  }
}

/**
 * GET with bounded retry (reads only).
 * Up to 2 retries with exponential backoff + jitter on network errors, 502/503/504.
 * Never retries 4xx.
 *
 * Returns only `json.data` (the inner payload). For paginated endpoints that also
 * need the top-level `meta` field, use `dltGetEnvelope` instead.
 */
export async function dltGet<T>(path: string, bearer: string): Promise<Result<T>> {
  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    const result = await dltFetch<T>({ method: 'GET', path, bearer });

    if (result.ok) return result;

    const { status } = result.error;
    const isRetryable = status === 0 || status === 502 || status === 503 || status === 504;

    if (!isRetryable || attempt === MAX_READ_RETRIES) return result;

    const baseDelay = Math.pow(2, attempt) * 500;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }

  // Unreachable but TypeScript needs it
  return err<T>({ status: 0, message: 'Exhausted retries' });
}

/**
 * Like `dltGet` but returns the **full** parsed JSON body instead of just
 * `json.data`. Use this for paginated list endpoints where the top-level
 * `meta` object sits alongside `data` in the envelope.
 */
export async function dltGetEnvelope<T>(path: string, bearer: string): Promise<Result<T>> {
  const url = new URL(path, env.DLT_ORIGIN);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${bearer}`,
  };

  for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_READ_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const dltErr = await parseDltError(response);
        const isRetryable =
          dltErr.status === 0 || dltErr.status === 502 || dltErr.status === 503 || dltErr.status === 504;
        if (!isRetryable || attempt === MAX_READ_RETRIES) return err<T>(dltErr);
      } else {
        const json = await response.json();
        return ok(json as T);
      }
    } catch (error) {
      clearTimeout(timer);
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? `DLT request timed out after ${DEFAULT_READ_TIMEOUT_MS}ms`
          : `DLT network error: ${error instanceof Error ? error.message : 'unknown'}`;
      logger.error(message, { method: 'GET', path: path.replace(/\/\d+/g, '/:id') });

      if (attempt === MAX_READ_RETRIES) return err<T>({ status: 0, message });
    }

    const baseDelay = Math.pow(2, attempt) * 500;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, baseDelay + jitter));
  }

  return err<T>({ status: 0, message: 'Exhausted retries' });
}

/**
 * POST/PUT/PATCH/DELETE — mutations are never auto-retried.
 */
export async function dltMutate<T>(options: Omit<RequestOptions, 'timeoutMs'>): Promise<Result<T>> {
  return dltFetch<T>(options);
}

/**
 * Login-specific call using Basic auth + X-DLT-Application.
 */
export async function dltLoginCall<T>(
  path: string,
  body: unknown,
): Promise<Result<T>> {
  const credentials = Buffer.from(
    `${env.DLT_PORTAL_CLIENT_ID}:${env.DLT_PORTAL_CLIENT_SECRET}`,
  ).toString('base64');

  const url = new URL(path, env.DLT_ORIGIN);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${credentials}`,
    'X-DLT-Application': env.DLT_APPLICATION_CODE,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_MUTATION_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return err<T>(await parseDltError(response));
    }

    const json = await response.json();
    // Login returns data at top level (access_token, user, etc.)
    return ok(json.data as T);
  } catch (error) {
    clearTimeout(timer);
    return err<T>({
      status: 0,
      message: error instanceof Error ? error.message : 'Login network error',
    });
  }
}
