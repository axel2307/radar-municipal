import type { MiddlewareHandler } from "hono";

interface RateLimitOptions {
  windowMs: number; // Window in milliseconds
  max: number; // Max requests per window
}

/**
 * Simple in-memory rate limiter (no Redis needed for MVP).
 * Uses a Map with IP as key and request count + window reset time.
 */
export function rateLimiter(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max } = options;
  const hits = new Map<string, { count: number; resetTime: number }>();

  // Cleanup stale entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits) {
      if (now > value.resetTime) hits.delete(key);
    }
  }, 60_000);

  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", String(max - 1));
      await next();
      return;
    }

    record.count++;
    const remaining = Math.max(0, max - record.count);
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil(record.resetTime / 1000))
    );

    if (record.count > max) {
      return c.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        429
      );
    }

    await next();
  };
}
