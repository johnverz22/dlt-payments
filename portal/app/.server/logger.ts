/**
 * Simple structured logger with secret redaction.
 * Replace with a production logger (pino, winston) later.
 */

const REDACTED_KEYS = new Set([
  'authorization',
  'password',
  'current_password',
  'password_confirmation',
  'token',
  'otp',
  'value',
  'oauth_client_secret',
  'access_token',
]);

function redact(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : redact(val);
  }
  return result;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
