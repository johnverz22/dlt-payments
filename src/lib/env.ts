/**
 * lib/env.ts — Typed, fail-fast environment configuration.
 * Every route/lib MUST import from here; never use process.env directly.
 * Throws at module load time if any required variable is missing.
 */

import { z } from "zod";

const envSchema = z.object({
  // Link token encryption (dir/A256GCM, base64url 32 bytes)
  LINK_APP_SECRET_CURRENT: z.string().min(1),
  LINK_APP_SECRET_PREVIOUS: z.string().optional(),

  // Session cookie encryption (independent from link secret)
  SESSION_APP_SECRET_CURRENT: z.string().min(1),
  SESSION_APP_SECRET_PREVIOUS: z.string().optional(),

  // DLT API base URL
  DLT_API_BASE_URL: z.string().url().default("https://checkout.dxp.dtic.com.ph"),

  // Upstash Redis (rate limiting only)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Application base URL
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Link token size guard
  MAX_LINK_URL_LENGTH: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 2000)),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[env] Missing or invalid environment variables:\n${missing}\n\nSee .env.example for the required configuration.`
    );
  }
  return result.data;
}

// Export parsed, typed env — throws at import time if config is invalid.
export const env = parseEnv();
