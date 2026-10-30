import { z } from 'zod';

const envSchema = z.object({
  // DLT API
  DLT_ORIGIN: z.string().url('DLT_ORIGIN must be a valid URL'),
  DLT_PORTAL_CLIENT_ID: z.string().min(1, 'DLT_PORTAL_CLIENT_ID is required'),
  DLT_PORTAL_CLIENT_SECRET: z.string().min(1, 'DLT_PORTAL_CLIENT_SECRET is required'),
  DLT_APPLICATION_CODE: z.string().default('merchant_portal'),

  // App
  APP_ORIGIN: z.string().url('APP_ORIGIN must be a valid URL'),
  APP_BASE_PATH: z.string().optional(),

  // Session
  SESSION_SECRETS: z
    .string()
    .min(1, 'SESSION_SECRETS is required')
    .transform((s) => s.split(',')),

  // Redis (optional in dev)
  REDIS_URL: z.string().url().optional(),

  // Defaults
  DEFAULT_TIMEZONE: z.string().default('Asia/Manila'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

try {
  process.loadEnvFile?.();
} catch {
  // No .env file — rely on the process environment.
}

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration. See above for details.');
  }
  return result.data;
}

/** Validated environment — fails fast at boot if anything is missing. */
export const env = loadEnv();
