# Payment & Billing Security Audit Report
**Date:** February 5, 2026
**Auditor:** Payments Security Agent
**Scope:** All Stripe integrations, subscription management, and player payment flows

---

## Executive Summary

This audit examined three distinct payment systems in the HockeyLife application:
1. **Organization Subscriptions** - Enterprise tier subscriptions for Platform 1 access
2. **Player Fee Collection** - Stripe Checkout for player registration fees
3. **Stripe Connect Payments** - League-owned Connect accounts for direct payment processing

**Overall Assessment:** SUBSTANTIAL SECURITY ISSUES FOUND

### Critical Findings Summary
- 🔴 **4 CRITICAL** issues requiring immediate fixes
- 🟡 **8 WARNING** issues with potential customer impact
- 🟢 **3 OPTIMIZATION** recommendations

**Key Strengths:**
- Webhook signature verification implemented correctly
- Comprehensive idempotency key usage
- Event deduplication via database constraints
- Optimistic locking for concurrent modification prevention
- Source of truth: Stripe (correct architecture)

**Critical Vulnerabilities:**
- Missing transaction atomicity in payment webhooks
- Race conditions in installment payment processing
- Inadequate refund handling
- Missing chargeback workflow
- Trial abuse prevention gaps

---

## 1. ORGANIZATION SUBSCRIPTIONS AUDIT

### File: `apps/league-builder/src/app/api/stripe/webhooks/subscriptions/route.ts`

### Critical Invariants (Required)
1. **Access is only granted with an active subscription** (`subscription_status = 'active'`)
2. **Subscription tier determines feature access** (via `subscription_tier` column)
3. **Payment failure revokes access immediately** (via `past_due` status)
4. **Stripe is the source of truth** for all subscription state
5. **Events are processed exactly once** (idempotent)
6. **Events are processed in order** (timestamp-based)

---

### 1.1 Webhook Security

#### ✅ SECURE: Signature Verification (Lines 764-775)
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  STRIPE_WEBHOOK_SECRET_ORGANIZATIONS
);
```
**Analysis:** Signature verification occurs BEFORE any business logic. Secret is validated before processing (line 741). Returns 400 on failure, preventing replay attacks.

**Verdict:** Correct implementation per Stripe best practices.

---

#### ✅ SECURE: Event Deduplication (Lines 43-59, 781-786)
```typescript
async function checkEventDuplicate(
  supabase: ReturnType<typeof createServiceClient>,
  stripeEventId: string
): Promise<boolean>
```
**Analysis:**
- Checks `organization_subscription_events` table for duplicate `stripe_event_id`
- Uses database unique constraint for atomicity
- Checked BEFORE processing event (line 781)
- Event logging uses `ON CONFLICT DO NOTHING` (line 152)

**Verdict:** Correctly prevents webhook replay attacks.

---

#### 🟡 WARNING: Event Ordering Optimistic Lock Race (Lines 248-260)

```typescript
const updated = await updateLastEventTimestamp(
  supabase,
  organizationId,
  eventTimestamp,
  lastTimestamp
);

if (!updated) {
  console.warn(
    `[Webhook] Failed to update timestamp for event ${eventId} (optimistic lock failed)`
  );
}
```

**Vulnerability:** If optimistic lock fails, the event was ALREADY PROCESSED but the database update succeeded (line 224-246). This creates state inconsistency.

**Scenario:**
1. Event A (timestamp 100) starts processing
2. Event B (timestamp 101) arrives, passes ordering check
3. Event A completes DB update, increments timestamp to 100
4. Event B tries optimistic lock update with `expectedLastTimestamp=0`, fails
5. **Result:** Subscription state updated, but `last_stripe_event_timestamp` is incorrect

**Impact:** Out-of-order events may be accepted if timestamp tracking diverges from reality.

**Fix Required:**
- Wrap database updates in a transaction
- Use `SELECT ... FOR UPDATE` to lock organization row before processing
- OR use a database function with optimistic lock + rollback on timestamp conflict

**Location:** Lines 248-260 (all handlers: `handleSubscriptionCreated`, `handleSubscriptionUpdated`, `handleSubscriptionDeleted`, `handleInvoicePaid`, `handleInvoicePaymentFailed`)

---

#### 🟢 OPTIMIZATION: Webhook Secret Validation (Lines 741-747)

```typescript
if (!STRIPE_WEBHOOK_SECRET_ORGANIZATIONS) {
  console.error('[Webhook] Missing STRIPE_WEBHOOK_SECRET_ORGANIZATIONS');
  return NextResponse.json(
    { error: 'Webhook secret not configured' },
    { status: 500 }
  );
}
```

**Analysis:** Returns 500 (our fault) instead of 401 (client fault). This is actually correct - it's a server misconfiguration.

**Recommendation:** Add startup validation to fail fast if secrets are missing, rather than discovering at runtime.

---

### 1.2 Subscription Lifecycle

#### ✅ SECURE: Trial Abuse Prevention (Lines 141-215)

```typescript
async function checkTrialEligibility(
  customerId: string | null,
  userId: string
): Promise<{ eligible: boolean; reason?: string }>
```

**Analysis:**
- Checks Stripe subscription history for customer
- Checks for multi-organization trial abuse (lines 175-213)
- **Fail-closed:** If verification fails, denies trial (lines 182-188)

**Strengths:**
- Server-side enforcement (client cannot bypass)
- Checks Stripe source of truth
- Logs denial reason in metadata (line 468)

**Potential Gap:** User can create new email → new Stripe customer → new trial

**Mitigation Options:**
1. Device fingerprinting (e.g., Fingerprint.js)
2. Payment method fingerprinting (Stripe Radar)
3. IP address tracking
4. Phone number verification

**Verdict:** Good implementation within scope. Multi-account abuse requires product decision.

---

#### 🟡 WARNING: Subscription State Machine Missing Transitions (Lines 320-328)

```typescript
let eventType = 'updated';
if (org.subscription_tier !== tier) {
  eventType = org.subscription_tier < tier ? 'upgraded' : 'downgraded';
} else if (org.subscription_status !== subscription.status) {
  if (subscription.status === 'past_due') {
    eventType = 'payment_failed';
  }
}
```

**Missing Transitions:**
- `trialing` → `active` (first payment succeeds)
- `past_due` → `unpaid` (dunning ends, subscription cancelled)
- `incomplete` → `active` (delayed payment method attachment)
- `incomplete_expired` → `canceled` (subscription never activated)

**Impact:** Event logs won't capture all state changes, making debugging difficult.

**Fix:** Add comprehensive state transition detection:
```typescript
const STATUS_TRANSITIONS = {
  'trialing_to_active': { from: 'trialing', to: 'active', event: 'trial_converted' },
  'past_due_to_active': { from: 'past_due', to: 'active', event: 'payment_recovered' },
  'past_due_to_unpaid': { from: 'past_due', to: 'unpaid', event: 'payment_failed_final' },
  // ...
};
```

**Location:** Line 320-328 in `handleSubscriptionUpdated`

---

#### ✅ SECURE: Proration Handling (Lines 547-561)

```typescript
const updatedSubscription = await stripe.subscriptions.update(
  org.stripe_subscription_id,
  {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
  },
  {
    idempotencyKey: upgradeIdempotencyKey,
  }
);
```

**Analysis:**
- Upgrades prorate immediately (`always_invoice`)
- Downgrades use `proration_behavior: 'none'` (line 659)
- Idempotency key includes version number (line 539-544)

**Verdict:** Correct proration logic.

---

#### 🔴 CRITICAL: Customer ID Mismatch Validation Incomplete (Lines 494-498)

```typescript
if (org.stripe_customer_id !== invoice.customer) {
  throw new Error(
    `Customer ID mismatch: organization has ${org.stripe_customer_id}, invoice has ${invoice.customer}`
  );
}
```

**Vulnerability:** Validation occurs AFTER webhook passes signature verification, but error is thrown WITHOUT logging to audit trail.

**Attack Scenario:**
1. Attacker compromises webhook endpoint (e.g., via stolen signing secret)
2. Sends fake `invoice.paid` event with:
   - Victim's subscription ID
   - Attacker's customer ID
   - Fake payment amount
3. Lookup succeeds (line 481-491)
4. Customer mismatch throws error
5. **No audit log of attempted fraud**

**Impact:** Security events are invisible, hindering incident response.

**Fix:**
```typescript
if (org.stripe_customer_id !== invoice.customer) {
  await logSubscriptionEvent(supabase, {
    organizationId: org.id,
    eventType: 'security_customer_mismatch',
    stripeEventId: eventId,
    metadata: {
      expected_customer: org.stripe_customer_id,
      actual_customer: invoice.customer,
      invoice_id: invoice.id,
    },
  });
  throw new Error(`Customer ID mismatch: potential fraud attempt`);
}
```

**Location:** Lines 494-498, 588-592 (duplicate code in `handleInvoicePaymentFailed`)

---

### 1.3 Idempotency & Concurrency

#### ✅ SECURE: Idempotency Keys (Lines 323-327, 365-369, etc.)

```typescript
const customerIdempotencyKey = generateIdempotencyKey('create_customer', {
  organization_id: org.id,
  owner_user_id: org.owner_user_id,
});
```

**Analysis:**
- All Stripe API calls use idempotency keys
- Keys include operation type + deterministic data hash
- SHA-256 hash ensures uniqueness (from `idempotency.ts`)
- Version number included for concurrent modification protection (line 539)

**Verdict:** Excellent implementation. Prevents duplicate charges on retry.

---

#### ✅ SECURE: Optimistic Locking (Lines 565-585)

```typescript
const { data: updateResult, error: updateError } = await supabase
  .from('organizations')
  .update({
    subscription_tier: newTier,
    subscription_status: updatedSubscription.status,
    subscription_version: currentVersion + 1,
  })
  .eq('id', org.id)
  .eq('subscription_version', currentVersion)
  .select();

if (updateError || !updateResult || updateResult.length === 0) {
  console.error('[Subscription] Concurrent modification detected during upgrade', {
    organizationId: org.id,
    expectedVersion: currentVersion,
  });
  return {
    success: false,
    error: 'Subscription was modified by another request. Please try again.',
  };
}
```

**Analysis:**
- Uses `subscription_version` column for optimistic locking
- Updates fail if version changed (someone else modified the subscription)
- **User-friendly error message**

**Potential Issue:** Stripe update succeeded (line 547), but database update failed. This creates divergence between Stripe and local DB.

**Mitigation:** Webhook will eventually sync the state from Stripe. This is acceptable due to Stripe-as-source-of-truth architecture.

**Verdict:** Correct pattern for preventing concurrent modification races.

---

### 1.4 PCI Compliance

#### ✅ SECURE: No Card Data Storage

**Analysis:**
- Payment methods handled via `stripe.paymentMethods.attach()` (line 371-379)
- Only stores `last4` and `brand` (lines 707-709)
- Never touches raw PAN, CVV, or expiration date
- Uses Stripe Checkout and Billing Portal for card collection

**Storage Audit:**
- `organizations.default_payment_method_id` - Stripe PM ID (safe)
- `organizations.payment_method_last4` - Last 4 digits (PCI-compliant)
- `organizations.payment_method_brand` - Card brand (safe)

**Verdict:** PCI DSS compliant. SAQ-A eligible.

---

### 1.5 Error Handling

#### 🟡 WARNING: Webhook Error Response Leaks Information (Lines 853-859)

```typescript
} catch (error) {
  console.error('[Webhook] Error processing webhook:', error);
  return NextResponse.json(
    { error: 'Webhook processing failed' },
    { status: 500 }
  );
}
```

**Vulnerability:** Returns generic error, which is correct. However, console.error may log sensitive data from `error` object.

**Best Practice:** Use sanitized error logging:
```typescript
console.error('[Webhook] Error processing webhook:', {
  event_id: event.id,
  event_type: event.type,
  error_type: error instanceof Error ? error.constructor.name : typeof error,
  // DO NOT log error.message (may contain PII)
});
```

**Location:** Lines 853-859

---

## 2. PLAYER FEE COLLECTION AUDIT

### File: `apps/league-builder/src/lib/payments/webhook-handler.ts`

### Critical Invariants
1. **Payment is recorded exactly once** (no double-charging)
2. **Amount paid is accurately tracked** (installments sum correctly)
3. **Player cannot access league without payment** (if fees are required)
4. **Refunds reduce `amount_paid_cents` atomically**
5. **Platform fee is calculated server-side only**

---

### 2.1 Webhook Verification

#### ✅ SECURE: Signature Verification (Lines 43-62)

```typescript
export function verifyPlayerPaymentsWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET) {
    console.error('[Payments Webhook] Missing webhook secret');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[Payments Webhook] Signature verification failed:', sanitizeErrorForLogging(error));
    return null;
  }
}
```

**Analysis:**
- Verified BEFORE processing (called in route handler line 32)
- Returns null on failure (safe)
- Separate webhook secret from organization subscriptions (good isolation)

**Verdict:** Correct.

---

### 2.2 Checkout Completion Handler

#### 🔴 CRITICAL: Non-Atomic Payment Update (Lines 183-196)

```typescript
// Use atomic update function to prevent race conditions
const { data: updatedPayment, error: updateError } = await supabase.rpc(
  'update_payment_amount_atomic',
  {
    p_payment_id: playerPaymentId,
    p_amount_to_add: amountPaid,
    p_installment_increment: 1,
  }
);
```

**Vulnerability:** Transaction is inserted (lines 158-171), then payment is updated via RPC. If RPC call fails, transaction exists but payment amount is NOT updated.

**Scenario:**
1. Webhook receives `checkout.session.completed`
2. Transaction insert succeeds (line 158-171)
3. RPC call fails (network error, DB timeout)
4. Webhook returns error 500
5. Stripe retries webhook
6. **Duplicate transaction insert** (if `idempotency_key` constraint doesn't exist)
7. Even if constraint prevents duplicate, payment amount is still wrong

**State Inconsistency:**
- `payment_transactions` table shows payment received
- `player_payments.amount_paid_cents` not incremented
- Player sees payment pending, but money was charged

**Fix Required:**
Wrap in database transaction or use a single atomic RPC function:
```sql
CREATE OR REPLACE FUNCTION process_checkout_payment_atomic(
  p_payment_id UUID,
  p_amount_paid_cents INT,
  p_payment_intent_id TEXT,
  p_checkout_session_id TEXT,
  p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert transaction
  INSERT INTO payment_transactions (
    player_payment_id,
    amount_cents,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    idempotency_key,
    ...
  ) VALUES (
    p_payment_id,
    p_amount_paid_cents,
    p_payment_intent_id,
    p_checkout_session_id,
    p_idempotency_key,
    ...
  ) ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_transaction_id;

  -- If conflict, return early (already processed)
  IF v_transaction_id IS NULL THEN
    RETURN jsonb_build_object('already_processed', true);
  END IF;

  -- Update payment atomically
  UPDATE player_payments
  SET
    amount_paid_cents = amount_paid_cents + p_amount_paid_cents,
    current_installment = current_installment + 1,
    status = CASE
      WHEN amount_paid_cents + p_amount_paid_cents >= total_amount_cents THEN 'paid'
      WHEN amount_paid_cents + p_amount_paid_cents > 0 THEN 'partially_paid'
      ELSE status
    END,
    paid_at = CASE
      WHEN amount_paid_cents + p_amount_paid_cents >= total_amount_cents THEN NOW()
      ELSE paid_at
    END
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'success', true,
    'payment', row_to_json(v_payment)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Location:** Lines 183-196 in `handleCheckoutCompleted`

---

#### 🟡 WARNING: Event Deduplication Check Timing (Lines 124-128)

```typescript
// Check for duplicate event processing
if (await isEventProcessed(eventId)) {
  console.log(`[Payments Webhook] Event ${eventId} already processed, skipping`);
  return { success: true, message: 'Event already processed' };
}
```

**Issue:** `isEventProcessed` function (lines 94-114) checks `player_payment_audit_log` table, but audit log is written AFTER payment processing (line 203-215).

**Race Condition:**
1. Webhook A starts processing event `evt_123`
2. Webhook B (retry) starts processing same event `evt_123`
3. Both pass `isEventProcessed` check (no audit log yet)
4. Both insert transaction (one fails on unique constraint)
5. One succeeds, one fails, but both attempted to charge

**Mitigation:** The transaction insert has `idempotency_key` unique constraint (line 170), so duplicate charge is prevented. However, the second webhook will return an error, causing Stripe to retry indefinitely.

**Fix:** Use RPC function that checks AND inserts audit log atomically in one operation.

**Location:** Lines 94-114, 124-128

---

### 2.3 Installment Payment Handling

#### 🟡 WARNING: Installment Race Condition (Lines 157-171)

```typescript
const currentInstallment = payment.current_installment ?? 0;
const { error: txnError } = await supabase.from('payment_transactions').insert({
  player_payment_id: playerPaymentId,
  transaction_type: 'payment',
  amount_cents: amountPaid,
  application_fee_cents: applicationFee,
  currency: session.currency || 'usd',
  stripe_payment_intent_id: paymentIntent,
  stripe_checkout_session_id: session.id,
  status: 'succeeded',
  installment_number: currentInstallment + 1,
  description: `Payment via Stripe Checkout`,
  completed_at: new Date().toISOString(),
  idempotency_key: `checkout_${session.id}`,
});
```

**Scenario:**
1. Player makes installment #1 payment
2. Player immediately makes installment #2 payment (before webhook #1 completes)
3. Webhook #1 reads `current_installment = 0`, writes `installment_number: 1`
4. Webhook #2 reads `current_installment = 0` (not updated yet), writes `installment_number: 1`
5. **Both webhooks think they are processing installment #1**

**Result:** `installment_number` is incorrect in one transaction record.

**Fix:** Use `checkout_session_id` as source of truth instead of `current_installment`. Each checkout session is unique, so derive installment number from transaction count:
```typescript
// Count existing transactions for this payment
const { count } = await supabase
  .from('payment_transactions')
  .select('*', { count: 'exact', head: true })
  .eq('player_payment_id', playerPaymentId)
  .eq('transaction_type', 'payment')
  .eq('status', 'succeeded');

const installmentNumber = (count ?? 0) + 1;
```

**Location:** Lines 157-171

---

### 2.4 Refund Handling

#### 🔴 CRITICAL: Missing Refund Webhook Handler (Lines 285-332)

```typescript
async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string
): Promise<WebhookResult> {
  // ... finds payment ...

  await logAuditEvent(
    payment.league_id,
    'webhook_charge_refunded',
    { ... },
    payment.id,
    eventId
  );

  return { success: true, message: 'Refund event logged' };
}
```

**Vulnerability:** Refund is LOGGED but NOT APPLIED to payment record.

**Impact:**
1. Admin issues refund via Stripe Dashboard or API
2. `charge.refunded` webhook is received
3. Audit log records refund
4. **`player_payments.amount_paid_cents` is NOT decreased**
5. Player payment still shows as "paid"
6. Player charged for access they no longer have credit for

**Fix Required:**
```typescript
async function handleChargeRefunded(
  charge: Stripe.Charge,
  eventId: string
): Promise<WebhookResult> {
  // ... existing lookup code ...

  // Record refund transaction
  const { error: txnError } = await supabase.from('payment_transactions').insert({
    player_payment_id: payment.id,
    transaction_type: 'refund',
    amount_cents: -charge.amount_refunded,
    application_fee_cents: 0, // Calculate proportional fee refund
    currency: charge.currency,
    stripe_charge_id: charge.id,
    status: 'succeeded',
    description: `Refund: ${charge.refunded ? 'Full' : 'Partial'}`,
    completed_at: new Date().toISOString(),
  });

  // Update payment amount atomically
  await supabase.rpc('update_payment_amount_atomic', {
    p_payment_id: payment.id,
    p_amount_to_add: -charge.amount_refunded,
    p_installment_increment: 0,
  });

  // Update status if fully refunded
  if (charge.refunded) {
    await supabase
      .from('player_payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);
  }

  // ... existing audit log ...
}
```

**Location:** Lines 285-332

---

### 2.5 Platform Fee Calculation

#### ✅ SECURE: Server-Side Fee Calculation (Line 154)

```typescript
const applicationFee = await calculateApplicationFee(amountPaid);
```

**Analysis:**
- Fee calculated server-side in webhook (not provided by client)
- Uses database config via `getPlatformFeeConfig()` (from `platform-fees.ts`)
- Cached with 5-minute TTL to reduce DB load
- Fee stored in transaction for audit trail (line 162)

**Verdict:** Correct. Client cannot manipulate fee amount.

---

### 2.6 Payment Failure Handling

#### 🟡 WARNING: Payment Failure Updates Wrong Status (Lines 262-265)

```typescript
// Update payment status
await supabase
  .from('player_payments')
  .update({ status: 'failed' })
  .eq('id', playerPaymentId);
```

**Issue:** If payment has multiple installments and one fails, the ENTIRE payment is marked as `failed`. This is incorrect.

**Scenario:**
1. Player has 3-installment payment plan
2. Installment #1 succeeds
3. Installment #2 fails (card declined)
4. Payment status set to `failed`
5. Installment #1 payment is ignored (player thinks they didn't pay anything)

**Correct Behavior:**
- Payment status should remain `partially_paid` if any installment succeeded
- Only mark `failed` if NO installments have succeeded
- Add `last_payment_failed_at` timestamp field

**Fix:**
```typescript
const { data: payment } = await supabase
  .from('player_payments')
  .select('amount_paid_cents')
  .eq('id', playerPaymentId)
  .single();

const newStatus = (payment.amount_paid_cents ?? 0) > 0 ? 'partially_paid' : 'failed';

await supabase
  .from('player_payments')
  .update({
    status: newStatus,
    last_payment_failed_at: new Date().toISOString(),
  })
  .eq('id', playerPaymentId);
```

**Location:** Lines 262-265

---

## 3. STRIPE CONNECT PAYMENTS AUDIT

### File: `apps/league-builder/src/lib/leagues/stripe-connect.ts`

### Critical Invariants
1. **League receives payment ONLY if `charges_enabled = true`**
2. **Platform fee is calculated server-side and enforced in PaymentIntent**
3. **Funds go directly to league Connect account** (not platform account)
4. **Refunds include proportional platform fee refund**
5. **Account credentials (IDs only) stored, never secret keys**

---

### 3.1 Connect Account Security

#### ✅ SECURE: Account Type and Permissions (Lines 119-136)

```typescript
const account = await stripe.accounts.create(
  {
    type: 'express',
    country: 'US',
    email,
    business_type: 'company',
    company: {
      name: leagueName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      league_id: leagueId,
      platform: 'beerleaguehockey',
    },
  },
  {
    idempotencyKey,
  }
);
```

**Analysis:**
- Uses `express` type (correct for this use case)
- Requests only necessary capabilities (`card_payments`, `transfers`)
- Does NOT request `bank_account` capability (prevents ACH debit fraud)
- Metadata includes league_id for reconciliation
- Idempotency key prevents duplicate account creation

**Verdict:** Secure configuration.

---

#### ✅ SECURE: No Secret Key Storage

**Analysis:**
- Only stores `stripe_account_id` in database (line 198 in `stripe-connect-payments.ts`)
- Never stores `secret_key` or `publishable_key`
- Uses Stripe SDK with `stripeAccount` parameter for operations
- Dashboard access via `createLoginLink()` (line 180-182), not stored credentials

**Verdict:** Correct. Follows Stripe best practices.

---

### 3.2 Payment Intent Creation

#### ✅ SECURE: Platform Fee Enforcement (Lines 281-330)

```typescript
const { fee: applicationFee, percent: feePercent } =
  await calculateApplicationFeeFromConfig(amountCents);

const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: amountCents,
    currency,
    application_fee_amount: applicationFee,
    description,
    receipt_email: customerEmail,
    metadata: {
      ...metadata,
      league_id: leagueId,
      platform: 'beerleaguehockey',
      platform_fee_percent: feePercent.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
    transfer_data: {
      destination: connectedAccountId,
    },
  },
  {
    idempotencyKey,
  }
);
```

**Analysis:**
- `application_fee_amount` calculated server-side (line 295-296)
- Fee percent stored in metadata for audit trail (line 317)
- `transfer_data.destination` routes funds to league account
- Idempotency key prevents duplicate payment intents (lines 299-304)

**Strength:** Fee is enforced by Stripe API. Client cannot bypass.

**Potential Issue:** `applicationFee` uses global platform config instead of per-league config.

**Fix:** Use `calculateLeagueApplicationFee()` instead:
```typescript
const { fee: applicationFee, percent: feePercent, mode } =
  await calculateLeagueApplicationFee(leagueId, amountCents);
```

**Location:** Line 295-296

---

#### 🟡 WARNING: Idempotency Key Timestamp Granularity (Lines 299-304)

```typescript
const idempotencyKey = generateIdempotencyKey('create_payment_intent', {
  league_id: leagueId,
  amount: amountCents,
  customer_email: customerEmail,
  timestamp: Date.now().toString().slice(0, -3), // 10-second granularity
});
```

**Issue:** 10-second granularity means two identical payment intents created within 10 seconds will be treated as duplicates (idempotent retry).

**Scenario:**
1. Player A pays $100 at 12:00:00.123
2. Player B pays $100 at 12:00:05.456
3. Same `customer_email` (shared family email)
4. **Same idempotency key generated**
5. Player B's payment is ignored (Stripe returns Player A's payment intent)

**Impact:** Player B cannot pay if Player A paid within same 10-second window with same email.

**Fix:** Include player ID or session ID in idempotency key:
```typescript
const idempotencyKey = generateIdempotencyKey('create_payment_intent', {
  league_id: leagueId,
  player_id: metadata.player_id, // Add unique player identifier
  amount: amountCents,
  customer_email: customerEmail,
  timestamp: Date.now().toString(), // Full timestamp
});
```

**Location:** Lines 299-304

---

### 3.3 Refund Handling

#### 🟡 WARNING: Refund Application Fee Not Proportional (Lines 398-436)

```typescript
const refund = await stripe.refunds.create(
  {
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason,
    refund_application_fee: refundApplicationFee,
  },
  {
    idempotencyKey,
  }
);

// Calculate refunded application fee if any
let applicationFeeRefunded = 0;
if (refundApplicationFee && amountCents) {
  applicationFeeRefunded = await calculateApplicationFee(amountCents);
}
```

**Issue:** If partial refund is issued, `applicationFeeRefunded` is calculated as if full refund occurred.

**Scenario:**
1. Payment: $100, platform fee: $2.99
2. Partial refund: $50
3. `refund_application_fee: true` causes Stripe to refund $1.50 (proportional)
4. Code calculates: `applicationFeeRefunded = $2.99` (WRONG)
5. **Audit log shows incorrect fee refund amount**

**Fix:**
```typescript
let applicationFeeRefunded = 0;
if (refundApplicationFee && amountCents) {
  // Get original payment to calculate proportional fee
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const originalFee = paymentIntent.application_fee_amount ?? 0;
  const originalAmount = paymentIntent.amount;

  // Calculate proportional fee refund
  applicationFeeRefunded = Math.round((amountCents / originalAmount) * originalFee);
}
```

**Location:** Lines 426-428

---

### 3.4 Payout Information

#### ✅ SECURE: Balance Retrieval (Lines 443-480)

```typescript
const [balance, account, payouts] = await Promise.all([
  stripe.balance.retrieve({ stripeAccount: connectedAccountId }),
  stripe.accounts.retrieve(connectedAccountId),
  stripe.payouts.list(
    { limit: 5 },
    { stripeAccount: connectedAccountId }
  ),
]);
```

**Analysis:**
- Uses `stripeAccount` parameter to scope requests to league account
- Retrieves balance, settings, and recent payouts in parallel
- Returns only USD balances (primary currency)

**Verdict:** Correct implementation.

---

## 4. CONNECT WEBHOOKS AUDIT

### File: `apps/league-builder/src/app/api/stripe/webhooks/connect/route.ts`

### 4.1 Webhook Security

#### ✅ SECURE: Signature Verification (Lines 402-416)

```typescript
let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(
    body,
    signature,
    STRIPE_WEBHOOK_SECRET_CONNECT
  );
} catch (err) {
  console.error('[Connect Webhook] Signature verification failed:', err);
  return NextResponse.json(
    { error: 'Invalid signature' },
    { status: 400 }
  );
}
```

**Analysis:** Verified before processing. Separate secret from organization subscriptions.

**Verdict:** Correct.

---

#### ✅ SECURE: Audit Logging with Idempotency (Lines 46-74)

```typescript
async function logAuditEvent(
  supabase: ReturnType<typeof createServiceClient>,
  leagueId: string,
  eventType: string,
  stripeEventId: string,
  payload: Record<string, any>
): Promise<boolean> {
  const { error, count } = await supabase
    .from('stripe_connect_audit_log')
    .insert({
      league_id: leagueId,
      event_type: eventType,
      stripe_event_id: stripeEventId,
      payload,
    });

  if (error) {
    if (error.code === '23505') {
      console.log(`[Connect Webhook] Duplicate event ${stripeEventId}, skipping`);
      return false;
    }
    console.error('[Connect Webhook] Failed to log audit event:', error);
    throw error;
  }

  return true;
}
```

**Analysis:**
- Uses database unique constraint on `stripe_event_id` for idempotency
- Returns `false` if duplicate (ON CONFLICT detected via error code 23505)
- Event handlers check return value and skip processing (e.g., line 124)

**Verdict:** Excellent idempotency implementation.

---

### 4.2 Payment Status Updates

#### ✅ SECURE: Payment Intent Succeeded (Lines 161-203)

```typescript
const { error } = await supabase
  .from('stripe_connect_payments')
  .update({
    status: 'succeeded',
    stripe_charge_id: chargeId,
  })
  .eq('stripe_payment_intent_id', paymentIntent.id);
```

**Analysis:**
- Updates payment status based on `payment_intent_id` (correct lookup key)
- Records `charge_id` for refund operations
- Logged to audit trail BEFORE database update (idempotent)

**Verdict:** Correct flow.

---

#### 🟡 WARNING: Charge Refunded Missing Payment Update (Lines 254-306)

```typescript
async function handleChargeRefunded(
  supabase: ReturnType<typeof createServiceClient>,
  charge: Stripe.Charge,
  eventId: string
): Promise<void> {
  // ... lookup payment ...

  const status = charge.refunded ? 'refunded' : 'partially_refunded';

  const { error } = await supabase
    .from('stripe_connect_payments')
    .update({ status })
    .eq('id', payment.id);
```

**Issue:** Updates `status` field but does NOT update any monetary fields (e.g., `amount_refunded_cents`).

**Impact:**
- Status shows `refunded`, but amount fields don't reflect refund
- Cannot calculate net revenue (amount - refund) without querying Stripe

**Fix:** Add refund amount tracking:
```typescript
const { error } = await supabase
  .from('stripe_connect_payments')
  .update({
    status,
    amount_refunded_cents: charge.amount_refunded,
  })
  .eq('id', payment.id);
```

**Note:** Requires adding `amount_refunded_cents` column to `stripe_connect_payments` table.

**Location:** Lines 295-298

---

## 5. PAYMENT ACTIONS AUDIT

### File: `apps/league-builder/src/lib/payments/payment-actions.ts`

### 5.1 Access Control

#### ✅ SECURE: Player Ownership Validation (Lines 179-182)

```typescript
if (params.playerId !== user.id) {
  return { success: false, error: 'You can only create payments for yourself.' };
}
```

**Analysis:** Players can only create payments for themselves. Cannot pay on behalf of others.

**Verdict:** Correct authorization.

---

#### ✅ SECURE: Admin Access Validation (Lines 56-86)

```typescript
const { data: membership, error: membershipError } = await supabase
  .from('league_memberships')
  .select('role, status')
  .eq('league_id', leagueId)
  .eq('user_id', user.id)
  .single();

if (!['owner', 'admin'].includes(membership.role)) {
  return { error: 'Only league owners and admins can perform this action.' };
}
```

**Analysis:**
- Verifies league membership
- Requires `owner` or `admin` role
- Checks membership status is `active`

**Verdict:** Correct role-based access control.

---

### 5.2 Stripe Checkout Creation

#### 🟡 WARNING: Missing Checkout Session Expiry Handling (Lines 421-466)

```typescript
const session = await stripe.checkout.sessions.create(
  {
    mode: 'payment',
    customer: payment.stripe_customer_id || undefined,
    customer_email: payment.stripe_customer_id ? undefined : user.email,
    line_items: [
      // ...
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: league.stripe_account_id,
      },
      metadata: {
        player_payment_id: params.playerPaymentId,
        player_id: payment.player_id,
        league_id: payment.league_id,
        installment_number: (currentInstallment + 1).toString(),
        platform: 'beerleaguehockey',
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      player_payment_id: params.playerPaymentId,
      type: 'player_fee',
    },
  },
  {
    idempotencyKey,
  }
);
```

**Issue:** Checkout session expires after 24 hours (Stripe default). If session expires before payment, the payment record is stuck in `processing` status forever.

**Impact:**
- Player payment shows `processing` indefinitely
- Player cannot create new checkout session (duplicate check may prevent it)
- Admin must manually mark as `cancelled`

**Fix:** Add `expires_at` parameter and webhook handler for `checkout.session.expired`:
```typescript
const session = await stripe.checkout.sessions.create({
  // ... existing params ...
  expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
}, {
  idempotencyKey,
});

// Add webhook handler
async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<WebhookResult> {
  const playerPaymentId = session.metadata?.player_payment_id;

  await supabase
    .from('player_payments')
    .update({
      status: 'pending', // Reset from 'processing' to 'pending'
      stripe_checkout_session_id: null,
    })
    .eq('id', playerPaymentId)
    .eq('stripe_checkout_session_id', session.id); // Only update if still this session

  return { success: true, message: 'Checkout expired, reset to pending' };
}
```

**Location:** Lines 421-466

---

### 5.3 Refund Processing

#### 🔴 CRITICAL: Refund Multi-Transaction Loop Not Atomic (Lines 664-706)

```typescript
for (const txn of transactions) {
  if (amountToRefund <= 0) break;
  if (!txn.stripe_payment_intent_id) continue;

  const txnRefundAmount = Math.min(amountToRefund, txn.amount_cents);
  const feeRefund = await calculateApplicationFee(txnRefundAmount);

  const idempotencyKey = generateIdempotencyKey('refund_payment', {
    payment_id: params.playerPaymentId,
    txn_id: txn.stripe_payment_intent_id,
    amount: txnRefundAmount,
  });

  const refund = await stripe.refunds.create(
    {
      payment_intent: txn.stripe_payment_intent_id,
      amount: txnRefundAmount,
      reason: params.reason,
      refund_application_fee: true,
    },
    { idempotencyKey }
  );

  totalRefunded += refund.amount;
  totalFeeRefunded += feeRefund;
  lastRefundId = refund.id;
  amountToRefund -= txnRefundAmount;

  // Record refund transaction
  const serviceSupabase = createServiceRoleClient();
  await serviceSupabase.from('payment_transactions').insert({
    player_payment_id: params.playerPaymentId,
    transaction_type: 'refund',
    amount_cents: -refund.amount,
    application_fee_cents: -feeRefund,
    currency: payment.currency,
    stripe_refund_id: refund.id,
    stripe_payment_intent_id: txn.stripe_payment_intent_id,
    status: 'succeeded',
    description: `Refund: ${params.reason}`,
    completed_at: new Date().toISOString(),
  });
}
```

**Vulnerability:** Refund loop processes multiple transactions. If loop fails midway, partial refunds are issued but not all recorded in database.

**Scenario:**
1. Player has 3 installment payments: $100, $100, $100
2. Admin refunds $250
3. Loop processes:
   - Txn 1: Refund $100 → SUCCESS, insert to DB → SUCCESS
   - Txn 2: Refund $100 → SUCCESS, insert to DB → SUCCESS
   - Txn 3: Refund $50 → SUCCESS, insert to DB → **NETWORK ERROR**
4. Payment update (lines 709-727) fails
5. **$250 refunded to player, but database shows only $200 refunded**

**Impact:**
- Financial records are incorrect
- Reconciliation reports will show discrepancy
- Player received refund but system doesn't know

**Fix:** Wrap entire refund operation in a database transaction using a stored procedure:
```sql
CREATE OR REPLACE FUNCTION process_player_payment_refund(
  p_payment_id UUID,
  p_refund_amount_cents INT,
  p_reason TEXT,
  p_notes TEXT,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_transactions RECORD;
  v_remaining_refund INT := p_refund_amount_cents;
  v_total_refunded INT := 0;
BEGIN
  -- Process each transaction in a single atomic operation
  FOR v_transactions IN
    SELECT * FROM payment_transactions
    WHERE player_payment_id = p_payment_id
      AND transaction_type = 'payment'
      AND status = 'succeeded'
    ORDER BY created_at DESC
  LOOP
    IF v_remaining_refund <= 0 THEN EXIT; END IF;

    DECLARE
      v_refund_amount INT := LEAST(v_remaining_refund, v_transactions.amount_cents);
      v_fee_refund INT;
    BEGIN
      -- Calculate fee refund
      v_fee_refund := ROUND(v_refund_amount * 0.0299); -- Use config value

      -- Insert refund transaction
      INSERT INTO payment_transactions (
        player_payment_id,
        transaction_type,
        amount_cents,
        application_fee_cents,
        currency,
        stripe_payment_intent_id,
        status,
        description,
        completed_at
      ) VALUES (
        p_payment_id,
        'refund',
        -v_refund_amount,
        -v_fee_refund,
        v_transactions.currency,
        v_transactions.stripe_payment_intent_id,
        'pending_stripe', -- Mark as pending until Stripe confirms
        p_reason,
        NOW()
      );

      v_total_refunded := v_total_refunded + v_refund_amount;
      v_remaining_refund := v_remaining_refund - v_refund_amount;
    END;
  END LOOP;

  -- Update payment record atomically
  UPDATE player_payments
  SET
    amount_paid_cents = amount_paid_cents - v_total_refunded,
    status = CASE
      WHEN amount_paid_cents - v_total_refunded <= 0 THEN 'refunded'
      ELSE 'partially_refunded'
    END,
    notes = COALESCE(notes || E'\\n', '') || 'Refund: ' || p_notes
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_refunded_cents', v_total_refunded
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then call Stripe API AFTER database transaction commits. If Stripe call fails, mark transactions as `failed` in a separate update.

**Location:** Lines 664-706

---

## 6. MISSING FEATURES & EDGE CASES

### 6.1 Chargeback Handling

#### 🔴 CRITICAL: No Chargeback Webhook Handler

**Missing Webhook:** `charge.dispute.created`, `charge.dispute.closed`

**Impact:**
- Customer files chargeback with bank
- Stripe deducts funds from Connect account
- **System has no record of chargeback**
- Player still has access (payment shows as `succeeded`)
- League admin doesn't know about dispute

**Required Implementation:**
```typescript
async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  eventId: string
): Promise<WebhookResult> {
  const chargeId = dispute.charge as string;

  // Find payment by charge ID
  const { data: payment } = await supabase
    .from('stripe_connect_payments')
    .select('*')
    .eq('stripe_charge_id', chargeId)
    .single();

  if (!payment) {
    return { success: true, message: 'Not a Connect payment' };
  }

  // Record dispute
  await supabase.from('payment_disputes').insert({
    payment_id: payment.id,
    league_id: payment.league_id,
    stripe_dispute_id: dispute.id,
    amount_cents: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
    evidence_due_by: new Date(dispute.evidence_details.due_by * 1000),
  });

  // Mark payment as disputed
  await supabase
    .from('stripe_connect_payments')
    .update({ status: 'disputed' })
    .eq('id', payment.id);

  // Send alert to league admin
  await sendDisputeAlert(payment.league_id, dispute);

  return { success: true, message: 'Dispute recorded' };
}
```

**Recommended:** Add `payment_disputes` table and UI for dispute management.

---

### 6.2 Failed Payment Retry Logic

#### 🟡 WARNING: No Automatic Retry for Failed Payments

**Current Behavior:**
- Payment fails → Status set to `failed`
- No retry attempt
- Player must manually retry

**Best Practice:** Implement Smart Retry (Stripe Billing-style dunning):
1. First failure: Retry after 3 days
2. Second failure: Retry after 5 days
3. Third failure: Retry after 7 days
4. Fourth failure: Mark as `unpaid`, revoke access

**Implementation:** Create scheduled job (Supabase Edge Function with cron):
```typescript
export async function retryFailedPayments() {
  const { data: failures } = await supabase
    .from('player_payments')
    .select('*')
    .eq('status', 'failed')
    .lt('next_retry_at', new Date().toISOString())
    .lt('retry_count', 4);

  for (const payment of failures) {
    // Create new checkout session
    const session = await stripe.checkout.sessions.create({
      // ... same params as original ...
    });

    // Send email to player with new checkout link
    await sendPaymentRetryEmail(payment.player_id, session.url);

    // Update retry tracking
    await supabase
      .from('player_payments')
      .update({
        retry_count: payment.retry_count + 1,
        next_retry_at: calculateNextRetry(payment.retry_count + 1),
      })
      .eq('id', payment.id);
  }
}
```

---

### 6.3 Subscription Webhooks Missing Events

#### 🟡 WARNING: Missing Webhook Handlers

**Not Implemented:**
- `customer.subscription.trial_will_end` - Send reminder 3 days before trial ends
- `invoice.upcoming` - Send reminder before renewal
- `invoice.payment_action_required` - 3D Secure authentication needed
- `customer.subscription.paused` - Handle paused subscriptions (new Stripe feature)

**Recommendation:** Add handlers for complete subscription lifecycle coverage.

---

## 7. DATABASE SCHEMA CONCERNS

### 7.1 Missing Indexes

#### 🟡 WARNING: Performance Impact on Webhook Lookups

**Slow Queries (needs indexes):**
1. `organizations` table:
   - `stripe_customer_id` (lookup in `handleInvoicePaid`, line 481)
   - `stripe_subscription_id` (lookup in `handleInvoicePaid`, line 484)

2. `player_payments` table:
   - `stripe_checkout_session_id` (lookup in `handleCheckoutCompleted`, line 140)

3. `payment_transactions` table:
   - `stripe_payment_intent_id` (lookup in `handleChargeRefunded`, line 298)

**Recommended Indexes:**
```sql
CREATE INDEX CONCURRENTLY idx_organizations_stripe_customer_id
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_organizations_stripe_subscription_id
  ON organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_player_payments_checkout_session
  ON player_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_payment_transactions_payment_intent
  ON payment_transactions(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
```

---

### 7.2 Missing Constraints

#### 🟡 WARNING: Data Integrity Risks

**Missing Unique Constraints:**
1. `organization_subscription_events.stripe_event_id` - Prevents duplicate event processing (should be UNIQUE)
2. `payment_transactions.idempotency_key` - Prevents duplicate charges (should be UNIQUE)
3. `stripe_connect_audit_log.stripe_event_id` - Prevents duplicate audit logs (should be UNIQUE per league)

**Recommended Constraints:**
```sql
ALTER TABLE organization_subscription_events
  ADD CONSTRAINT uk_subscription_events_stripe_event_id
  UNIQUE (stripe_event_id);

ALTER TABLE payment_transactions
  ADD CONSTRAINT uk_payment_transactions_idempotency_key
  UNIQUE (idempotency_key);

ALTER TABLE stripe_connect_audit_log
  ADD CONSTRAINT uk_connect_audit_stripe_event_id
  UNIQUE (stripe_event_id);
```

---

## 8. TESTING COVERAGE ANALYSIS

### File: `e2e/tests/payments.spec.ts`

#### 🟡 WARNING: Insufficient Test Coverage

**Current Coverage:**
- Basic navigation to billing pages ✅
- Subscription status display ✅
- Checkout flow (skipped) ⚠️
- Card decline handling (skipped) ⚠️
- Connect onboarding (skipped) ⚠️

**Missing Critical Tests:**
- ❌ Webhook signature verification failure
- ❌ Duplicate webhook delivery (idempotency)
- ❌ Concurrent subscription modification
- ❌ Refund processing
- ❌ Installment payment sequence
- ❌ Payment failure → retry
- ❌ Trial expiry → conversion
- ❌ Proration calculation accuracy
- ❌ Platform fee correctness

**Recommended Test Additions:**
```typescript
test.describe('Webhook Security', () => {
  test('should reject webhook with invalid signature', async ({ request }) => {
    const response = await request.post('/api/stripe/webhooks/subscriptions', {
      data: mockWebhookPayload,
      headers: {
        'stripe-signature': 'invalid_signature',
      },
    });
    expect(response.status()).toBe(400);
  });

  test('should handle duplicate webhook delivery', async ({ request }) => {
    const webhook = mockWebhook('invoice.paid', { amount: 10000 });

    // Send webhook twice
    await request.post('/api/stripe/webhooks/subscriptions', webhook);
    const response = await request.post('/api/stripe/webhooks/subscriptions', webhook);

    expect(response.status()).toBe(200);

    // Verify payment recorded only once
    const payments = await getPaymentHistory();
    expect(payments.filter(p => p.invoice_id === webhook.data.object.id)).toHaveLength(1);
  });
});
```

---

## 9. SUMMARY OF FINDINGS

### 🔴 CRITICAL ISSUES (4)

| # | Issue | Location | Impact | Priority |
|---|-------|----------|--------|----------|
| 1 | Non-atomic payment update in `handleCheckoutCompleted` | `webhook-handler.ts:183-196` | Payment charged but not recorded if RPC fails | **P0** |
| 2 | Missing refund application in `handleChargeRefunded` | `webhook-handler.ts:285-332` | Refunds not reflected in payment records | **P0** |
| 3 | Refund loop not atomic | `payment-actions.ts:664-706` | Partial refund failures cause financial discrepancy | **P0** |
| 4 | Missing chargeback webhook handler | N/A | Chargebacks not tracked, player access not revoked | **P1** |

---

### 🟡 WARNING ISSUES (8)

| # | Issue | Location | Impact | Priority |
|---|-------|----------|--------|----------|
| 1 | Optimistic lock race in webhook timestamp update | `subscriptions/route.ts:248-260` | Out-of-order events may be accepted | **P1** |
| 2 | Missing subscription state transitions | `subscriptions/route.ts:320-328` | Incomplete event logging | **P2** |
| 3 | Customer mismatch error not logged to audit | `subscriptions/route.ts:494-498` | Security events invisible | **P1** |
| 4 | Event deduplication check timing | `webhook-handler.ts:124-128` | Race condition in duplicate detection | **P2** |
| 5 | Installment race condition | `webhook-handler.ts:157-171` | Incorrect installment numbers | **P2** |
| 6 | Payment failure sets wrong status | `webhook-handler.ts:262-265` | Partial payments shown as failed | **P2** |
| 7 | Checkout session expiry not handled | `payment-actions.ts:421-466` | Payments stuck in `processing` | **P2** |
| 8 | Connect refund missing amount tracking | `connect/route.ts:295-298` | Refund amounts not in database | **P3** |

---

### 🟢 OPTIMIZATION RECOMMENDATIONS (3)

| # | Recommendation | Location | Benefit |
|---|----------------|----------|---------|
| 1 | Add startup secret validation | `client.ts` | Fail fast on misconfiguration |
| 2 | Use per-league fee calculation | `stripe-connect.ts:295-296` | Support league-specific fee overrides |
| 3 | Add database indexes | N/A | Improve webhook processing performance |

---

## 10. REMEDIATION PLAN

### Phase 1: Critical Fixes (P0) - IMMEDIATE

**Timeline:** 1-2 days
**Risk:** HIGH - Revenue loss, customer trust issues

1. **Fix atomic payment update (webhook-handler.ts:183-196)**
   - Create `process_checkout_payment_atomic()` database function
   - Replace RPC call with atomic function
   - Add unit tests for race conditions

2. **Fix refund tracking (webhook-handler.ts:285-332)**
   - Add refund transaction insert
   - Update payment amount atomically
   - Update status on full refund

3. **Fix refund loop atomicity (payment-actions.ts:664-706)**
   - Create `process_player_payment_refund()` database function
   - Move Stripe calls outside transaction
   - Add retry logic for Stripe API failures

4. **Add chargeback handler**
   - Create `payment_disputes` table
   - Add `charge.dispute.*` webhook handlers
   - Send admin alerts

**Testing:** Run test suite + manual webhook replay

---

### Phase 2: High-Priority Warnings (P1) - THIS WEEK

**Timeline:** 3-5 days
**Risk:** MEDIUM - Edge case failures, audit gaps

1. **Fix optimistic lock race (subscriptions/route.ts:248-260)**
   - Wrap updates in database transaction
   - Use `SELECT ... FOR UPDATE`

2. **Add security event logging (subscriptions/route.ts:494-498)**
   - Log customer mismatch to audit trail
   - Alert on repeated mismatch attempts

3. **Fix event deduplication race (webhook-handler.ts:124-128)**
   - Create atomic check-and-insert RPC function

**Testing:** Concurrent webhook simulation

---

### Phase 3: Medium-Priority Warnings (P2) - NEXT SPRINT

**Timeline:** 1 week
**Risk:** LOW - UX impact, reporting accuracy

1. Add missing subscription state transitions
2. Fix installment race condition
3. Fix payment failure status logic
4. Add checkout session expiry handling

**Testing:** E2E tests for all payment flows

---

### Phase 4: Optimizations (P3) - BACKLOG

1. Add database indexes
2. Implement smart retry for failed payments
3. Add missing webhook handlers (trial_will_end, etc.)
4. Enhance test coverage

---

## 11. MONITORING & ALERTING RECOMMENDATIONS

### Critical Alerts (PagerDuty/Slack)

1. **Webhook Signature Failure** - Spike indicates attack or misconfiguration
2. **Customer ID Mismatch** - Potential fraud attempt
3. **Refund Without Transaction** - Financial discrepancy
4. **Chargeback Created** - Requires immediate action
5. **Subscription Downgrade Without Payment** - Access granted without payment

### Dashboard Metrics

1. **Webhook Processing Time** - P99 latency (alert if > 2s)
2. **Failed Webhook Rate** - Alert if > 1%
3. **Duplicate Event Rate** - Expected ~5% (Stripe retries), alert if > 10%
4. **Payment Success Rate** - Alert if < 95%
5. **Refund Rate** - Alert if > 5% (possible fraud or product issue)
6. **Revenue Reconciliation** - Daily Stripe vs DB comparison

### Audit Queries

```sql
-- Find payments charged but not recorded
SELECT
  pi.id AS payment_intent_id,
  pi.amount,
  pi.created
FROM stripe_payment_intents pi
LEFT JOIN payment_transactions pt ON pt.stripe_payment_intent_id = pi.id
WHERE pi.status = 'succeeded'
  AND pt.id IS NULL
  AND pi.created > NOW() - INTERVAL '7 days';

-- Find refunds not applied
SELECT
  r.id AS refund_id,
  r.amount,
  r.created,
  pt.id AS transaction_id
FROM stripe_refunds r
LEFT JOIN payment_transactions pt ON pt.stripe_refund_id = r.id
WHERE pt.id IS NULL
  AND r.created > NOW() - INTERVAL '7 days';
```

---

## 12. SECURITY BEST PRACTICES COMPLIANCE

### ✅ Followed Correctly

- [x] Webhook signature verification
- [x] Idempotency keys on all mutating operations
- [x] No raw card data storage (PCI DSS compliant)
- [x] Stripe as source of truth
- [x] Server-side fee calculation
- [x] Role-based access control
- [x] Audit logging

### ⚠️ Partial Compliance

- [ ] Event deduplication (has race condition)
- [ ] Transaction atomicity (critical gap in webhooks)
- [ ] Refund handling (incomplete)
- [ ] Error logging (may leak sensitive data)

### ❌ Not Implemented

- [ ] Chargeback handling
- [ ] Payment retry automation
- [ ] Rate limiting on checkout creation
- [ ] Fraud detection (Stripe Radar integration)
- [ ] Reconciliation reports

---

## 13. CONCLUSION

The HockeyLife payment system demonstrates strong security fundamentals with proper webhook verification, idempotency handling, and PCI compliance. However, **critical atomicity gaps** in webhook handlers and refund processing pose significant financial risk.

**Key Takeaway:** The architecture is sound (Stripe-as-source-of-truth, service role for webhooks), but implementation has race conditions that can cause money loss.

**Immediate Action Required:**
1. Fix atomic payment update (prevents lost payments)
2. Fix refund tracking (prevents financial discrepancy)
3. Add chargeback handler (prevents fraud losses)

**Estimated Remediation Effort:** 2-3 developer-weeks

**Post-Remediation:** Re-audit with webhook replay tests and concurrent load testing.

---

## APPENDIX A: PAYMENT FLOW DIAGRAMS

### Organization Subscription Flow
```
User clicks "Subscribe"
  → Server creates Stripe Customer (idempotent)
  → Server creates Stripe Subscription
  → Stripe sends invoice.paid webhook
  → Webhook verifies signature
  → Webhook checks duplicate
  → Webhook updates organization.subscription_status = 'active'
  → User granted access
```

### Player Fee Collection Flow
```
Player selects payment plan
  → Server creates player_payment record
  → Player clicks "Pay Now"
  → Server creates Stripe Checkout Session
  → Player completes payment on Stripe
  → Stripe sends checkout.session.completed webhook
  → Webhook inserts payment_transaction
  → Webhook updates player_payment.amount_paid_cents (ATOMIC)
  → Player granted league access
```

### Stripe Connect Payment Flow
```
League admin creates Connect account
  → Server creates Stripe Express account
  → Admin completes onboarding
  → Stripe sends account.updated webhook
  → Webhook updates league.stripe_account_status = 'complete'
  → League can accept payments
  → Player pays fee
  → Funds → League Connect account (minus platform fee)
  → Platform receives application_fee_amount
```

---

## APPENDIX B: RECOMMENDED TESTING SCENARIOS

### Webhook Testing

```bash
# Test duplicate webhook delivery
stripe trigger invoice.paid --override subscription_id=sub_123
stripe trigger invoice.paid --override subscription_id=sub_123

# Test out-of-order delivery
stripe trigger customer.subscription.updated --override created=1000
stripe trigger customer.subscription.updated --override created=999

# Test signature verification
curl -X POST http://localhost:3000/api/stripe/webhooks/subscriptions \
  -H "stripe-signature: invalid" \
  -d '{"type": "invoice.paid"}'
```

### Concurrency Testing

```javascript
// Test concurrent subscription modifications
await Promise.all([
  upgradeSubscription('sub_123', 'pro'),
  downgradeSubscription('sub_123', 'basic'),
]);

// Expected: One succeeds, one fails with optimistic lock error
```

### Refund Testing

```javascript
// Test partial refund
const payment = await createPayment({ amount: 10000 });
await refund({ paymentId: payment.id, amount: 5000 });

// Verify: amount_paid_cents = 5000, status = 'partially_refunded'
```

---

**END OF AUDIT REPORT**
