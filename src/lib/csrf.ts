/**
 * lib/csrf.ts — Double-submit CSRF token utilities.
 * issueCsrfToken: 32-byte base64url, sets non-HttpOnly csrf_token cookie.
 * validateCsrf: compares x-csrf-token header to csrf_token cookie +
 *               Origin/Referer check for all state-changing routes.
 *
 * TODO (Phase 1 — task 1.6): implement issueCsrfToken / validateCsrf
 */

import { cookies } from "next/headers";
import { env } from "./env";
import { base64url } from "jose";

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export async function issueCsrfToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64url.encode(bytes);

  const cookieStore = await cookies();
  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be readable by client script to send in header
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return token;
}

export async function validateCsrf(request: Request): Promise<void> {
  validateOrigin(request);

  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    throw new Error("Missing CSRF token header");
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!cookieToken || headerToken !== cookieToken) {
    throw new Error("Invalid CSRF token");
  }
}

export function validateOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const expectedOrigin = new URL(appUrl).origin;

  if (!origin && !referer) {
    throw new Error("Missing Origin and Referer headers");
  }

  if (origin && origin !== expectedOrigin) {
    throw new Error("Invalid Origin");
  }

  if (referer && !referer.startsWith(expectedOrigin)) {
    throw new Error("Invalid Referer");
  }
}
