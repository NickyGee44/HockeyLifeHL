/**
 * Scorekeeper Token Rate Limiting
 *
 * CRITICAL SECURITY: Prevents brute force attacks on scorekeeper tokens.
 *
 * Defense layers:
 * 1. IP-based rate limit: Max 5 token validation attempts per minute per IP
 * 2. Token-based rate limit: Max 10 failed attempts per token before lockout
 * 3. Exponential backoff: Increasing delays after repeated failures
 *
 * Attack scenarios prevented:
 * - Brute force enumeration of 36^6 token space (~2.2 billion combinations)
 * - Distributed attacks from multiple IPs targeting same token
 * - Automated scanning tools attempting token discovery
 *
 * Implementation: In-memory for single-instance deployments.
 * For production with multiple instances, migrate to Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
}

interface TokenFailureEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptTime: number;
}

// In-memory stores (reset on server restart)
const ipRateLimitStore = new Map<string, RateLimitEntry>();
const tokenFailureStore = new Map<string, TokenFailureEntry>();

// Configuration
const IP_RATE_LIMIT = 5; // Max attempts per IP per minute
const IP_WINDOW_MS = 60 * 1000; // 1 minute
const TOKEN_FAILURE_LIMIT = 10; // Max failed attempts before lockout
const TOKEN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();

  // Clean IP rate limits
  Array.from(ipRateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.resetTime < now) {
      ipRateLimitStore.delete(key);
    }
  });

  // Clean token failures (after lockout expires)
  Array.from(tokenFailureStore.entries()).forEach(([key, entry]) => {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      tokenFailureStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Check if IP has exceeded rate limit for token validation attempts
 * @param ip - Client IP address
 * @returns true if rate limit exceeded, false if allowed
 */
export function checkIpRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  shouldShowCaptcha: boolean;
} {
  const now = Date.now();
  const key = `ip:${ip}`;

  let entry = ipRateLimitStore.get(key);

  // If no entry or expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + IP_WINDOW_MS,
      firstAttempt: now,
    };
    ipRateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: IP_RATE_LIMIT - 1,
      resetTime: entry.resetTime,
      shouldShowCaptcha: false,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > IP_RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      shouldShowCaptcha: true, // Show CAPTCHA after exceeding IP limit
    };
  }

  // Show CAPTCHA after 3 attempts
  const shouldShowCaptcha = entry.count >= 3;

  return {
    allowed: true,
    remaining: IP_RATE_LIMIT - entry.count,
    resetTime: entry.resetTime,
    shouldShowCaptcha,
  };
}

/**
 * Check if token has too many failed validation attempts (locked out)
 * @param token - Scorekeeper token to check
 * @returns true if token is locked, false if allowed
 */
export function checkTokenFailureLimit(token: string): {
  allowed: boolean;
  failedAttempts: number;
  lockedUntil: number | null;
  exponentialDelayMs: number;
} {
  const now = Date.now();
  const key = `token:${token.toUpperCase()}`;

  const entry = tokenFailureStore.get(key);

  if (!entry) {
    return {
      allowed: true,
      failedAttempts: 0,
      lockedUntil: null,
      exponentialDelayMs: 0,
    };
  }

  // Check if token is locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      failedAttempts: entry.failedAttempts,
      lockedUntil: entry.lockedUntil,
      exponentialDelayMs: entry.lockedUntil - now,
    };
  }

  // Token was locked but lockout expired - allow retry
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    tokenFailureStore.delete(key);
    return {
      allowed: true,
      failedAttempts: 0,
      lockedUntil: null,
      exponentialDelayMs: 0,
    };
  }

  // Calculate exponential backoff delay (not locked, but has failures)
  // 1st fail: 0ms, 2nd: 1s, 3rd: 2s, 4th: 4s, 5th: 8s, etc.
  const exponentialDelayMs = entry.failedAttempts > 0
    ? Math.min(Math.pow(2, entry.failedAttempts - 1) * 1000, 30000) // Cap at 30 seconds
    : 0;

  // Check if user needs to wait due to exponential backoff
  const timeSinceLastAttempt = now - entry.lastAttemptTime;
  if (timeSinceLastAttempt < exponentialDelayMs) {
    return {
      allowed: false,
      failedAttempts: entry.failedAttempts,
      lockedUntil: null,
      exponentialDelayMs: exponentialDelayMs - timeSinceLastAttempt,
    };
  }

  return {
    allowed: true,
    failedAttempts: entry.failedAttempts,
    lockedUntil: null,
    exponentialDelayMs: 0,
  };
}

/**
 * Record a failed token validation attempt
 * @param token - The token that failed validation
 */
export function recordTokenFailure(token: string): void {
  const now = Date.now();
  const key = `token:${token.toUpperCase()}`;

  let entry = tokenFailureStore.get(key);

  if (!entry) {
    entry = {
      failedAttempts: 1,
      lockedUntil: null,
      lastAttemptTime: now,
    };
  } else {
    entry.failedAttempts++;
    entry.lastAttemptTime = now;

    // Lock token after reaching failure limit
    if (entry.failedAttempts >= TOKEN_FAILURE_LIMIT) {
      entry.lockedUntil = now + TOKEN_LOCKOUT_MS;
    }
  }

  tokenFailureStore.set(key, entry);
}

/**
 * Clear failure count for token (called on successful validation)
 * @param token - The token that validated successfully
 */
export function clearTokenFailures(token: string): void {
  const key = `token:${token.toUpperCase()}`;
  tokenFailureStore.delete(key);
}

/**
 * Get client IP from Next.js request headers
 * Handles proxy headers (x-forwarded-for, x-real-ip)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // x-forwarded-for can contain multiple IPs, take the first (client)
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown';

  return ip;
}

/**
 * Combined rate limit check for scorekeeper token validation
 * Checks both IP-based and token-based limits
 *
 * @returns Object with allowed status and error details
 */
export function checkScorekeeperRateLimit(
  ip: string,
  token: string
): {
  allowed: boolean;
  error?: string;
  shouldShowCaptcha?: boolean;
  retryAfterMs?: number;
} {
  // Check IP rate limit
  const ipCheck = checkIpRateLimit(ip);
  if (!ipCheck.allowed) {
    const retryAfterSeconds = Math.ceil((ipCheck.resetTime - Date.now()) / 1000);
    return {
      allowed: false,
      error: `Too many attempts from this IP. Please try again in ${retryAfterSeconds} seconds.`,
      shouldShowCaptcha: true,
      retryAfterMs: ipCheck.resetTime - Date.now(),
    };
  }

  // Check token failure limit
  const tokenCheck = checkTokenFailureLimit(token);
  if (!tokenCheck.allowed) {
    if (tokenCheck.lockedUntil) {
      const minutesRemaining = Math.ceil((tokenCheck.lockedUntil - Date.now()) / 60000);
      return {
        allowed: false,
        error: `This token has been locked due to too many failed attempts. Please try again in ${minutesRemaining} minutes.`,
        retryAfterMs: tokenCheck.lockedUntil - Date.now(),
      };
    } else {
      const secondsRemaining = Math.ceil(tokenCheck.exponentialDelayMs / 1000);
      return {
        allowed: false,
        error: `Too many failed attempts. Please wait ${secondsRemaining} seconds before trying again.`,
        retryAfterMs: tokenCheck.exponentialDelayMs,
      };
    }
  }

  return {
    allowed: true,
    shouldShowCaptcha: ipCheck.shouldShowCaptcha,
  };
}
