import type { MiddlewareHandler } from "hono";

/**
 * Sets Cache-Control headers on successful (200) responses.
 * @param maxAge - Cache duration in seconds
 */
export function cacheControl(maxAge: number): MiddlewareHandler {
  return async (c, next) => {
    await next();
    if (c.res.status === 200) {
      c.header(
        "Cache-Control",
        `public, max-age=${maxAge}, s-maxage=${maxAge}`
      );
    }
  };
}
