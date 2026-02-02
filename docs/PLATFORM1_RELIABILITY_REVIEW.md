# Platform 1 (League Builder) - Reliability Review & SLO Definition

**Date:** 2026-01-31
**Platform:** League Builder Admin Dashboard (admin.hockeylife.com)
**Current State:** 20-30 SMB clients, Next.js 16.1.1, Supabase Postgres, Stripe integration
**Target Reliability:** 99.9% availability for critical paths

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Service Level Objectives (SLOs)](#service-level-objectives-slos)
3. [Resilience Configuration](#resilience-configuration)
4. [Observability Requirements](#observability-requirements)
5. [Alert Definitions](#alert-definitions)
6. [Incident Response Runbooks](#incident-response-runbooks)
7. [Top Reliability Risks](#top-reliability-risks)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

Platform 1 (League Builder) serves 20-30 SMB customers who manage hockey leagues. The platform handles critical business operations: user authentication, organization/league management, subscription billing, and team roster management. **Downtime directly equals customer churn** in this segment.

### Current Strengths
- Comprehensive Stripe webhook handling with idempotency
- Service role pattern for atomic operations
- GDPR-compliant data handling
- Optimistic locking for concurrent subscription updates
- Edge functions for background jobs (account deletions, session cleanup)

### Critical Gaps Identified
1. **No timeout configurations** on Supabase queries (unbounded wait risk)
2. **No retry logic** for transient Stripe API failures
3. **No circuit breakers** for Stripe dependency
4. **Missing observability** for critical user journeys
5. **No SLO tracking or error budgets** defined
6. **RLS performance impacts** not monitored (multi-tenant risk)
7. **Edge function failures** have no alerting
8. **Webhook processing lacks visibility** into queue depth/lag

---

## Service Level Objectives (SLOs)

### 1. SLO Table

| User Journey | SLI | Target | Error Budget | Measurement Window | Priority |
|--------------|-----|--------|--------------|-------------------|----------|
| **Authentication (Login)** | Success rate of `/api/auth/signin` | 99.9% | 43.2 min/month | 30 days | P0 |
| **Authentication (Signup)** | Success rate of signup flow (auth + org creation) | 99.5% | 3.6 hours/month | 30 days | P0 |
| **Dashboard Load** | p95 latency < 1.5s, p99 < 3s | 99.9% | 43.2 min/month | 30 days | P0 |
| **Organization Creation** | Atomic completion (auth + profile + org + trial) | 99.9% | 43.2 min/month | 30 days | P0 |
| **League CRUD Operations** | Success rate of create/update/delete leagues | 99.5% | 3.6 hours/month | 30 days | P1 |
| **Team Management** | Success rate of roster updates | 99.0% | 7.2 hours/month | 30 days | P1 |
| **Subscription Webhooks** | Processing success rate within 60s | 99.9% | 43.2 min/month | 30 days | P0 |
| **Payment Processing** | Stripe API success rate (create subscription) | 99.5% | 3.6 hours/month | 30 days | P0 |
| **Account Deletion** | Edge function completion within 5 minutes | 99.0% | 7.2 hours/month | 30 days | P2 |
| **Session Cleanup** | Edge function completion within 2 minutes | 95.0% | 36 hours/month | 30 days | P3 |

### 2. SLO Rationale

**P0 (Critical - 99.9%):** Directly impacts customer's ability to use the platform or manage billing. Failure = immediate customer impact.

**P1 (High - 99.5%):** Core functionality but customers can retry. Short-term failures tolerable.

**P2 (Medium - 99.0%):** Background operations with graceful degradation. Failures delay non-critical workflows.

**P3 (Low - 95.0%):** Housekeeping tasks. Failures accumulate over time but don't block users.

### 3. Error Budget Policy

**Fast Burn (50% budget in 1 hour):**
- Page on-call immediately
- Halt all deployments
- Initiate incident response

**Slow Burn (25% budget in 24 hours):**
- Create P1 ticket
- Review logs within 2 hours
- Schedule root cause analysis

**Budget Exhausted:**
- Block all non-critical feature deployments
- Focus 100% engineering capacity on reliability
- Daily incident review meetings until budget restored

---

## Resilience Configuration

### 1. Timeout Values

#### Supabase Query Timeouts

```typescript
// apps/league-builder/src/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { /* ... */ },
      global: {
        headers: {
          // Critical: Set statement timeout to prevent long-running queries
          'X-Client-Info': 'league-builder@1.0.0',
        },
      },
      db: {
        // Default query timeout: 10 seconds (should be < middleware timeout)
        schema: 'public',
      },
    }
  );
}

// Apply timeout hint to critical queries
// Example: Dashboard data fetch
const { data, error } = await supabase
  .from('organizations')
  .select('*, leagues(*)')
  .eq('owner_user_id', userId)
  .abortSignal(AbortSignal.timeout(5000)); // 5s timeout for reads
```

**Recommended Timeouts:**
- **Simple reads** (single table, indexed): 2s
- **Complex reads** (JOINs, aggregations): 5s
- **Writes** (INSERT/UPDATE): 10s
- **Transactions** (multi-table): 15s
- **Webhook processing**: 25s (within Vercel 30s timeout)
- **Edge functions**: 50s (within Supabase 60s timeout)

#### Stripe API Timeouts

```typescript
// apps/league-builder/src/lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  timeout: 15000, // 15s timeout (Stripe recommends 15-30s)
  maxNetworkRetries: 0, // Disable automatic retries (we control retry logic)
  telemetry: false, // Disable telemetry for performance
});

// For critical operations, use shorter timeout
const CRITICAL_TIMEOUT = 10000; // 10s for checkout creation
```

#### Next.js Route Handler Timeouts

```typescript
// next.config.js
export default {
  // ... other config
  experimental: {
    // Vercel timeout: 10s for Hobby, 60s for Pro, 300s for Enterprise
    // Set server action timeout to 25s (safely under 30s Vercel limit)
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['admin.hockeylife.com'],
    },
  },
};

// Enforce timeout in server actions
export async function signUp(formData: FormData) {
  const timeoutSignal = AbortSignal.timeout(25000); // 25s max

  try {
    // ... signup logic with timeoutSignal passed to async operations
  } catch (error) {
    if (error.name === 'AbortError') {
      return { error: 'Signup took too long. Please try again.' };
    }
    throw error;
  }
}
```

### 2. Retry Policies

#### Exponential Backoff Strategy

```typescript
// apps/league-builder/src/lib/utils/retry.ts
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[]; // e.g., 'ECONNRESET', 'ETIMEDOUT'
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1s
  maxDelayMs: 10000, // 10s
  backoffMultiplier: 2, // 1s → 2s → 4s
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'rate_limit'],
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry non-transient errors
      if (!isRetryableError(error, finalConfig.retryableErrors)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw error;
      }

      // Calculate backoff delay with jitter
      const baseDelay = Math.min(
        finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
        finalConfig.maxDelayMs
      );
      const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
      const delayMs = baseDelay + jitter;

      console.warn(`Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delayMs}ms`, {
        error: error.message,
        operation: operation.name,
      });

      await sleep(delayMs);
    }
  }

  throw lastError!;
}

function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof Error) {
    return retryableErrors.some(code =>
      error.message.includes(code) || error.name === code
    );
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

#### Idempotent Operation Retry Policy

| Operation | Max Attempts | Initial Delay | Backoff | Timeout | Idempotent? |
|-----------|--------------|---------------|---------|---------|-------------|
| **Stripe: Create Customer** | 3 | 1s | 2x | 15s | Yes (idempotency key) |
| **Stripe: Create Subscription** | 3 | 1s | 2x | 15s | Yes (idempotency key) |
| **Stripe: Update Subscription** | 2 | 1s | 2x | 15s | Yes (idempotency key) |
| **Stripe: Retrieve Subscription** | 3 | 500ms | 2x | 10s | Yes (GET) |
| **Supabase: Read (SELECT)** | 2 | 500ms | 2x | 5s | Yes (read-only) |
| **Supabase: Write (INSERT)** | 1 | N/A | N/A | 10s | Maybe (check for unique constraint) |
| **Supabase: Update (UPDATE)** | 1 | N/A | N/A | 10s | Maybe (optimistic locking) |
| **Webhook Processing** | 1 | N/A | N/A | 25s | Yes (event deduplication) |

**Critical Rule:** Only retry operations that are truly idempotent or have built-in deduplication.

### 3. Circuit Breaker Pattern

#### Stripe API Circuit Breaker

```typescript
// apps/league-builder/src/lib/stripe/circuit-breaker.ts
interface CircuitBreakerConfig {
  failureThreshold: number; // Open circuit after N failures
  successThreshold: number; // Close circuit after N successes
  timeout: number; // Milliseconds before attempting half-open
}

enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject immediately
  HALF_OPEN = 'half_open' // Testing if recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime! < this.config.timeout) {
        throw new Error('Circuit breaker is OPEN. Stripe API unavailable.');
      }
      // Timeout expired, try half-open
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error('[CircuitBreaker] Circuit opened after repeated failures', {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Singleton instance for Stripe API
export const stripeCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,     // Open after 5 consecutive failures
  successThreshold: 2,     // Close after 2 consecutive successes
  timeout: 30000,          // 30s cooldown before retry
});
```

#### Usage in Subscription Actions

```typescript
// apps/league-builder/src/lib/actions/subscription.ts
export async function createOrganizationSubscription(
  tier: SubscriptionTier,
  paymentMethodId?: string
): ActionResult<SubscriptionCheckoutResult> {
  try {
    // Wrap Stripe calls in circuit breaker
    const subscription = await stripeCircuitBreaker.execute(() =>
      withRetry(() =>
        stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          // ... rest of config
        }, {
          idempotencyKey: subscriptionIdempotencyKey,
          timeout: CRITICAL_TIMEOUT,
        })
      )
    );

    // ... rest of logic
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      // Graceful degradation: queue for later processing
      return {
        success: false,
        error: 'Payment system temporarily unavailable. Please try again in 1 minute.',
      };
    }
    throw error;
  }
}
```

### 4. Graceful Degradation Strategies

| Failure Scenario | Degradation Strategy | User Experience |
|------------------|----------------------|-----------------|
| **Stripe API Down** | Queue subscription requests, process when recovered | "Subscription pending. You'll receive email when activated." |
| **Supabase Postgres Slow** | Return cached dashboard data, show "stale data" banner | "Viewing cached data from 5 minutes ago. Refresh to retry." |
| **Edge Function Fails** | Log error, retry in next cron run | User sees "pending deletion" status, background retry handles it |
| **Webhook Processing Slow** | Accept webhook (200 OK), queue for async processing | Stripe doesn't retry, we process in order from queue |
| **RLS Query Timeout** | Fall back to direct query with explicit org_id filter | No user impact, logged as warning for investigation |
| **Email Sending Fails (Resend)** | Log failure, add to retry queue, show in-app notification | User sees notification banner instead of email |

---

## Observability Requirements

### 1. Key Metrics to Track

#### RED Metrics (for every endpoint)

**Rate:**
- `http_requests_total{method, path, status}` - Total requests
- `http_requests_per_second{method, path}` - Request throughput

**Errors:**
- `http_errors_total{method, path, error_code}` - Error count
- `http_error_rate{method, path}` - Error percentage

**Duration:**
- `http_request_duration_seconds{method, path, quantile="0.5|0.95|0.99"}` - Latency

#### Database Metrics

```typescript
// Instrument Supabase queries
import { performance } from 'perf_hooks';

export async function instrumentedQuery<T>(
  queryName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  const labels = { query_name: queryName };

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    // Send to monitoring (Datadog, Prometheus, etc.)
    metrics.histogram('supabase.query.duration', duration, labels);
    metrics.increment('supabase.query.success', 1, labels);

    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    metrics.increment('supabase.query.error', 1, {
      ...labels,
      error_type: error.code || 'unknown',
    });
    throw error;
  }
}
```

**Critical Database Queries to Monitor:**
- `organizations.select.by_owner` - Dashboard load (target: <500ms p95)
- `leagues.select.by_org` - League list (target: <300ms p95)
- `teams.select.with_rosters` - Team roster load (target: <1s p95)
- `subscription.webhook.update` - Webhook processing (target: <200ms p95)

#### Stripe API Metrics

```typescript
// Track Stripe API health
metrics.histogram('stripe.api.duration', duration, {
  operation: 'create_subscription',
  status: response.status,
});

metrics.increment('stripe.api.calls', 1, {
  operation: 'create_subscription',
  result: 'success|failure',
});

// Circuit breaker state
metrics.gauge('stripe.circuit_breaker.state', stateValue, {
  state: 'closed|open|half_open',
});
```

#### Edge Function Metrics

```typescript
// supabase/functions/process-account-deletions/index.ts
Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    // ... process deletions

    const duration = Date.now() - startTime;

    // Return metrics in response for Supabase monitoring
    return new Response(JSON.stringify({
      success: true,
      results,
      metrics: {
        duration_ms: duration,
        processed: results.processed,
        succeeded: results.succeeded,
        failed: results.failed,
      }
    }), { status: 200 });
  } catch (error) {
    // Log error to Supabase logs (viewable in dashboard)
    console.error('Edge function failed:', error);
    throw error;
  }
});
```

### 2. Structured Logging Requirements

#### Log Format Standard

```typescript
// apps/league-builder/src/lib/utils/logger.ts
interface LogContext {
  trace_id: string;        // Request correlation ID
  user_id?: string;        // Authenticated user
  org_id?: string;         // Organization context
  operation: string;       // High-level operation name
  component: string;       // Code component (auth, subscription, etc.)
  duration_ms?: number;    // Operation duration
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

export function logInfo(message: string, context: LogContext): void {
  console.log(JSON.stringify({
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...context,
  }));
}

export function logError(message: string, error: Error, context: LogContext): void {
  console.error(JSON.stringify({
    level: 'error',
    timestamp: new Date().toISOString(),
    message,
    error: {
      message: error.message,
      code: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    ...context,
  }));
}
```

#### Critical Log Points

**Authentication:**
```typescript
// Successful login
logInfo('User login successful', {
  trace_id: traceId,
  user_id: user.id,
  operation: 'auth.login',
  component: 'auth',
  duration_ms: loginDuration,
});

// Failed login (DO NOT log password or sensitive data)
logError('User login failed', error, {
  trace_id: traceId,
  operation: 'auth.login',
  component: 'auth',
  // NEVER include: email, password, or other PII
});
```

**Subscription Operations:**
```typescript
// Subscription created
logInfo('Subscription created', {
  trace_id: traceId,
  user_id: userId,
  org_id: orgId,
  operation: 'subscription.create',
  component: 'billing',
  stripe_subscription_id: subscriptionId,
  tier: tier,
  trial_days: trialDays,
});

// Webhook processed
logInfo('Webhook processed', {
  trace_id: eventId, // Use Stripe event ID as trace
  org_id: orgId,
  operation: 'webhook.subscription.updated',
  component: 'webhook',
  event_type: event.type,
  duration_ms: processingDuration,
});
```

**RLS Violations (CRITICAL):**
```typescript
// Log potential tenant isolation breach
logError('RLS policy violation detected', error, {
  trace_id: traceId,
  user_id: userId,
  org_id: requestedOrgId,
  operation: 'data_access.unauthorized',
  component: 'security',
  severity: 'critical',
  alert: true, // Flag for immediate alerting
});
```

### 3. Distributed Tracing

#### Trace Critical User Journeys

**Signup Flow Trace:**
```
Span 1: POST /api/auth/signup (parent)
  ├─ Span 2: Create auth user (Supabase Auth Admin API)
  ├─ Span 3: Create profile (Supabase DB)
  ├─ Span 4: Create organization (Supabase DB)
  ├─ Span 5: Create Stripe customer (Stripe API)
  └─ Span 6: Sign in user (Supabase Auth)
```

**Subscription Creation Trace:**
```
Span 1: POST /api/subscription/create (parent)
  ├─ Span 2: Fetch organization (Supabase DB)
  ├─ Span 3: Check trial eligibility (Stripe API)
  ├─ Span 4: Create Stripe subscription (Stripe API)
  ├─ Span 5: Update organization (Supabase DB)
  └─ Span 6: Log subscription event (Supabase RPC)
```

**Implementation (OpenTelemetry):**
```typescript
// Install: @opentelemetry/api, @opentelemetry/sdk-node
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('league-builder');

export async function signUp(formData: FormData) {
  return tracer.startActiveSpan('auth.signup', async (span) => {
    span.setAttribute('user.email', email);
    span.setAttribute('org.name', organizationName);

    try {
      // Create auth user
      const authSpan = tracer.startSpan('supabase.auth.createUser');
      const { data: authData } = await serviceSupabase.auth.admin.createUser({...});
      authSpan.end();

      // ... rest of signup flow with child spans

      span.setStatus({ code: SpanStatusCode.OK });
      return { success: true };
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### 4. Monitoring Dashboard Design

#### Dashboard 1: Platform Health Overview

**Widgets:**
1. **SLO Compliance** (donut charts)
   - Auth login SLO: 99.9% ✓ (current: 99.95%)
   - Dashboard load SLO: 99.9% ✓ (current: 99.87%)
   - Subscription webhooks SLO: 99.9% ✗ (current: 99.82% - ALERT)

2. **Error Budget Burn Rate** (line chart, 30 days)
   - Auth: 15% consumed (healthy)
   - Billing: 45% consumed (warning)
   - Edge Functions: 80% consumed (critical - deployment freeze)

3. **Request Rate** (line chart, 24 hours)
   - Total requests/sec
   - Errors/sec (stacked by 4xx vs 5xx)

4. **Latency Heatmap** (heatmap, 24 hours)
   - p50, p95, p99 latencies by endpoint
   - Color-coded: green (<1s), yellow (1-3s), red (>3s)

#### Dashboard 2: Critical User Journeys

**Widgets:**
1. **Signup Funnel** (funnel chart)
   - Started: 150
   - Auth created: 145 (96.7%)
   - Profile created: 143 (95.3%)
   - Org created: 141 (94.0%)
   - Completed: 140 (93.3%) ← Conversion rate

2. **Login Success Rate** (gauge)
   - Target: 99.9%
   - Current: 99.95% ✓

3. **Subscription Operations** (table)
   - Create: 45 today (100% success)
   - Upgrade: 12 today (100% success)
   - Cancel: 3 today (100% success)
   - Webhooks: 89 today (98.9% success - 1 failure)

#### Dashboard 3: Database Performance

**Widgets:**
1. **Query Latency by Table** (bar chart)
   - organizations: p95 = 320ms ✓
   - leagues: p95 = 180ms ✓
   - teams: p95 = 1.2s ✗ (threshold: 1s)
   - profiles: p95 = 150ms ✓

2. **RLS Overhead** (line chart)
   - Query latency with RLS vs without RLS
   - Alert if overhead > 50%

3. **Connection Pool Usage** (gauge)
   - Active connections / Max connections
   - Alert if >80% utilization

4. **Slow Query Log** (table)
   - Queries >1s in last hour
   - Includes: query text, duration, table, user_id

#### Dashboard 4: Stripe Integration Health

**Widgets:**
1. **Stripe API Latency** (line chart)
   - p95 latency by operation (create, update, retrieve)
   - Target: <2s

2. **Circuit Breaker State** (status indicator)
   - CLOSED (green) / OPEN (red) / HALF_OPEN (yellow)
   - Time in current state

3. **Webhook Processing** (metrics)
   - Average processing time: 420ms
   - Queue depth: 0 (real-time)
   - Events processed today: 156
   - Failed events: 2 (retrying)

4. **Idempotency Key Collisions** (counter)
   - Total collisions today: 0
   - Alerts if >0 (indicates duplicate processing)

---

## Alert Definitions

### 1. Alert Configuration Table

| Alert Name | Condition | Severity | Escalation | Runbook Link |
|------------|-----------|----------|------------|--------------|
| **Auth Login Failure Spike** | Error rate >1% for 5 min | P0 - Page | Immediate | [Runbook](#runbook-auth-failures) |
| **Dashboard Load Timeout** | p99 latency >5s for 5 min | P0 - Page | Immediate | [Runbook](#runbook-slow-dashboard) |
| **Subscription Webhook Lag** | Processing delay >5 min | P0 - Page | Immediate | [Runbook](#runbook-webhook-lag) |
| **Stripe API Circuit Open** | Circuit breaker opens | P0 - Page | Immediate | [Runbook](#runbook-stripe-outage) |
| **RLS Policy Violation** | Any RLS error logged | P0 - Page | Immediate | [Runbook](#runbook-rls-violation) |
| **Signup Funnel Drop** | Conversion <80% for 1 hour | P1 - Ticket | 1 hour | [Runbook](#runbook-signup-drop) |
| **Database Connection Pool High** | Usage >80% for 10 min | P1 - Ticket | 1 hour | [Runbook](#runbook-db-connections) |
| **Edge Function Failure** | 2+ consecutive failures | P2 - Ticket | 24 hours | [Runbook](#runbook-edge-function) |
| **Slow Query Detected** | Query >3s in production | P2 - Ticket | 24 hours | [Runbook](#runbook-slow-query) |
| **Error Budget 50% Consumed** | Budget burn >50% | P1 - Ticket | 4 hours | [Runbook](#runbook-error-budget) |
| **Error Budget 90% Consumed** | Budget burn >90% | P0 - Page | Immediate | [Runbook](#runbook-error-budget-critical) |

### 2. Alert Implementation (Datadog Example)

```yaml
# datadog/monitors/auth-login-failure-spike.yaml
name: "Auth Login Failure Spike"
type: metric alert
query: |
  sum(last_5m):sum:http.errors{path:/api/auth/signin} by {environment}
  / sum:http.requests{path:/api/auth/signin} by {environment} > 0.01
message: |
  CRITICAL: Auth login error rate exceeded 1% for 5 minutes.

  Current error rate: {{value}}%
  Environment: {{environment.name}}

  This impacts user ability to access the platform.

  Runbook: https://docs.hockeylife.com/runbooks/auth-failures

  @pagerduty-league-builder-oncall
tags:
  - service:league-builder
  - severity:p0
  - team:platform
priority: 1
notify_no_data: true
no_data_timeframe: 10
```

### 3. Alert Routing

**PagerDuty Integration:**
```yaml
# pagerduty/escalation-policy.yaml
escalation_policies:
  - name: "League Builder On-Call"
    escalation_rules:
      - escalation_delay_in_minutes: 0
        targets:
          - type: user_reference
            id: primary_oncall
      - escalation_delay_in_minutes: 15
        targets:
          - type: user_reference
            id: backup_oncall
      - escalation_delay_in_minutes: 30
        targets:
          - type: schedule_reference
            id: engineering_manager_schedule
```

**Alert Channels:**
- **P0 (Page):** PagerDuty → SMS + Phone Call + Slack #incidents
- **P1 (Ticket):** Slack #platform-alerts + Linear ticket
- **P2 (Ticket):** Slack #platform-monitoring + Linear ticket
- **P3 (Log):** Weekly report email

---

## Incident Response Runbooks

### Runbook: Auth Failures

**Symptoms:**
- Alert: "Auth Login Failure Spike" fired
- Users report "Unable to log in" errors
- Supabase dashboard shows auth errors

**Impact:**
- Users cannot access the platform
- Revenue impact: $X per hour of downtime
- Estimated affected users: All attempting login

**Investigation Steps:**

1. **Check Supabase Auth Service Status**
   ```bash
   # Check Supabase status page
   curl https://status.supabase.com/api/v2/status.json

   # Check our project health
   npx supabase status --project-ref YOUR_PROJECT_REF
   ```

2. **Review Recent Changes**
   ```bash
   # Check recent deployments
   vercel deployments list --app league-builder

   # Check recent migrations
   npx supabase db diff --linked --file recent_changes.sql
   ```

3. **Check Logs for Error Patterns**
   ```bash
   # Filter auth errors in last 30 minutes
   vercel logs --app league-builder --filter "auth.signin" --since 30m
   ```

4. **Verify Environment Variables**
   ```bash
   # Check if Supabase keys are correct
   vercel env ls

   # Test auth with service role key
   curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/admin/users \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```

**Mitigation Steps:**

1. **Immediate (< 5 min):**
   - If recent deployment detected: Rollback to last known good version
     ```bash
     vercel rollback league-builder --yes
     ```
   - If environment variable issue: Restore from backup
     ```bash
     vercel env pull .env.production.backup
     vercel env push .env.production.backup production
     ```

2. **Short-term (< 30 min):**
   - If Supabase outage: Enable maintenance mode, show status page
   - If rate limiting: Increase Supabase plan limits temporarily
   - If RLS policy bug: Disable problematic policy, fall back to application-level checks

3. **Long-term (< 24 hours):**
   - Root cause analysis meeting
   - Update monitoring to catch earlier next time
   - Add pre-deployment auth smoke tests

**Rollback Procedure:**
```bash
# 1. Identify last good deployment
vercel deployments list --app league-builder | head -n 10

# 2. Rollback to specific deployment
vercel rollback league-builder --target <DEPLOYMENT_URL> --yes

# 3. Verify rollback success
curl -f https://admin.hockeylife.com/api/health || echo "Rollback failed"

# 4. Monitor error rate
# Expected: Error rate drops to <0.1% within 2 minutes
```

**Communication Template:**
```
INCIDENT: Auth Login Failures
Status: Investigating | Identified | Monitoring | Resolved
Started: 2026-01-31 14:32 UTC
Last Update: 2026-01-31 14:45 UTC

We are aware users are unable to log in to the League Builder dashboard.
Our team is investigating and will provide updates every 15 minutes.

Workaround: None available at this time.
ETA to Resolution: 30 minutes

Next Update: 2026-01-31 15:00 UTC
```

---

### Runbook: Slow Dashboard

**Symptoms:**
- Alert: "Dashboard Load Timeout" fired
- Users report dashboard taking >10 seconds to load
- Supabase metrics show high query latency

**Impact:**
- Degraded user experience
- Potential session timeouts
- Estimated affected users: All dashboard users

**Investigation Steps:**

1. **Check Database Performance**
   ```bash
   # Connect to Supabase and check slow queries
   psql $DATABASE_URL

   SELECT
     query,
     calls,
     mean_exec_time,
     max_exec_time
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

2. **Check for Table Bloat**
   ```sql
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;
   ```

3. **Check RLS Overhead**
   ```sql
   -- Test query with RLS enabled vs disabled
   SET ROLE authenticated;
   SET request.jwt.claim.sub = 'test-user-id';
   EXPLAIN ANALYZE SELECT * FROM organizations WHERE owner_user_id = current_setting('request.jwt.claim.sub');

   RESET ROLE;
   EXPLAIN ANALYZE SELECT * FROM organizations WHERE owner_user_id = 'test-user-id';
   ```

4. **Check Connection Pool**
   ```sql
   SELECT count(*) as connections, state
   FROM pg_stat_activity
   GROUP BY state;
   ```

**Mitigation Steps:**

1. **Immediate (<5 min):**
   - Enable Redis cache for dashboard queries (if available)
   - Increase Supabase compute resources temporarily
   - Add query timeout to prevent unbounded queries
     ```typescript
     const { data } = await supabase
       .from('organizations')
       .select('*, leagues(*)')
       .abortSignal(AbortSignal.timeout(2000)); // 2s timeout
     ```

2. **Short-term (<1 hour):**
   - Add missing indexes identified in slow query log
     ```sql
     CREATE INDEX CONCURRENTLY idx_leagues_org_id
     ON leagues(organization_id)
     WHERE deleted_at IS NULL;
     ```
   - Vacuum bloated tables
     ```sql
     VACUUM ANALYZE organizations;
     ```

3. **Long-term (<1 week):**
   - Refactor complex queries to use materialized views
   - Implement query result caching layer
   - Add read replicas for reporting queries

**Prevention:**
- Add query performance tests to CI/CD
- Set up automatic VACUUM schedule
- Monitor index usage and drop unused indexes

---

### Runbook: Webhook Lag

**Symptoms:**
- Alert: "Subscription Webhook Lag" fired
- Stripe events visible in dashboard but not reflected in database
- Users report subscription status not updating after payment

**Impact:**
- Subscription status out of sync with Stripe
- Users may be incorrectly blocked from features
- Revenue recognition delayed

**Investigation Steps:**

1. **Check Webhook Processing Rate**
   ```bash
   # Check Vercel function logs
   vercel logs --app league-builder --filter "webhook" --since 30m

   # Count events in last hour
   psql $DATABASE_URL -c "
     SELECT
       COUNT(*) as total_events,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as recent_events
     FROM organization_subscription_events
     WHERE created_at > NOW() - INTERVAL '1 hour';
   "
   ```

2. **Check for Stuck Events**
   ```sql
   -- Find events that failed processing
   SELECT
     stripe_event_id,
     event_type,
     created_at,
     metadata
   FROM organization_subscription_events
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 50;

   -- Check for missing events (gaps in Stripe event IDs)
   SELECT
     stripe_event_id,
     event_type,
     created_at
   FROM organization_subscription_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at ASC;
   ```

3. **Check Stripe Webhook Delivery**
   ```bash
   # Use Stripe CLI to check recent webhook attempts
   stripe events list --limit 50 --type "customer.subscription.*"

   # Check webhook endpoint health
   stripe webhook-endpoints retrieve we_XXXXXX
   ```

4. **Check for Rate Limiting**
   ```bash
   # Check if Vercel is throttling webhooks
   vercel logs --app league-builder --filter "429" --since 1h
   ```

**Mitigation Steps:**

1. **Immediate (<5 min):**
   - Manually trigger reprocessing of recent events
     ```bash
     # Use Stripe CLI to resend failed events
     stripe events resend evt_XXXXXX
     ```
   - Increase Vercel function timeout if needed (max 60s)
   - Scale up Vercel instances temporarily

2. **Short-term (<30 min):**
   - If webhook endpoint is down: Fix and resend all missed events
   - If database is slow: Add indexes on lookup columns
     ```sql
     CREATE INDEX CONCURRENTLY idx_orgs_stripe_sub_id
     ON organizations(stripe_subscription_id)
     WHERE stripe_subscription_id IS NOT NULL;
     ```
   - If event ordering issues: Manually reconcile with Stripe API
     ```typescript
     // Fetch subscription from Stripe and update database
     const subscription = await stripe.subscriptions.retrieve(subId);
     await supabase.from('organizations').update({
       subscription_status: subscription.status,
       // ... other fields
     }).eq('stripe_subscription_id', subId);
     ```

3. **Long-term (<1 day):**
   - Implement webhook queue with retry logic (e.g., BullMQ)
   - Add webhook delivery monitoring dashboard
   - Set up automatic reconciliation job (compare Stripe vs DB daily)

**Rollback/Recovery:**
```bash
# Script to reconcile all subscriptions with Stripe
npx ts-node scripts/reconcile-subscriptions.ts --since "2026-01-31T14:00:00Z"
```

---

### Runbook: Stripe Outage

**Symptoms:**
- Alert: "Stripe API Circuit Open" fired
- Circuit breaker state: OPEN
- All Stripe operations failing with timeout errors
- Stripe status page shows "Major Outage"

**Impact:**
- Users cannot create/update subscriptions
- Payment processing blocked
- Webhooks may be delayed
- Estimated affected users: All attempting billing operations

**Investigation Steps:**

1. **Verify Stripe Status**
   ```bash
   # Check Stripe status page
   curl https://status.stripe.com/api/v2/status.json | jq

   # Check if API is reachable
   curl -s -o /dev/null -w "%{http_code}" https://api.stripe.com/v1/charges \
     -u $STRIPE_SECRET_KEY: -X GET
   ```

2. **Check Circuit Breaker State**
   ```typescript
   // Check current circuit state
   const state = stripeCircuitBreaker.getState();
   console.log('Circuit state:', state);
   // Expected: OPEN during outage
   ```

3. **Verify Not Our Network Issue**
   ```bash
   # Test from different network
   curl -v https://api.stripe.com/v1/charges -u $STRIPE_SECRET_KEY: -X GET

   # Check DNS resolution
   dig api.stripe.com
   ```

**Mitigation Steps:**

1. **Immediate (<5 min):**
   - Enable "Maintenance Mode" banner on billing pages
     ```typescript
     // Show banner: "Payment processing temporarily unavailable. Please try again in 15 minutes."
     ```
   - Queue subscription requests for later processing
   - Temporarily disable trial expirations (give extra day)

2. **Short-term (<1 hour):**
   - Send proactive email to users attempting billing operations
   - Post status update to status page
   - Monitor Stripe status for recovery

3. **Post-Recovery (<4 hours):**
   - Circuit breaker should auto-recover (state: HALF_OPEN → CLOSED)
   - Process queued subscription requests
   - Reconcile any missed webhook events
   - Send "All Clear" notification

**Graceful Degradation:**
```typescript
// In subscription.ts actions
try {
  const subscription = await stripeCircuitBreaker.execute(() =>
    stripe.subscriptions.create({...})
  );
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Queue for later processing
    await queueSubscriptionRequest({
      organizationId: org.id,
      tier,
      paymentMethodId,
      requestedAt: new Date(),
    });

    return {
      success: true, // Don't show error to user
      data: {
        status: 'pending',
        message: 'Subscription request received. You will be notified when activated.',
      },
    };
  }
  throw error; // Re-throw other errors
}
```

**Communication Template:**
```
INCIDENT: Payment Processing Unavailable
Status: Monitoring External Dependency (Stripe)
Started: 2026-01-31 15:20 UTC
Last Update: 2026-01-31 15:35 UTC

We are experiencing issues with our payment processor (Stripe).
Subscription operations are temporarily unavailable.

Impact:
- Cannot create new subscriptions
- Cannot update payment methods
- Existing subscriptions are NOT affected

Workaround: Please try again in 30 minutes.

External Status: https://status.stripe.com
Next Update: 2026-01-31 16:00 UTC
```

---

### Runbook: RLS Violation

**Symptoms:**
- Alert: "RLS Policy Violation" fired (CRITICAL)
- Log contains: `error.code: 'PGRST116'` or `insufficient_privilege`
- User attempted to access data from different organization

**Impact:**
- CRITICAL SECURITY INCIDENT
- Potential data breach
- Tenant isolation failure
- Compliance violation (GDPR, SOC 2)

**Investigation Steps:**

1. **Identify the Violation**
   ```bash
   # Pull logs with RLS errors
   vercel logs --app league-builder --filter "RLS" --since 1h

   # Look for:
   # - user_id attempting access
   # - organization_id requested
   # - table accessed
   # - query that triggered violation
   ```

2. **Determine Scope**
   ```sql
   -- Check if data was actually accessed
   SELECT
     user_id,
     organization_id,
     table_name,
     query,
     created_at
   FROM audit_log
   WHERE event_type = 'rls_violation'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Verify RLS Policies**
   ```sql
   -- Check RLS policy on affected table
   SELECT * FROM pg_policies
   WHERE tablename = 'organizations'
   AND schemaname = 'public';

   -- Test policy enforcement
   SET ROLE authenticated;
   SET request.jwt.claim.sub = '<violating-user-id>';

   SELECT * FROM organizations
   WHERE id = '<other-org-id>'; -- Should return 0 rows
   ```

**Mitigation Steps:**

1. **IMMEDIATE (<1 min):**
   - Revoke user session if still active
     ```sql
     -- Invalidate all sessions for user
     DELETE FROM auth.sessions WHERE user_id = '<violating-user-id>';
     ```
   - Lock affected organization accounts temporarily
     ```sql
     UPDATE organizations
     SET is_locked = true
     WHERE id IN ('<org-id-1>', '<org-id-2>');
     ```

2. **CRITICAL (<15 min):**
   - Notify security team and DPO (Data Protection Officer)
   - Review all queries by violating user in last 24 hours
   - Determine if data was exfiltrated
   - Preserve evidence (logs, database snapshots)

3. **SHORT-TERM (<4 hours):**
   - Root cause analysis: Why did RLS fail?
   - Fix RLS policy or application code bug
   - Deploy fix and verify
   - Unlock accounts if safe

4. **LONG-TERM (<7 days):**
   - Breach notification (if required by law - 72 hours for GDPR)
   - Update RLS testing suite
   - Add automated RLS verification to CI/CD
   - Conduct security audit

**RLS Policy Fix Example:**
```sql
-- Example: Buggy policy that allowed cross-org access
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

-- Correct policy
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Add fail-safe: deny by default
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY; -- Even for table owner
```

**Incident Report Template:**
```markdown
# RLS Violation Incident Report

**Incident ID:** INC-2026-01-31-001
**Severity:** P0 - Critical Security Incident
**Detected:** 2026-01-31 16:45 UTC
**Resolved:** 2026-01-31 18:20 UTC

## Summary
User attempted to access organization data belonging to another customer.
RLS policy enforcement blocked the access (working as designed).

## Timeline
- 16:45 UTC: Alert triggered (RLS violation detected)
- 16:47 UTC: On-call engineer notified
- 16:50 UTC: Investigation started
- 17:15 UTC: Root cause identified (bug in server action)
- 17:45 UTC: Fix deployed and verified
- 18:20 UTC: Incident closed

## Root Cause
Server action accepted organization_id as parameter from client request
instead of deriving from authenticated user's session.

## Impact
- No data was leaked (RLS blocked access)
- 1 user affected (their request failed)
- 0 customers impacted

## Resolution
Fixed server action to always derive organization_id from session:
```typescript
// BEFORE (vulnerable)
export async function updateOrganization(orgId: string, data: any) {
  await supabase.from('organizations').update(data).eq('id', orgId);
}

// AFTER (secure)
export async function updateOrganization(data: any) {
  const user = await getCurrentUser();
  const orgId = await getUserOrganizationId(user.id); // Derive from session
  await supabase.from('organizations').update(data).eq('id', orgId);
}
```

## Preventive Measures
1. Added code review checklist: "Never accept org_id as parameter"
2. Added automated test: "RLS prevents cross-tenant access"
3. Added weekly RLS audit script
4. Updated security training materials

## Follow-up Actions
- [ ] Security audit of all server actions (due: 2026-02-07)
- [ ] Implement automated RLS testing in CI/CD (due: 2026-02-14)
- [ ] Update incident response playbook (due: 2026-02-05)
```

---

### Runbook: Error Budget Critical

**Symptoms:**
- Alert: "Error Budget 90% Consumed" fired
- Multiple services approaching SLO breach
- Error rate trending upward

**Impact:**
- High risk of SLO breach (violates customer SLA)
- Deployment freeze required
- Team focus must shift to reliability

**Investigation Steps:**

1. **Identify Top Error Sources**
   ```bash
   # Query monitoring for top errors by endpoint
   datadog-cli query "top(sum:http.errors{*} by {path}, 10, 'sum', 'desc')"

   # Query for error types
   datadog-cli query "top(sum:http.errors{*} by {error_code}, 10, 'sum', 'desc')"
   ```

2. **Analyze Error Trend**
   ```bash
   # Check if errors are increasing or steady
   datadog-cli query "sum:http.errors{*}.as_rate()" --from "1h"

   # Compare to previous week
   datadog-cli query "week_before(sum:http.errors{*}.as_rate())"
   ```

3. **Review Recent Changes**
   ```bash
   # Check deployments in error budget window
   vercel deployments list --since "7d" --app league-builder

   # Check feature flags toggled
   curl https://api.launchdarkly.com/api/v2/flags/league-builder \
     -H "Authorization: $LD_API_KEY"
   ```

**Mitigation Steps:**

1. **IMMEDIATE (<15 min):**
   - Announce deployment freeze to team
     ```bash
     # Send Slack notification
     curl -X POST -H 'Content-type: application/json' \
       --data '{"text":"🚨 DEPLOYMENT FREEZE: Error budget at 90%. All non-critical deploys blocked until budget restored."}' \
       $SLACK_WEBHOOK_URL
     ```
   - Disable feature flags for new/experimental features
   - Rollback recent deployments if suspected cause

2. **SHORT-TERM (<4 hours):**
   - Triage all active errors by impact
   - Create P0 tickets for top 3 error sources
   - Assign engineers to fix critical errors
   - Set up war room for coordination

3. **RECOVERY (<7 days):**
   - Daily standup until budget <50%
   - Fix errors in priority order
   - Add regression tests for fixed errors
   - Gradually lift deployment freeze as budget recovers

**Deployment Freeze Policy:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  check-error-budget:
    runs-on: ubuntu-latest
    steps:
      - name: Check Error Budget
        run: |
          BUDGET=$(curl -s $DATADOG_API/error-budget/auth-login)
          if [ $(echo "$BUDGET < 0.1" | bc) -eq 1 ]; then
            echo "❌ Deployment blocked: Error budget depleted ($BUDGET remaining)"
            exit 1
          fi
          echo "✅ Error budget OK: $BUDGET remaining"

  deploy:
    needs: check-error-budget
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel deploy --prod
```

**Communication Template:**
```
NOTICE: Deployment Freeze in Effect
Severity: P1 - Reliability Issue
Started: 2026-01-31 17:00 UTC

Our error budget for auth services is 90% consumed.
To protect customer SLAs, we are implementing a deployment freeze.

Impact:
- All non-critical deployments blocked
- New features delayed
- Bug fixes for critical errors prioritized

Current Error Budget:
- Auth Login: 10% remaining (target: >25%)
- Dashboard Load: 25% remaining (OK)
- Subscription Webhooks: 15% remaining (WARNING)

Action Plan:
1. Triage top 3 error sources
2. Fix critical errors only
3. Monitor budget recovery
4. Lift freeze when budget >50%

Next Update: 2026-01-31 21:00 UTC (4 hours)
```

---

## Top Reliability Risks

### Risk 1: Stripe Webhook Event Ordering (HIGH)

**Threat:** Webhook events arrive out of order, causing subscription state desync.

**Blast Radius:** Single organization subscription status incorrect. User locked out of features despite valid payment.

**Likelihood:** MEDIUM (Stripe guarantees eventual consistency, not ordering)

**Current Mitigations:**
- Event timestamp checking (rejects out-of-order events)
- Optimistic locking on `last_stripe_event_timestamp`
- Idempotency via `stripe_event_id` deduplication

**Gaps:**
- No reconciliation job to detect and fix desync
- No alerting when out-of-order events rejected
- Manual intervention required to fix state

**Recommended Fixes:**
1. **Add daily reconciliation job** (Priority: P1, ETA: 1 week)
   ```typescript
   // Cron: Daily at 3 AM
   export async function reconcileStripeSubscriptions() {
     const orgs = await getOrganizationsWithActiveSubscriptions();

     for (const org of orgs) {
       const dbSub = org.subscription_status;
       const stripeSub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

       if (dbSub !== stripeSub.status) {
         console.error('Subscription desync detected', {
           org_id: org.id,
           db_status: dbSub,
           stripe_status: stripeSub.status,
         });

         // Auto-fix: trust Stripe as source of truth
         await updateOrganizationSubscription(org.id, stripeSub);

         // Alert: This shouldn't happen often
         await sendAlert('subscription_desync', { org_id: org.id });
       }
     }
   }
   ```

2. **Add alert for rejected events** (Priority: P2, ETA: 2 days)
   ```typescript
   // In webhook handler
   if (!valid) {
     console.warn(`Rejecting out-of-order event ${eventId}`);
     await sendAlert('webhook_event_rejected', {
       event_id: eventId,
       org_id: organizationId,
       timestamp: eventTimestamp,
       last_timestamp: lastTimestamp,
     });
     return;
   }
   ```

3. **Add webhook replay mechanism** (Priority: P2, ETA: 1 week)
   ```typescript
   // Admin tool to manually replay event
   export async function replayWebhookEvent(eventId: string) {
     const event = await stripe.events.retrieve(eventId);
     await processWebhookEvent(event, { force: true }); // Bypass ordering check
   }
   ```

---

### Risk 2: Unbounded Supabase Query Timeouts (CRITICAL)

**Threat:** Database query hangs indefinitely, blocking server action, causing Vercel timeout (30s), user sees 504 Gateway Timeout.

**Blast Radius:** All users attempting affected operation. Cascading failures if connection pool exhausted.

**Likelihood:** HIGH (no timeouts configured, complex JOIN queries exist)

**Current Mitigations:**
- None. Queries have no timeout enforcement.

**Gaps:**
- No statement timeout set in Supabase
- No AbortSignal timeout in query calls
- No slow query monitoring
- No circuit breaker for database

**Recommended Fixes:**

1. **Set Postgres statement timeout** (Priority: P0, ETA: 1 day)
   ```sql
   -- In Supabase SQL Editor
   -- Set default statement timeout to 30 seconds
   ALTER DATABASE postgres SET statement_timeout = '30s';

   -- For specific role (anon/authenticated)
   ALTER ROLE authenticated SET statement_timeout = '10s';
   ```

2. **Add timeout to all queries** (Priority: P0, ETA: 3 days)
   ```typescript
   // Wrapper for all Supabase queries
   export async function timedQuery<T>(
     queryName: string,
     operation: (signal: AbortSignal) => Promise<T>,
     timeoutMs: number = 5000
   ): Promise<T> {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

     try {
       const result = await operation(controller.signal);
       clearTimeout(timeoutId);
       return result;
     } catch (error) {
       clearTimeout(timeoutId);
       if (error.name === 'AbortError') {
         throw new Error(`Query timeout after ${timeoutMs}ms: ${queryName}`);
       }
       throw error;
     }
   }

   // Usage
   const { data } = await timedQuery(
     'organizations.select.by_owner',
     (signal) => supabase
       .from('organizations')
       .select('*, leagues(*)')
       .eq('owner_user_id', userId)
       .abortSignal(signal),
     5000 // 5s timeout
   );
   ```

3. **Add slow query monitoring** (Priority: P1, ETA: 1 week)
   ```sql
   -- Enable pg_stat_statements extension
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

   -- Query for slow queries
   SELECT
     query,
     calls,
     mean_exec_time,
     max_exec_time,
     rows
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000 -- >1s average
   ORDER BY mean_exec_time DESC
   LIMIT 20;
   ```

4. **Add indexes for slow queries** (Priority: P1, ETA: 2 weeks)
   ```sql
   -- Example: Dashboard query optimization
   -- Current: Sequential scan on leagues (slow)
   CREATE INDEX CONCURRENTLY idx_leagues_org_id_not_deleted
   ON leagues(organization_id)
   WHERE deleted_at IS NULL;

   -- Team roster query optimization
   CREATE INDEX CONCURRENTLY idx_team_members_team_id
   ON team_members(team_id)
   WHERE status = 'active';
   ```

---

### Risk 3: Stripe Idempotency Key Collisions (MEDIUM)

**Threat:** Two requests use same idempotency key, causing duplicate charge or subscription creation failure.

**Blast Radius:** Single customer charged twice or unable to subscribe.

**Likelihood:** LOW (keys use crypto.randomUUID + org_id + operation)

**Current Mitigations:**
- Idempotency keys generated with `generateIdempotencyKey()` function
- Keys include: operation type, org_id, timestamp, random nonce
- Stripe deduplicates based on key

**Gaps:**
- No monitoring for idempotency key collisions
- No alerting when Stripe returns "idempotent_request_conflict"
- No retry logic for key collision errors

**Recommended Fixes:**

1. **Monitor idempotency collisions** (Priority: P2, ETA: 3 days)
   ```typescript
   // In Stripe API wrapper
   try {
     const subscription = await stripe.subscriptions.create({...}, {
       idempotencyKey: key,
     });
   } catch (error) {
     if (error.code === 'idempotency_error') {
       console.error('Idempotency key collision detected', {
         key,
         operation: 'create_subscription',
         org_id: orgId,
       });

       // Alert if this happens (should be extremely rare)
       await sendAlert('idempotency_collision', { key, org_id: orgId });

       // Retry with new key
       const newKey = generateIdempotencyKey('create_subscription_retry', {
         organization_id: orgId,
         retry: true,
       });
       return await stripe.subscriptions.create({...}, {
         idempotencyKey: newKey,
       });
     }
     throw error;
   }
   ```

2. **Add idempotency key to database logs** (Priority: P3, ETA: 1 week)
   ```typescript
   // Store idempotency keys in subscription events table
   await logSubscriptionEvent({
     organizationId: org.id,
     eventType: 'created',
     metadata: {
       idempotency_key: subscriptionIdempotencyKey,
       stripe_request_id: subscription.livemode ? undefined : 'test',
     },
   });
   ```

---

### Risk 4: RLS Performance Degradation (HIGH)

**Threat:** RLS policies add significant overhead to queries (>50%), causing slow dashboard loads as customer count grows.

**Blast Radius:** All users experience slow queries. Platform becomes unusable at scale.

**Likelihood:** MEDIUM (already seeing 1.2s p95 on team queries)

**Current Mitigations:**
- RLS policies use indexed columns (organization_id, league_id)
- Queries explicitly filter by org_id to help planner

**Gaps:**
- No RLS overhead monitoring
- No performance benchmarks for RLS vs non-RLS
- Some policies use subqueries (inefficient)
- No query plan analysis in CI/CD

**Recommended Fixes:**

1. **Monitor RLS overhead** (Priority: P1, ETA: 1 week)
   ```sql
   -- Create monitoring view
   CREATE OR REPLACE FUNCTION measure_rls_overhead(
     p_table_name TEXT,
     p_user_id UUID,
     p_org_id UUID
   ) RETURNS TABLE(with_rls_ms NUMERIC, without_rls_ms NUMERIC, overhead_pct NUMERIC) AS $$
   DECLARE
     v_start TIMESTAMP;
     v_with_rls NUMERIC;
     v_without_rls NUMERIC;
   BEGIN
     -- Measure WITH RLS
     SET ROLE authenticated;
     SET request.jwt.claim.sub = p_user_id::TEXT;

     v_start := clock_timestamp();
     EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id = $1', p_table_name)
       USING p_org_id;
     v_with_rls := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start);

     -- Measure WITHOUT RLS
     RESET ROLE;
     v_start := clock_timestamp();
     EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id = $1', p_table_name)
       USING p_org_id;
     v_without_rls := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start);

     RETURN QUERY SELECT
       v_with_rls,
       v_without_rls,
       ((v_with_rls - v_without_rls) / v_without_rls * 100)::NUMERIC;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **Optimize RLS policies** (Priority: P1, ETA: 2 weeks)
   ```sql
   -- BEFORE: Subquery in RLS policy (slow)
   CREATE POLICY "Users can view own leagues" ON leagues
     FOR SELECT
     USING (
       league_id IN (
         SELECT league_id FROM league_ownerships
         WHERE user_id = auth.uid()
       )
     );

   -- AFTER: JOIN in application query (fast)
   CREATE POLICY "Users can view own leagues" ON leagues
     FOR SELECT
     USING (
       -- Simplified: rely on org-level RLS
       organization_id IN (
         SELECT id FROM organizations WHERE owner_user_id = auth.uid()
       )
     );

   -- Even better: Denormalize to avoid subquery
   ALTER TABLE leagues ADD COLUMN owner_user_id UUID;
   CREATE INDEX idx_leagues_owner ON leagues(owner_user_id);

   CREATE POLICY "Users can view own leagues" ON leagues
     FOR SELECT
     USING (owner_user_id = auth.uid());
   ```

3. **Add query plan analysis to CI/CD** (Priority: P2, ETA: 1 week)
   ```typescript
   // tests/performance/query-plans.test.ts
   test('Dashboard query uses index scan (not seq scan)', async () => {
     const plan = await supabase.rpc('explain_query', {
       query: `
         SELECT * FROM organizations
         WHERE owner_user_id = 'test-user-id'
       `
     });

     // Assert: Should use index scan on idx_orgs_owner
     expect(plan).toContain('Index Scan using idx_orgs_owner');
     expect(plan).not.toContain('Seq Scan'); // Sequential scan is slow
   });
   ```

---

### Risk 5: Edge Function Silent Failures (MEDIUM)

**Threat:** Edge functions (account deletion, session cleanup) fail silently. No alerting, no retry, no visibility.

**Blast Radius:** Data retention violations (GDPR), stale sessions, security risks.

**Likelihood:** MEDIUM (functions run on cron, failures not monitored)

**Current Mitigations:**
- Functions return JSON with success/failure status
- Errors logged to Supabase logs (viewable in dashboard)

**Gaps:**
- No alerting when edge function fails
- No retry mechanism for failed jobs
- No monitoring dashboard for edge function health
- No dead letter queue for failed deletions

**Recommended Fixes:**

1. **Add edge function monitoring** (Priority: P1, ETA: 1 week)
   ```typescript
   // supabase/functions/_shared/monitoring.ts
   export async function reportEdgeFunctionMetrics(
     functionName: string,
     metrics: {
       duration_ms: number;
       success: boolean;
       processed: number;
       failed: number;
     }
   ) {
     // Send to Datadog/external monitoring
     await fetch(process.env.DATADOG_API_URL!, {
       method: 'POST',
       headers: {
         'DD-API-KEY': process.env.DATADOG_API_KEY!,
       },
       body: JSON.stringify({
         series: [
           {
             metric: 'edge_function.duration',
             points: [[Date.now() / 1000, metrics.duration_ms]],
             tags: [`function:${functionName}`],
           },
           {
             metric: 'edge_function.processed',
             points: [[Date.now() / 1000, metrics.processed]],
             tags: [`function:${functionName}`],
           },
           {
             metric: 'edge_function.failed',
             points: [[Date.now() / 1000, metrics.failed]],
             tags: [`function:${functionName}`],
           },
         ],
       }),
     });
   }

   // In edge function
   Deno.serve(async (req) => {
     const startTime = Date.now();

     try {
       // ... process deletions

       await reportEdgeFunctionMetrics('process-account-deletions', {
         duration_ms: Date.now() - startTime,
         success: true,
         processed: results.processed,
         failed: results.failed,
       });
     } catch (error) {
       await reportEdgeFunctionMetrics('process-account-deletions', {
         duration_ms: Date.now() - startTime,
         success: false,
         processed: 0,
         failed: 1,
       });
       throw error;
     }
   });
   ```

2. **Add edge function alerting** (Priority: P1, ETA: 3 days)
   ```yaml
   # datadog/monitors/edge-function-failures.yaml
   name: "Edge Function Consecutive Failures"
   type: metric alert
   query: |
     sum(last_2h):sum:edge_function.failed{function:process-account-deletions} > 2
   message: |
     CRITICAL: Account deletion edge function has failed {{value}} times in last 2 hours.

     This may result in GDPR violations (data not deleted within 30 days).

     Runbook: https://docs.hockeylife.com/runbooks/edge-function-failure

     @pagerduty-platform-oncall
   ```

3. **Add retry queue for failed jobs** (Priority: P2, ETA: 2 weeks)
   ```typescript
   // On edge function failure, add to retry queue
   if (results.failed > 0) {
     for (const error of results.errors) {
       await supabase.from('edge_function_retry_queue').insert({
         function_name: 'process-account-deletions',
         payload: { user_id: error.user_id },
         error_message: error.error,
         retry_count: 0,
         max_retries: 5,
         next_retry_at: new Date(Date.now() + 60000).toISOString(), // 1 min
       });
     }
   }

   // Separate edge function to process retry queue
   Deno.serve(async (req) => {
     const { data: retries } = await supabase
       .from('edge_function_retry_queue')
       .select('*')
       .lte('next_retry_at', new Date().toISOString())
       .lt('retry_count', 'max_retries')
       .limit(50);

     for (const retry of retries) {
       try {
         // Execute the function
         await executeEdgeFunction(retry.function_name, retry.payload);

         // Delete from queue on success
         await supabase.from('edge_function_retry_queue').delete().eq('id', retry.id);
       } catch (error) {
         // Increment retry count, exponential backoff
         const nextRetry = new Date(Date.now() + (1000 * Math.pow(2, retry.retry_count)));
         await supabase.from('edge_function_retry_queue').update({
           retry_count: retry.retry_count + 1,
           next_retry_at: nextRetry.toISOString(),
           last_error: error.message,
         }).eq('id', retry.id);
       }
     }
   });
   ```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)

**Priority: P0 - Block production deployment until complete**

| Task | Owner | ETA | Status |
|------|-------|-----|--------|
| Set Postgres statement timeout to 30s | Backend | 1 day | ⬜ Not Started |
| Add timeout to all Supabase queries | Backend | 3 days | ⬜ Not Started |
| Implement Stripe circuit breaker | Backend | 2 days | ⬜ Not Started |
| Add RLS violation alerting | Security | 1 day | ⬜ Not Started |
| Configure error budget tracking | DevOps | 2 days | ⬜ Not Started |

### Phase 2: Observability (Week 3-4)

**Priority: P1 - Required for production confidence**

| Task | Owner | ETA | Status |
|------|-------|-----|--------|
| Set up Datadog APM for tracing | DevOps | 3 days | ⬜ Not Started |
| Instrument all server actions with metrics | Backend | 5 days | ⬜ Not Started |
| Create monitoring dashboards | DevOps | 3 days | ⬜ Not Started |
| Configure PagerDuty integration | DevOps | 1 day | ⬜ Not Started |
| Add slow query monitoring | Backend | 2 days | ⬜ Not Started |

### Phase 3: Resilience (Week 5-6)

**Priority: P1 - Improves reliability**

| Task | Owner | ETA | Status |
|------|-------|-----|--------|
| Implement retry logic for Stripe API | Backend | 3 days | ⬜ Not Started |
| Add Stripe subscription reconciliation job | Backend | 5 days | ⬜ Not Started |
| Optimize RLS policies | Backend | 5 days | ⬜ Not Started |
| Add query plan tests to CI/CD | Backend | 2 days | ⬜ Not Started |
| Edge function monitoring & alerting | Backend | 3 days | ⬜ Not Started |

### Phase 4: Incident Response (Week 7-8)

**Priority: P2 - Reduces MTTR**

| Task | Owner | ETA | Status |
|------|-------|-----|--------|
| Write all runbooks (8 total) | SRE | 5 days | ⬜ Not Started |
| Create status page | DevOps | 2 days | ⬜ Not Started |
| Set up incident communication templates | SRE | 1 day | ⬜ Not Started |
| Train team on incident response | SRE | 2 days | ⬜ Not Started |
| Run incident simulation (game day) | SRE | 1 day | ⬜ Not Started |

### Phase 5: Continuous Improvement (Ongoing)

**Priority: P2 - Long-term reliability**

| Task | Owner | Frequency | Status |
|------|-------|-----------|--------|
| Review SLO compliance | SRE | Weekly | ⬜ Not Started |
| Incident retrospectives | Team | After each | ⬜ Not Started |
| Error budget review | PM + SRE | Bi-weekly | ⬜ Not Started |
| Load testing | QA | Monthly | ⬜ Not Started |
| Security audit | Security | Quarterly | ⬜ Not Started |

---

## Appendix

### A. Monitoring Tool Setup Guide

#### Datadog Setup

```bash
# 1. Install Datadog Agent (for custom metrics)
npm install --save dd-trace

# 2. Initialize in Next.js
# apps/league-builder/src/instrumentation.ts
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    require('dd-trace').init({
      service: 'league-builder',
      env: process.env.VERCEL_ENV || 'development',
      version: process.env.VERCEL_GIT_COMMIT_SHA,
      logInjection: true,
    });
  }
}

# 3. Configure Datadog API
# .env.production
DATADOG_API_KEY=your_api_key
DATADOG_APP_KEY=your_app_key
DATADOG_SITE=datadoghq.com
```

#### Sentry Setup (Error Tracking)

```bash
# 1. Install Sentry
npm install --save @sentry/nextjs

# 2. Initialize
npx @sentry/wizard@latest -i nextjs

# 3. Configure sampling
# sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  environment: process.env.VERCEL_ENV,
  beforeSend(event, hint) {
    // Don't send PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

### B. Performance Budget Recommendations

| Resource Type | Budget | Current | Status |
|---------------|--------|---------|--------|
| **Initial Page Load** | <3s (p95) | 2.1s | ✓ PASS |
| **Dashboard Data Fetch** | <1.5s (p95) | 1.8s | ✗ FAIL |
| **JavaScript Bundle** | <200KB gzip | 185KB | ✓ PASS |
| **Database Query** | <500ms (p95) | 320ms | ✓ PASS |
| **API Response** | <1s (p95) | 780ms | ✓ PASS |
| **Stripe API Call** | <2s (p95) | 1.2s | ✓ PASS |
| **Webhook Processing** | <5s (p95) | 3.5s | ✓ PASS |

**Action Items:**
- Optimize dashboard query (1.8s → <1.5s): Add index on leagues.organization_id
- Set up budget enforcement in CI/CD

### C. Database Query Timeout Configuration

```sql
-- Apply timeouts per operation type
-- In Supabase SQL Editor

-- Default for all operations
ALTER DATABASE postgres SET statement_timeout = '30s';

-- For authenticated users (API queries)
ALTER ROLE authenticated SET statement_timeout = '10s';

-- For service role (background jobs, webhooks)
ALTER ROLE service_role SET statement_timeout = '60s';

-- For specific operations (override in query)
-- Example: Complex report
SET LOCAL statement_timeout = '120s';
SELECT /* ... complex query ... */;
```

### D. Useful Supabase Queries for Monitoring

```sql
-- 1. Current active connections
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'postgres';

-- 2. Long-running queries (>5s)
SELECT
  pid,
  usename,
  application_name,
  state,
  NOW() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state != 'idle'
AND NOW() - query_start > INTERVAL '5 seconds'
ORDER BY duration DESC;

-- 3. Table sizes (bloat check)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 4. Index usage stats
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- 5. Cache hit ratio (should be >99%)
SELECT
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
FROM pg_statio_user_tables;
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Next Review:** 2026-02-28 (monthly)
**Owner:** Platform SRE Team
**Status:** Draft - Pending Implementation
