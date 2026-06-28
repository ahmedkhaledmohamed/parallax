import { Redis } from "@upstash/redis";

const WINDOW_SECONDS = 3600;
const MAX_REQUESTS = 20;

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return _redis;
}

export async function checkRateLimit(
  identifier: string
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const client = redis();
  if (!client) return { allowed: true, remaining: MAX_REQUESTS, reset: 0 };

  const key = `ratelimit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;

  const pipe = client.pipeline();
  pipe.zremrangebyscore(key, 0, windowStart);
  pipe.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
  pipe.zcard(key);
  pipe.expire(key, WINDOW_SECONDS);

  const results = await pipe.exec();
  const count = (results[2] as number) ?? 0;

  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
    reset: now + WINDOW_SECONDS,
  };
}

export function getRateLimitIdentifier(
  request: Request,
  apiKey?: string
): string {
  if (apiKey) return apiKey;
  const forwarded = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return forwarded || "unknown";
}
