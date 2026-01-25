/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for development and small deployments.
 * For production with multiple instances, upgrade to Redis or Vercel KV.
 *
 * Usage:
 *   const limiter = createRateLimiter({ interval: 60000, limit: 10 });
 *   const result = await limiter.check('user-id-or-ip');
 *   if (!result.success) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 *   }
 */

interface RateLimitConfig {
  /**
   * Time window in milliseconds
   * Default: 60000 (1 minute)
   */
  interval?: number;

  /**
   * Maximum number of requests per interval
   * Default: 10
   */
  limit?: number;

  /**
   * Whether to include unique token in response
   * Default: false
   */
  uniqueTokenPerInterval?: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store - will be reset on server restart
// For production, replace with Redis or Vercel KV
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(config: RateLimitConfig = {}) {
  const interval = config.interval || 60000; // 1 minute default
  const limit = config.limit || 10;

  return {
    /**
     * Check if the identifier has exceeded rate limit
     * @param identifier - User ID, IP address, or other unique identifier
     * @returns Rate limit result with success status and remaining requests
     */
    async check(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const key = identifier;

      let entry = rateLimitStore.get(key);

      // If no entry or expired, create new entry
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 1,
          resetTime: now + interval,
        };
        rateLimitStore.set(key, entry);

        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: entry.resetTime,
        };
      }

      // Increment count
      entry.count++;

      // Check if limit exceeded
      if (entry.count > limit) {
        return {
          success: false,
          limit,
          remaining: 0,
          reset: entry.resetTime,
        };
      }

      return {
        success: true,
        limit,
        remaining: limit - entry.count,
        reset: entry.resetTime,
      };
    },

    /**
     * Reset rate limit for a specific identifier
     * @param identifier - User ID, IP address, or other unique identifier
     */
    reset(identifier: string): void {
      rateLimitStore.delete(identifier);
    },
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const RateLimiters = {
  // Strict: 5 requests per minute (for auth endpoints)
  strict: createRateLimiter({ interval: 60000, limit: 5 }),

  // Standard: 10 requests per minute (for API endpoints)
  standard: createRateLimiter({ interval: 60000, limit: 10 }),

  // Generous: 30 requests per minute (for read-only endpoints)
  generous: createRateLimiter({ interval: 60000, limit: 30 }),

  // Hourly: 100 requests per hour (for expensive operations)
  hourly: createRateLimiter({ interval: 3600000, limit: 100 }),
};

/**
 * Get client identifier from request (IP address or user ID)
 * @param request - Next.js request object
 * @param userId - Optional authenticated user ID
 * @returns Identifier string for rate limiting
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID if authenticated
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get real IP from headers (for deployments behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';

  return `ip:${ip}`;
}
