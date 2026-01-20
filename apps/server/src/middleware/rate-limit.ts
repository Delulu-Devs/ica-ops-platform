import { Context, Next } from 'hono';
import { getRedis } from '../lib/redis';

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS = 300; // 5 requests per second average is reasonable for an interactive app

export const rateLimiter = async (c: Context, next: Next) => {
  // Skip rate limiting for health checks and static files
  if (c.req.path === '/health' || c.req.path.startsWith('/uploads/')) {
    return next();
  }

  // Skip preflight requests
  if (c.req.method === 'OPTIONS') {
    return next();
  }

  // Get client IP
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const key = `rate_limit:${ip}`;

  try {
    const redis = await getRedis();

    // Increment request count
    const current = await redis.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, WINDOW_SIZE_IN_SECONDS);
    }

    // Set headers
    const remaining = Math.max(0, MAX_REQUESTS - current);
    c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
    c.header('X-RateLimit-Remaining', String(remaining));

    // If limit exceeded
    if (current > MAX_REQUESTS) {
      return c.json(
        {
          error: 'Too Many Requests',
          message: 'Please try again later.',
        },
        429
      );
    }
  } catch (error) {
    // Fail open (allow request) if Redis fails to avoid outage
    console.error('Rate limit error:', error);
  }

  await next();
};
