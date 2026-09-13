/**
 * lib/rate-limit.ts — Upstash-backed rate limiting.
 * One exported limiter per row in the rate-limit table (spec §6.2 + brands row).
 *
 * TODO (Phase 1 — task 1.7): implement limiters once env vars are confirmed live.
 *
 * Rate-limit table:
 *   /api/auth/login          — 5 / 5min  per IP
 *   /api/payment/create-link — 30 / hour per authenticated session
 *   /api/payment/submit      — 5 / min   per link_id (+ IP cap)
 *   /api/payment/sync        — 20 / min  per link_id
 *   /api/payment/brands      — 20 / min  per link_id  (DESIGN.md §5)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";

export type RateLimitResult = { success: boolean; remaining: number };

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"),
  prefix: "rl:login",
});

const createLinkLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "rl:create_link",
});

const submitLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:submit",
});

const submitIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:submit_ip",
});

const syncLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:sync",
});

const brandsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:brands",
});

export async function limitLogin(ip: string): Promise<RateLimitResult> {
  const { success, remaining } = await loginLimiter.limit(ip);
  return { success, remaining };
}

export async function limitCreateLink(
  sessionId: string
): Promise<RateLimitResult> {
  const { success, remaining } = await createLinkLimiter.limit(sessionId);
  return { success, remaining };
}

export async function limitSubmit(
  linkId: string,
  ip: string
): Promise<RateLimitResult> {
  const ipRes = await submitIpLimiter.limit(ip);
  if (!ipRes.success) return { success: false, remaining: 0 };
  
  const { success, remaining } = await submitLimiter.limit(linkId);
  return { success, remaining };
}

export async function limitSync(linkId: string): Promise<RateLimitResult> {
  const { success, remaining } = await syncLimiter.limit(linkId);
  return { success, remaining };
}

export async function limitBrands(linkId: string): Promise<RateLimitResult> {
  const { success, remaining } = await brandsLimiter.limit(linkId);
  return { success, remaining };
}
