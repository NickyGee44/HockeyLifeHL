# Stripe CLI Testing Guide

Complete guide for testing organization subscriptions using the Stripe CLI.

---

## Table of Contents

1. [Setup](#setup)
2. [Webhook Forwarding](#webhook-forwarding)
3. [Test Scenarios](#test-scenarios)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Setup

### Install Stripe CLI

**Windows (Scoop):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### Login to Stripe

```bash
# Login with your Stripe account
stripe login

# Verify login
stripe config --list
```

---

## Webhook Forwarding

### Start Local Development Server

```bash
# Terminal 1: Start league-builder app
pnpm dev:builder

# App runs on http://localhost:3000
```

### Forward Webhooks to Local Server

```bash
# Terminal 2: Start webhook forwarding
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions

# Output will show:
# > Ready! Your webhook signing secret is whsec_... (^C to quit)
```

**IMPORTANT:** Copy the webhook signing secret (`whsec_...`) and add it to your `.env.local`:

```bash
# .env.local
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
```

Restart your dev server after adding the secret.

---

## Test Scenarios

### Scenario 1: New Subscription Creation

**Event:** `customer.subscription.created`

```bash
stripe trigger customer.subscription.created
```

**Expected Behavior:**
1. Webhook received at `/api/stripe/webhooks/subscriptions`
2. Event logged in `organization_subscription_events` table
3. Organization updated:
   - `subscription_tier` = `'enterprise'`
   - `subscription_status` = `'active'`
   - `stripe_subscription_id` = subscription ID
   - `current_period_start` and `current_period_end` set
   - `last_stripe_event_timestamp` updated

**Verification SQL:**
```sql
-- Check organization updated
SELECT
  stripe_subscription_id,
  subscription_tier,
  subscription_status,
  current_period_start,
  current_period_end,
  last_stripe_event_timestamp
FROM organizations
WHERE stripe_subscription_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;

-- Check event logged
SELECT
  event_type,
  to_tier,
  to_status,
  stripe_event_id,
  created_at
FROM organization_subscription_events
ORDER BY created_at DESC
LIMIT 1;
```

---

### Scenario 2: Subscription Update (Status Change)

**Event:** `customer.subscription.updated`

```bash
stripe trigger customer.subscription.updated
```

**Expected Behavior:**
1. Webhook received
2. Event type determined (updated, upgraded, downgraded, payment_failed)
3. Organization subscription fields updated
4. Event logged with from/to states

**Verification SQL:**
```sql
-- Check latest event
SELECT
  event_type,
  from_tier,
  to_tier,
  from_status,
  to_status,
  created_at
FROM organization_subscription_events
ORDER BY created_at DESC
LIMIT 1;
```

---

### Scenario 3: Invoice Paid (Payment Success)

**Event:** `invoice.paid`

```bash
stripe trigger invoice.paid
```

**Expected Behavior:**
1. Webhook received
2. Event logged as `'payment_succeeded'`
3. If organization was `'past_due'`, status restored to `'active'`
4. Amount logged in event metadata

**Setup for Past Due Test:**
```sql
-- Manually set organization to past_due
UPDATE organizations
SET subscription_status = 'past_due'
WHERE id = 'your-org-id';
```

**Verification SQL:**
```sql
-- Check status restored
SELECT
  subscription_status,
  updated_at
FROM organizations
WHERE id = 'your-org-id';

-- Check payment event logged
SELECT
  event_type,
  amount_cents,
  created_at
FROM organization_subscription_events
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Scenario 4: Invoice Payment Failed

**Event:** `invoice.payment_failed`

```bash
stripe trigger invoice.payment_failed
```

**Expected Behavior:**
1. Webhook received
2. Event logged as `'payment_failed'`
3. Organization status updated to `'past_due'`
4. Metadata includes `attempt_count` and `next_payment_attempt`

**Verification SQL:**
```sql
-- Check status updated to past_due
SELECT
  subscription_status,
  updated_at
FROM organizations
WHERE subscription_status = 'past_due'
ORDER BY updated_at DESC
LIMIT 1;

-- Check event logged with metadata
SELECT
  event_type,
  amount_cents,
  metadata,
  created_at
FROM organization_subscription_events
ORDER BY created_at DESC
LIMIT 1;
```

---

### Scenario 5: Subscription Deleted (Cancellation)

**Event:** `customer.subscription.deleted`

```bash
stripe trigger customer.subscription.deleted
```

**Expected Behavior:**
1. Webhook received
2. Event logged as `'cancelled'`
3. Organization updated:
   - `subscription_status` = `'canceled'`
   - `stripe_subscription_id` = `NULL`
   - `cancelled_at` timestamp set
   - `subscription_tier` remains `'enterprise'` (business logic)

**Verification SQL:**
```sql
-- Check cancellation processed
SELECT
  subscription_tier,
  subscription_status,
  stripe_subscription_id,
  cancelled_at
FROM organizations
WHERE subscription_status = 'canceled'
ORDER BY cancelled_at DESC
LIMIT 1;

-- Check event logged
SELECT
  event_type,
  to_status,
  created_at
FROM organization_subscription_events
ORDER BY created_at DESC
LIMIT 1;
```

---

### Scenario 6: Payment Method Attached

**Event:** `payment_method.attached`

```bash
stripe trigger payment_method.attached
```

**Expected Behavior:**
1. Webhook received
2. Organization payment method info updated:
   - `default_payment_method_id`
   - `payment_method_last4`
   - `payment_method_brand`

**Verification SQL:**
```sql
-- Check payment method updated
SELECT
  default_payment_method_id,
  payment_method_last4,
  payment_method_brand,
  updated_at
FROM organizations
WHERE default_payment_method_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;
```

---

### Scenario 7: Duplicate Event Handling (Idempotency)

**Manual Test via Stripe Dashboard:**

1. Go to Stripe Dashboard → Developers → Webhooks
2. Select the webhook endpoint
3. View recent events
4. Click on a `customer.subscription.created` or `customer.subscription.updated` event
5. Click "Resend" button
6. Check logs and database

**Expected Behavior:**
1. First send: Event processed normally
2. Second send: Returns `{received: true, duplicate: true}`
3. No duplicate rows in `organization_subscription_events`
4. Organization state unchanged on second send

**Verification SQL:**
```sql
-- Check for duplicate stripe_event_id (should be 0 rows)
SELECT
  stripe_event_id,
  COUNT(*) AS count
FROM organization_subscription_events
WHERE stripe_event_id IS NOT NULL
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;
```

---

### Scenario 8: Out-of-Order Events (Event Ordering)

**Manual Test:**

1. Trigger subscription.created (timestamp T1)
2. Note the `last_stripe_event_timestamp` in database
3. Manually send an older event via Stripe Dashboard
4. Event should be rejected

**Expected Behavior:**
- Events with timestamp older than `last_stripe_event_timestamp` are rejected
- Warning logged: "Rejecting out-of-order event"
- Organization state unchanged

**Verification:**
Check server logs for warning message.

---

## Verification

### Quick Verification Checklist

After running any test scenario, verify:

- [ ] Webhook received (check terminal logs)
- [ ] Event logged in `organization_subscription_events` table
- [ ] Organization table updated correctly
- [ ] No errors in server logs
- [ ] `last_stripe_event_timestamp` updated

### Database Queries for Verification

**Recent subscription events:**
```sql
SELECT
  o.name,
  e.event_type,
  e.from_tier,
  e.to_tier,
  e.from_status,
  e.to_status,
  e.stripe_event_id,
  e.created_at
FROM organization_subscription_events e
JOIN organizations o ON o.id = e.organization_id
ORDER BY e.created_at DESC
LIMIT 10;
```

**Current subscription states:**
```sql
SELECT
  name,
  subscription_tier,
  subscription_status,
  current_period_end,
  cancel_at_period_end,
  last_stripe_event_timestamp
FROM organizations
WHERE subscription_tier IS NOT NULL
ORDER BY updated_at DESC;
```

**Check for webhook processing errors:**
```sql
-- If you have error logging table
SELECT *
FROM webhook_errors
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Webhook Not Received

**Check 1: Is stripe CLI running?**
```bash
# Should show "Ready! Your webhook signing secret is..."
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
```

**Check 2: Is dev server running?**
```bash
# Should be running on port 3000
curl http://localhost:3000
```

**Check 3: Check terminal logs**
- Look for incoming webhook requests
- Check for error messages

---

### Signature Verification Failed

**Error:** `Invalid signature`

**Fix:**
1. Copy webhook signing secret from Stripe CLI output
2. Update `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
   ```
3. Restart dev server

---

### Event Not Logged in Database

**Possible causes:**
1. Database connection error
2. Missing `log_organization_subscription_event` RPC function
3. RLS policy blocking insert

**Debug steps:**
```sql
-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'log_organization_subscription_event';

-- Try calling function manually
SELECT log_organization_subscription_event(
  p_organization_id := 'test-org-id',
  p_event_type := 'test',
  p_from_tier := NULL,
  p_to_tier := NULL,
  p_from_status := NULL,
  p_to_status := NULL,
  p_stripe_event_id := 'test_event_123',
  p_amount_cents := NULL,
  p_metadata := '{}',
  p_created_by := NULL
);
```

---

### Organization Not Updated

**Possible causes:**
1. Missing `organization_id` in subscription metadata
2. Organization doesn't exist
3. RLS policy blocking update

**Debug steps:**
```sql
-- Check if organization exists
SELECT id, name, stripe_customer_id
FROM organizations
WHERE id = 'your-org-id';

-- Check last event timestamp
SELECT last_stripe_event_timestamp
FROM organizations
WHERE id = 'your-org-id';
```

---

### Test Events vs Real Events

**Stripe CLI triggers:**
- Use test data (test customer IDs, subscription IDs)
- May not match your actual database organizations
- Use `--add` flag to customize metadata:

```bash
stripe trigger customer.subscription.created \
  --add customer_metadata.organization_id=your-real-org-id
```

**Real webhook testing:**
1. Create actual test subscription via Stripe Checkout
2. Complete payment with test card `4242 4242 4242 4242`
3. Real webhook events will fire with correct metadata

---

## Advanced Testing

### Custom Webhook Events

Create custom events with specific data:

```bash
# Create subscription with custom metadata
stripe subscriptions create \
  --customer cus_test_123 \
  --items[0][price]=price_test_enterprise \
  --metadata[organization_id]=your-org-id

# This will trigger real webhook events
```

### Load Testing

Test high-volume webhook processing:

```bash
# Send multiple events rapidly
for i in {1..10}; do
  stripe trigger customer.subscription.updated &
done
wait
```

Check for:
- Race conditions
- Advisory lock behavior
- Database performance

---

## Production Testing Checklist

Before deploying to production:

- [ ] All test scenarios pass
- [ ] Idempotency verified (no duplicate events)
- [ ] Event ordering verified (old events rejected)
- [ ] Error handling tested
- [ ] Webhook signature verification working
- [ ] Database schema validated
- [ ] Environment variables configured
- [ ] Monitoring/alerting set up
- [ ] Rollback plan documented

---

**End of Guide**
