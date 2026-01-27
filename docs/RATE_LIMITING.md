# Rate Limiting Implementation

**Status**: ✅ Implemented
**Date**: January 27, 2026

## Overview

Rate limiting has been implemented across all critical authentication and action endpoints to prevent abuse and ensure system stability.

## Implementation

### Technology

- **Current**: In-memory rate limiting using Map storage
- **Location**: `src/lib/rate-limit.ts`
- **Cleanup**: Automatic cleanup every 5 minutes to prevent memory leaks
- **Future**: For production with multiple instances, consider upgrading to Redis (Upstash) or Vercel KV

### Rate Limit Configuration

Pre-configured rate limiters are available in `RateLimiters`:

```typescript
RateLimiters.strict        // 5 requests/minute (auth endpoints)
RateLimiters.standard      // 10 requests/minute (API endpoints)
RateLimiters.generous      // 30 requests/minute (read-only)
RateLimiters.veryGenerous  // 60 requests/minute (public)
RateLimiters.hourly        // 100 requests/hour (expensive ops)
```

## Protected Endpoints

### 1. User Signup (`src/lib/auth/actions.ts:116`)

**Rate Limit**: 5 requests/minute per IP address
**Limiter**: `RateLimiters.strict`
**Identifier**: IP address (x-forwarded-for, x-real-ip, or 'unknown')

```typescript
// Rate limiting code
const rateLimitKey = `signup:${ip}`;
const rateLimit = await RateLimiters.strict.check(rateLimitKey);
if (!rateLimit.success) {
  return {
    error: "Too many signup attempts. Please try again later."
  };
}
```

**Why IP-based**: Prevents automated account creation before user authentication

### 2. User Login (`src/lib/auth/actions.ts:261`)

**Rate Limit**: 10 requests/minute per IP address
**Limiter**: `RateLimiters.standard`
**Identifier**: IP address

```typescript
const rateLimitKey = `signin:${ip}`;
const rateLimit = await RateLimiters.standard.check(rateLimitKey);
if (!rateLimit.success) {
  return {
    error: "Too many login attempts. Please try again later."
  };
}
```

**Why IP-based**: Prevents credential stuffing and brute force attacks

### 3. League Signup (`src/lib/leagues/signup-actions.ts:38`)

**Rate Limit**: 5 requests/minute per IP address
**Limiter**: `RateLimiters.strict`
**Identifier**: IP address

```typescript
const rateLimitKey = `league-signup:${ip}`;
const rateLimit = await RateLimiters.strict.check(rateLimitKey);
if (!rateLimit.success) {
  return {
    error: "Too many signup attempts. Please try again later."
  };
}
```

**Why strict**: Creating leagues is resource-intensive (account + league + membership)

### 4. Join Requests (`src/lib/leagues/join-request-actions.ts:66`)

**Rate Limit**: 10 requests/minute per user ID
**Limiter**: `RateLimiters.standard`
**Identifier**: User ID (authenticated)

```typescript
const rateLimitKey = `join-request:${user.id}`;
const rateLimit = await RateLimiters.standard.check(rateLimitKey);
if (!rateLimit.success) {
  return {
    error: "Too many join requests. Please try again later."
  };
}
```

**Why user-based**: User is authenticated, so we track by user ID

## How It Works

### 1. Request Flow

```
User Request
    ↓
Rate Limiter Check
    ↓
┌─────────────────┐
│ Within limit?   │
├─────────────────┤
│ Yes → Process   │
│ No  → Reject    │
└─────────────────┘
```

### 2. Storage Structure

```typescript
Map<string, RateLimitEntry>
    ↓
Key: "signup:192.168.1.1"
Value: {
  count: 3,
  resetTime: 1706400000000
}
```

### 3. Rate Limit Response

When rate limit is exceeded, the user receives:

```typescript
{
  error: "Too many [operation] attempts. Please try again later."
}
```

The response includes:
- `success: false` - Request blocked
- `limit: 5` - Total allowed requests
- `remaining: 0` - Requests remaining
- `reset: 1706400000000` - Unix timestamp when limit resets

## Testing

### Automated Tests

Run the test suite:

```bash
npx tsx src/lib/rate-limit.test.ts
```

**Tests included**:
1. Basic rate limiting (5 requests/minute)
2. Different users tracked separately
3. Pre-configured limiters
4. Reset functionality
5. Time window expiry

**Test Results**: ✅ 5/5 tests passing

### Manual Testing

**Test signup rate limiting**:

```bash
# From terminal
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","password":"TestPass123"}' &
done
```

Expected: First 5 succeed, last 5 return rate limit error

## Response Headers

Rate limit information is returned in the response but not exposed in headers by default. To add headers:

```typescript
// In your API route or server action
const rateLimit = await RateLimiters.strict.check(identifier);

// Add to Response headers
return new Response(body, {
  headers: {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
  }
});
```

## Monitoring

### Recommended Monitoring

1. **Track rate limit hits**:
   ```typescript
   if (!rateLimit.success) {
     // Log to monitoring service
     console.warn(`Rate limit hit: ${rateLimitKey}`);
   }
   ```

2. **Alert on excessive hits**:
   - Set up alerts when rate limits are hit >100 times/hour
   - Indicates potential attack or legitimate traffic spike

3. **Analytics**:
   - Track rate limit hits by endpoint
   - Identify patterns (time of day, IP ranges)

### Logging Example

```typescript
import { RateLimiters } from "@/lib/rate-limit";

const rateLimit = await RateLimiters.strict.check(identifier);

if (!rateLimit.success) {
  console.warn({
    type: 'rate_limit_exceeded',
    identifier: identifier,
    endpoint: 'signup',
    reset_at: new Date(rateLimit.reset).toISOString(),
  });
}
```

## Upgrading to Distributed Rate Limiting

For production deployments with multiple instances, upgrade to Redis-based rate limiting:

### Option 1: Upstash Redis

```bash
npm install @upstash/redis @upstash/ratelimit
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@signup",
});
```

### Option 2: Vercel KV

```bash
npm install @vercel/kv
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

export const signupLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});
```

### Migration Path

1. Install dependencies
2. Create Redis client
3. Replace `RateLimiters.strict.check()` with Redis-based limiter
4. Test thoroughly
5. Deploy with environment variables

## Security Considerations

### Why Rate Limiting Matters

1. **Prevents Brute Force**: Limits login attempts to prevent password guessing
2. **Prevents DoS**: Stops attackers from overwhelming the system
3. **Prevents Abuse**: Limits automated account/league creation
4. **Fair Usage**: Ensures resources are shared fairly among users

### Defense in Depth

Rate limiting is ONE layer of security. Also implemented:

- Strong password requirements (12+ chars)
- Input sanitization (XSS prevention)
- SQL injection prevention (parameterized queries)
- CSRF protection (Next.js built-in)
- Authorization checks (RLS policies)
- Timing attack protection (consistent timing)

### Edge Cases Handled

1. **Missing IP headers**: Falls back to 'unknown' identifier
2. **Memory leaks**: Automatic cleanup every 5 minutes
3. **Server restarts**: In-memory limits reset (by design)
4. **Different users**: Each identifier tracked separately

## Troubleshooting

### "Too many requests" but user only made 1 request

**Cause**: Multiple users behind same NAT/proxy share same IP
**Solution**:
- For authenticated endpoints, use user ID instead of IP
- For public endpoints, consider more generous limits
- Upgrade to session-based rate limiting

### Rate limits reset on server restart

**Cause**: In-memory storage clears on restart
**Solution**: Upgrade to Redis-based rate limiting

### Rate limits not working in development

**Cause**: Hot reloading may reset in-memory store
**Solution**:
- Expected behavior in development
- Test in production build: `npm run build && npm start`

## Configuration Changes

To adjust rate limits:

```typescript
// src/lib/rate-limit.ts

export const RateLimiters = {
  // Change from 5 to 10 requests/minute
  strict: createRateLimiter({ interval: 60000, limit: 10 }),

  // Change to 20 requests per 2 minutes
  standard: createRateLimiter({ interval: 120000, limit: 20 }),
};
```

Or create custom limiters:

```typescript
// In your server action
import { createRateLimiter } from "@/lib/rate-limit";

const customLimiter = createRateLimiter({
  interval: 300000, // 5 minutes
  limit: 100,       // 100 requests
});
```

## References

- Implementation: `src/lib/rate-limit.ts`
- Tests: `src/lib/rate-limit.test.ts`
- Usage in auth: `src/lib/auth/actions.ts`
- Usage in leagues: `src/lib/leagues/signup-actions.ts`, `src/lib/leagues/join-request-actions.ts`

## Status

✅ **IMPLEMENTED** - All critical endpoints protected
✅ **TESTED** - 5/5 automated tests passing
✅ **DOCUMENTED** - Complete documentation provided
⚠️ **PRODUCTION READY** - Consider Redis upgrade for multi-instance deployments
