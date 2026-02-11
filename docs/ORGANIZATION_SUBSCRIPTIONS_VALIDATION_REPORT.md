# Organization Subscriptions - Validation Report

**Date:** 2026-02-11
**Feature:** Enterprise Subscription System (Platform 1)
**Status:** VALIDATION IN PROGRESS

---

## Executive Summary

This report validates the end-to-end subscription flow for Platform 1 organization subscriptions. The system implements enterprise-only licensing with Stripe webhook integration, PostgreSQL advisory locks for race condition prevention, and comprehensive idempotency guarantees.

**Validation Status:**
- [ ] Automated Tests Created
- [ ] Manual Stripe CLI Testing Completed
- [ ] Environment Variables Validated
- [ ] Database Schema Validated
- [ ] Integration Flow Tested
- [ ] Pre-Ship Checklist Complete
- [ ] Rollout Plan Documented

---

## 1. Automated Tests

### 1.1 Unit Tests Required

**Location:** `apps/league-builder/src/lib/stripe/__tests__/`

#### Test: `client.test.ts` - Price/Tier Mapping
```typescript
describe('getPriceIdByTier', () => {
  it('should return enterprise price ID for enterprise tier')
  it('should throw error if price ID not configured')
})

describe('getTierByPriceId', () => {
  it('should return enterprise for enterprise price ID')
  it('should return null for unknown price ID')
  it('should handle case sensitivity')
})
```

#### Test: `webhooks.test.ts` - Webhook Handler Logic
```typescript
describe('Subscription Webhook Idempotency', () => {
  it('should detect duplicate events via organization_subscription_events table')
  it('should process new events normally')
  it('should handle race conditions with advisory locks')
})

describe('Event Ordering', () => {
  it('should reject events older than last_stripe_event_timestamp')
  it('should accept events equal to or newer than last timestamp')
  it('should update timestamp after successful processing')
})

describe('Subscription Lifecycle', () => {
  it('should handle subscription.created correctly')
  it('should handle subscription.updated (status change)')
  it('should handle subscription.updated (tier change)')
  it('should handle subscription.deleted (cancellation)')
})

describe('Invoice Events', () => {
  it('should handle invoice.paid (payment success)')
  it('should handle invoice.payment_failed (update to past_due)')
  it('should restore active status after payment succeeds')
})
```

**Status:** NOT CREATED YET

---

### 1.2 Integration Tests Required

#### Test: Database Schema Validation
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'organizations',
  'organization_subscription_events',
  'organization_addons'
);

-- Verify webhook_events table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'webhook_events';

-- Verify required columns on organizations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
AND column_name IN (
  'stripe_customer_id',
  'stripe_subscription_id',
  'subscription_tier',
  'subscription_status',
  'last_stripe_event_timestamp'
);

-- Verify RPC functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'acquire_webhook_lock',
  'log_organization_subscription_event'
);
```

**Status:** SCHEMA VALIDATION PENDING

---

## 2. Manual Stripe CLI Testing

### 2.1 Setup Stripe CLI

```bash
# Install Stripe CLI (if not already installed)
# Windows: scoop install stripe
# macOS: brew install stripe/stripe-cli/stripe
# Linux: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Start webhook forwarding
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
```

### 2.2 Test Scenarios

#### Scenario 1: Subscription Creation
```bash
# Trigger subscription.created event
stripe trigger customer.subscription.created

# Expected outcome:
# - Event logged in organization_subscription_events
# - Organization updated with subscription_tier = 'enterprise'
# - Organization updated with subscription_status = 'active'
# - last_stripe_event_timestamp updated
```

#### Scenario 2: Payment Success
```bash
# Trigger invoice.paid event
stripe trigger invoice.paid

# Expected outcome:
# - Event logged with type 'payment_succeeded'
# - If organization was past_due, status restored to 'active'
# - last_stripe_event_timestamp updated
```

#### Scenario 3: Payment Failure
```bash
# Trigger invoice.payment_failed event
stripe trigger invoice.payment_failed

# Expected outcome:
# - Event logged with type 'payment_failed'
# - Organization subscription_status updated to 'past_due'
# - last_stripe_event_timestamp updated
```

#### Scenario 4: Subscription Cancellation
```bash
# Trigger subscription.deleted event
stripe trigger customer.subscription.deleted

# Expected outcome:
# - Event logged with type 'cancelled'
# - Organization subscription_status updated to 'canceled'
# - stripe_subscription_id set to NULL
# - cancelled_at timestamp set
```

#### Scenario 5: Duplicate Event Handling
```bash
# Send same event twice (manually trigger same webhook)
# Use Stripe Dashboard -> Webhooks -> Select event -> Resend

# Expected outcome:
# - First event processes normally
# - Second event returns {received: true, duplicate: true}
# - No duplicate database entries created
```

**Status:** MANUAL TESTING NOT STARTED

---

## 3. Environment Validation

### 3.1 Required Environment Variables

**File:** `.env.example` (template)
**File:** `.env.local` (actual values, NOT in git)

| Variable | Purpose | Required | Validated |
|----------|---------|----------|-----------|
| `STRIPE_SECRET_KEY` | Stripe API key | ✅ Yes | ⏳ Pending |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side key | ✅ Yes | ⏳ Pending |
| `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS` | Webhook signature verification | ✅ Yes | ⏳ Pending |
| `STRIPE_PRICE_ENTERPRISE` | Enterprise tier price ID | ✅ Yes | ⏳ Pending |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes | ⏳ Pending |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for webhooks | ✅ Yes | ⏳ Pending |

### 3.2 Validation Script

Create script: `scripts/validate-stripe-env.ts`

```typescript
#!/usr/bin/env node
import { config } from 'dotenv';
import { stripe, STRIPE_PRICE_IDS, STRIPE_WEBHOOK_SECRET_ORGANIZATIONS } from '../apps/league-builder/src/lib/stripe/client';

config({ path: '.env.local' });

async function validateStripeEnv() {
  console.log('🔍 Validating Stripe Environment...\n');

  const checks = [
    {
      name: 'STRIPE_SECRET_KEY',
      test: () => !!process.env.STRIPE_SECRET_KEY,
      critical: true
    },
    {
      name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      test: () => !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      critical: true
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET_ORGANIZATIONS',
      test: () => !!STRIPE_WEBHOOK_SECRET_ORGANIZATIONS,
      critical: true
    },
    {
      name: 'STRIPE_PRICE_ENTERPRISE',
      test: () => !!STRIPE_PRICE_IDS.enterprise,
      critical: true
    },
    {
      name: 'Stripe API Connection',
      test: async () => {
        try {
          await stripe.customers.list({ limit: 1 });
          return true;
        } catch {
          return false;
        }
      },
      critical: true
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    const result = typeof check.test === 'function' ? await check.test() : check.test;
    if (result) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name} ${check.critical ? '(CRITICAL)' : ''}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

validateStripeEnv();
```

**Status:** SCRIPT NOT CREATED YET

---

## 4. Database Schema Validation

### 4.1 Tables Verified

| Table | Purpose | Status |
|-------|---------|--------|
| `organizations` | Main subscription tracking | ✅ EXISTS |
| `organization_subscription_events` | Event audit log | ✅ EXISTS |
| `organization_addons` | Add-on subscriptions (future) | ✅ EXISTS |
| `webhook_events` | Generic webhook tracking | ✅ EXISTS |

### 4.2 Required Columns on `organizations`

| Column | Type | Nullable | Status |
|--------|------|----------|--------|
| `stripe_customer_id` | text | YES | ⏳ Verify |
| `stripe_subscription_id` | text | YES | ⏳ Verify |
| `subscription_tier` | text | YES | ⏳ Verify |
| `subscription_status` | text | YES | ⏳ Verify |
| `current_period_start` | timestamptz | YES | ⏳ Verify |
| `current_period_end` | timestamptz | YES | ⏳ Verify |
| `cancel_at_period_end` | boolean | YES | ⏳ Verify |
| `cancelled_at` | timestamptz | YES | ⏳ Verify |
| `last_stripe_event_timestamp` | bigint | YES | ⏳ Verify |

### 4.3 Required RPC Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `acquire_webhook_lock` | PostgreSQL advisory lock | ⏳ Verify |
| `log_organization_subscription_event` | Event logging with idempotency | ⏳ Verify |

**Status:** DATABASE SCHEMA VERIFICATION PENDING

---

## 5. Integration Validation

### 5.1 End-to-End Subscription Flow

**Test Path:** Manual UI Testing

1. **Navigate to subscription settings**
   - URL: `http://localhost:3000/{org-slug}/settings/subscription`
   - Verify page loads without errors
   - Verify current tier displays correctly

2. **Click upgrade button**
   - Redirects to Stripe Checkout
   - Checkout session created with correct price ID
   - Success URL: `/{org-slug}/settings/subscription/success`
   - Cancel URL: `/{org-slug}/settings/subscription`

3. **Complete checkout**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

4. **Verify redirect to success page**
   - URL: `/{org-slug}/settings/subscription/success`
   - Success message displays
   - Link back to settings works

5. **Check database updated**
   ```sql
   SELECT
     stripe_subscription_id,
     subscription_tier,
     subscription_status,
     current_period_start,
     current_period_end
   FROM organizations
   WHERE id = '{org-id}';
   ```
   - Verify subscription_tier = 'enterprise'
   - Verify subscription_status = 'active'
   - Verify timestamps are set

6. **Verify webhook processed**
   ```sql
   SELECT
     event_type,
     from_tier,
     to_tier,
     to_status,
     stripe_event_id,
     created_at
   FROM organization_subscription_events
   WHERE organization_id = '{org-id}'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Verify 'created' event logged
   - Verify stripe_event_id is set

### 5.2 Billing Portal Flow

**Test Path:** Manual UI Testing

1. Navigate to subscription settings
2. Click "Manage billing" button
3. Redirects to Stripe Customer Portal
4. Verify portal loads correctly
5. Return URL works: `/{org-slug}/settings/subscription`

**Status:** INTEGRATION TESTING NOT STARTED

---

## 6. Pre-Ship Checklist

### 6.1 Code Quality

- [ ] TypeScript: No type errors in modified files
- [ ] Linting: No ESLint errors
- [ ] Formatting: Code follows project conventions
- [ ] Comments: Complex logic documented
- [ ] Security: No secrets in code or git history

### 6.2 Testing

- [ ] Unit tests pass (when created)
- [ ] Integration tests pass (when created)
- [ ] Manual Stripe CLI testing complete
- [ ] End-to-end flow tested locally

### 6.3 Documentation

- [ ] .env.example updated with all required variables
- [ ] README updated if needed
- [ ] Migration guide created if needed
- [ ] Rollback plan documented

### 6.4 Git Status

- [ ] All changes committed
- [ ] Commit messages follow convention
- [ ] No uncommitted changes
- [ ] No secrets in git history

**Status:** PRE-SHIP CHECKLIST NOT COMPLETE

---

## 7. Rollout Plan

### 7.1 Phase 1: Preview Environment

1. **Deploy to preview**
   - Push to `main` branch
   - Vercel auto-deploys to preview environment
   - Preview URL: `https://<preview-url>.vercel.app`

2. **Configure Stripe Test Mode**
   - Use test API keys
   - Create test webhook endpoint in Stripe Dashboard
   - Webhook URL: `https://<preview-url>.vercel.app/api/stripe/webhooks/subscriptions`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `payment_method.attached`

3. **Test webhooks in preview**
   - Complete full subscription flow
   - Trigger webhook events via Stripe CLI
   - Verify logs in Vercel dashboard
   - Check database state

### 7.2 Phase 2: Production Deployment

1. **Merge to production**
   - Create PR from `main` to `production`
   - Review changes carefully
   - Get approval (if team process requires)
   - Merge PR

2. **Configure Stripe Live Mode**
   - Update environment variables to live keys
   - Create production webhook endpoint
   - Webhook URL: `https://beerleaguehockey.ca/api/stripe/webhooks/subscriptions`
   - **CRITICAL:** Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS`

3. **Monitor deployment**
   - Check Vercel deployment logs
   - Monitor Stripe webhook logs
   - Watch for errors in Sentry (if configured)

### 7.3 Phase 3: Validation

1. **Create test subscription**
   - Use real account (non-production org)
   - Complete full flow
   - Verify webhook processing

2. **Test idempotency**
   - Resend webhook event via Stripe Dashboard
   - Verify duplicate detection works
   - Check no duplicate database entries

3. **Monitor for 24 hours**
   - Watch for webhook failures
   - Check error logs
   - Verify no race conditions

### 7.4 Rollback Plan

**If critical issues found:**

1. **Immediate rollback**
   ```bash
   # Revert production branch to previous commit
   git checkout production
   git revert HEAD
   git push origin production
   ```

2. **Disable webhooks**
   - Go to Stripe Dashboard → Webhooks
   - Disable webhook endpoint temporarily
   - Prevents further processing until fix deployed

3. **Database rollback** (if needed)
   ```sql
   -- Rollback recent subscription changes
   -- ONLY if data corruption detected
   -- BE EXTREMELY CAREFUL
   ```

4. **Communication**
   - Alert team of rollback
   - Document issue in incident log
   - Plan fix and redeployment

**Status:** ROLLOUT NOT STARTED

---

## 8. Known Issues & Limitations

### 8.1 Current Limitations

1. **Single-tier model only**
   - Only supports 'enterprise' tier currently
   - Multi-tier pricing requires code updates

2. **No add-ons yet**
   - `organization_addons` table exists but not used
   - Future feature for modular pricing

3. **Test mode only**
   - Not yet tested with production Stripe account
   - Live mode deployment pending

### 8.2 Future Enhancements

1. **Add automated tests**
   - Unit tests for webhook handlers
   - Integration tests for database operations
   - E2E tests for subscription flow

2. **Add monitoring**
   - Alert on webhook failures
   - Track subscription metrics
   - Monitor payment success rates

3. **Add admin UI**
   - View subscription events
   - Manual subscription management
   - Refund/credit issuance

---

## 9. Sign-Off

### 9.1 Validation Completed By

- [ ] **Developer:** _______________  Date: _______
- [ ] **QA:** _______________  Date: _______
- [ ] **Product:** _______________  Date: _______

### 9.2 Deployment Authorization

- [ ] **Approved for Preview:** _______________  Date: _______
- [ ] **Approved for Production:** _______________  Date: _______

---

## Appendix A: Test Card Numbers

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`
- Insufficient funds: `4000 0000 0000 9995`

**All test cards:**
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any valid format

---

## Appendix B: Useful SQL Queries

### Check subscription status
```sql
SELECT
  o.name,
  o.subscription_tier,
  o.subscription_status,
  o.current_period_end,
  o.cancel_at_period_end
FROM organizations o
WHERE o.subscription_tier = 'enterprise';
```

### View recent subscription events
```sql
SELECT
  o.name,
  e.event_type,
  e.from_tier,
  e.to_tier,
  e.to_status,
  e.created_at
FROM organization_subscription_events e
JOIN organizations o ON o.id = e.organization_id
ORDER BY e.created_at DESC
LIMIT 20;
```

### Check for duplicate events
```sql
SELECT
  stripe_event_id,
  COUNT(*) as count
FROM organization_subscription_events
WHERE stripe_event_id IS NOT NULL
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;
```

---

**End of Validation Report**
