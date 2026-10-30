/**
 * lib/session.ts — Session cookie codec.
 * Uses SESSION_APP_SECRET_CURRENT/PREVIOUS via lib/crypto.ts.
 * Cookie name: dlt_session (HttpOnly, Secure, SameSite=Lax).
 *
 * TODO (Phase 1 — task 1.2): implement createSessionCookie / readSessionCookie
 */

import { encryptJWE, decryptJWE } from "./crypto";
import { env } from "./env";
import { cookies } from "next/headers";
import { isTokenExpired } from "./expiry";

export interface SessionPayload {
  access_token: string;
  merchant_account_id: string;
  service_code: string;
  /** Unix timestamp (ms): issued_at + min(expires_in_ms, 86_400_000) */
  expires_at: number;
  issued_at: number;
}

export const SESSION_COOKIE_NAME = "dlt_session";

export async function createSessionCookie(
  payload: SessionPayload
): Promise<string> {
  const token = await encryptJWE(payload as unknown as Record<string, unknown>, env.SESSION_APP_SECRET_CURRENT, "CURRENT");
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.expires_at),
  });
  return token;
}

export async function readSessionCookie(
  cookieValue: string
): Promise<SessionPayload> {
  const secrets = {
    current: env.SESSION_APP_SECRET_CURRENT,
    previous: env.SESSION_APP_SECRET_PREVIOUS,
  };
  const { payload } = await decryptJWE(cookieValue, secrets);
  
  if (isTokenExpired(payload as { expires_at?: number })) {
    throw new Error("Session expired");
  }

  return payload as unknown as SessionPayload;
}
