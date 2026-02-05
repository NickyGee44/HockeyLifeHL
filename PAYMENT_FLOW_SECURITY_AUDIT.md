# Payment Flow Security Audit: League Sites Player Portal

**Date**: 2026-02-05
**Auditor**: Security Engineer (Payments & Billing Specialist)
**Scope**: League Sites payment flow for `registration_submissions` table
**Severity**: CRITICAL - Revenue loss and compliance violations possible

---

## Executive Summary

The League Sites player portal (`apps/league-sites`) currently displays payment information but **DOES NOT have a working payment flow**. The placeholder code attempts to call a non-existent API endpoint (`/api/payments/create-checkout`) and references incorrect database tables.

### Critical Findings

#### 🔴 CRITICAL #1: No Payment Processing Implementation
- **Location**: `apps/league-sites/src/app/[leagueSlug]/me/payments/page.tsx:214-236`
- **Issue**: The "Pay Now" button calls a stub API endpoint that doesn't exist
- **Impact**: Players cannot pay outstanding balances, causing revenue loss
- **Evidence**:
  ```typescript
  const response = await fetch(`/api/payments/create-checkout`, {  // ← DOES NOT EXIST
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrationId,
      amount,
      returnUrl: `${window.location.origin}/${leagueSlug}/me/payments`,
    }),
  });
  ```

#### 🔴 CRITICAL #2: Wrong Table Schema
- **Location**: `apps/league-sites/src/app/[leagueSlug]/me/payments/page.tsx:89-108`
- **Issue**: Code queries `registration_submissions` with wrong field names
- **Impact**: Data fetch fails or returns incorrect amounts
- **Evidence**:
  - Code expects `registration_submissions.registration_type:registration_types(id, name, fee_amount_cents)`
  - But `registration_submissions` only has `registration_type ENUM`, not a foreign key
  - No `registration_types` table exists in schema

#### 🔴 CRITICAL #3: Missing Stripe Connect Account Verification
- **Location**: Entire payment flow
- **Issue**: No verification that league has Stripe Connect configured
- **Impact**: Payment attempts fail with no user-friendly error
- **Required Check**: Verify `leagues.stripe_account_id` exists and `stripe_account_status = 'complete'`

#### 🔴 CRITICAL #4: No Webhook Handler for Registration Payments
- **Location**: Webhook system
- **Issue**: Existing webhook handler only processes `player_payments` table events
- **Impact**: Even if checkout sessions are created, payment confirmations won't update `registration_submissions`
- **Evidence**: `handleCheckoutCompleted()` only checks for `session.metadata.type === 'player_fee'`

#### 🟡 WARNING #5: Payment Status Field Mismatch
- **Location**: `registration_submissions` schema
- **Issue**: Uses text-based `payment_status` instead of standardized enum
- **Impact**: Inconsistent status tracking, no database constraints
- **Current**: `payment_status TEXT CHECK (payment_status IN ('not_required', 'pending', 'completed', 'failed', 'refunded'))`
- **Risk**: Typos can bypass check constraint

#### 🟡 WARNING #6: No Idempotency Protection
- **Location**: Missing checkout session creation
- **Issue**: If implemented naively, duplicate charges possible on retry
- **Impact**: Players charged multiple times for same registration
- **Required**: Use `generateIdempotencyKey()` from `@/lib/stripe/idempotency`

#### 🟡 WARNING #7: No Application Fee Calculation
- **Location**: Missing checkout implementation
- **Issue**: Platform fee (2.99%) not being collected
- **Impact**: Direct revenue loss to platform
- **Required**: Use `calculateApplicationFee()` from `@/lib/leagues/stripe-connect`

#### 🟡 WARNING #8: Missing Audit Logging
- **Location**: No audit trail for registration payments
- **Issue**: No record of who initiated payment, when, and results
- **Impact**: Compliance and debugging issues
- **Required**: Log to `player_payment_audit_log` or create new table

---

## Data Model Analysis

### Current Schema: `registration_submissions`

```sql
CREATE TABLE registration_submissions (
  id UUID PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES profiles(id),
  league_id UUID NOT NULL REFERENCES leagues(id),
  season_id UUID NOT NULL REFERENCES seasons(id),
  team_id UUID REFERENCES teams(id),

  -- Payment fields
  payment_status TEXT DEFAULT 'not_required' CHECK (...),
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER DEFAULT 0,

  -- NO fee amount field! ❌
  -- NO registration_type foreign key! ❌

  registration_type registration_type_enum NOT NULL,  -- Just an enum
  ...
);
```

### Problem: Fee Amount Not Stored

The `registration_submissions` table does **NOT** store the fee amount. The payment page assumes there's a `registration_types` table with `fee_amount_cents`, but this doesn't exist.

**Potential Solutions:**

1. **Option A**: Add `fee_amount_cents` directly to `registration_submissions`
   - Pros: Simple, self-contained
   - Cons: Denormalized, fee changes don't retroactively apply

2. **Option B**: Create `registration_types` table with fees
   - Pros: Centralized fee management, reusable
   - Cons: More complex schema change

3. **Option C**: Use existing `season_fees` table
   - Pros: Leverage existing payment infrastructure
   - Cons: Registration fees != season fees conceptually

**Recommendation**: Option A - Add `fee_amount_cents` to `registration_submissions` during registration creation. Store the fee at time of registration to handle price changes.

---

## Stripe Flow Analysis

### Required Flow

```
1. Player clicks "Pay Now" on registration
   ↓
2. Server Action: createRegistrationCheckout(registrationId)
   - Fetch registration_submission
   - Verify player owns registration
   - Verify league has Stripe Connect account
   - Calculate amount owed (fee_amount_cents - amount_paid_cents)
   - Calculate platform fee (2.99%)
   - Create Stripe Checkout Session with:
     * Connected account: league.stripe_account_id
     * Application fee
     * Metadata: { registration_id, player_id, league_id }
     * Success/cancel URLs
   - Store session ID in registration_submission
   ↓
3. Redirect to Stripe Checkout
   ↓
4. Payment processed by Stripe
   ↓
5. Webhook: checkout.session.completed
   - Verify signature ✓
   - Check metadata.type === 'registration_fee'
   - Update registration_submission:
     * payment_status = 'completed'
     * amount_paid_cents += session.amount_total
     * stripe_payment_intent_id = session.payment_intent
   - Atomically using database function
   ↓
6. Player redirected to success page
```

### Security Requirements

- **Signature Verification**: MUST verify webhook signature BEFORE any business logic
- **Idempotency**: Use idempotency keys for Stripe API calls
- **Atomic Updates**: Use database transactions for payment + status updates
- **Source of Truth**: Stripe is always the source of truth, not local state
- **Metadata Validation**: Always include and validate `registration_id` in metadata

---

## Vulnerabilities by Category

### 1. Idempotency & Replay Safety

**FAIL**: No implementation exists, so not applicable yet

**Required for Implementation:**
- ✅ Use `generateIdempotencyKey('create_checkout', { registration_id, amount })`
- ✅ Store `stripe_checkout_session_id` before redirect
- ✅ Check if session already exists before creating new one
- ✅ Handle webhook duplicate delivery (check `stripe_payment_intent_id` already set)

### 2. Webhook Security & Ordering

**FAIL**: Webhook handler exists but doesn't handle registration payments

**Required Fixes:**
- ✅ Add new webhook handler case for `metadata.type === 'registration_fee'`
- ✅ Verify signature using `STRIPE_PLAYER_PAYMENTS_WEBHOOK_SECRET`
- ✅ Log webhook events to audit table
- ✅ Handle out-of-order delivery (webhook before user returns)
- ✅ Idempotent processing (same event delivered multiple times)

### 3. Source of Truth & State Consistency

**CURRENT STATE**: No payment flow, so no state divergence yet

**Implementation Requirements:**
- Stripe Checkout Session is source of truth for payment amount
- `registration_submissions.amount_paid_cents` mirrors Stripe charge amount
- Never trust client-side amount calculations
- Reconciliation: Periodic job to compare local state with Stripe API

### 4. Entitlement Invariants

**RISK**: Not applicable - registrations don't grant immediate access

**Note**: Registration approval is manual, so payment ≠ automatic access. This is SAFE.

### 5. Money Movement Edge Cases

**NOT HANDLED**:
- ❌ Refunds: No refund mechanism for registrations
- ❌ Chargebacks: Not tracked for registration payments
- ❌ Partial payments: `registration_submissions` doesn't support installments
- ❌ Failed payments: No retry mechanism

**Recommendations:**
- Implement admin refund action (update `payment_status = 'refunded'`, create Stripe refund)
- Add chargeback tracking (reuse existing `payment_disputes` table or create new)
- Document that registrations are full-payment-only (no installments)

### 6. PCI Compliance & Data Security

**GOOD**: No card data touches the system

**Verified:**
- ✅ All payments go through Stripe Checkout (hosted)
- ✅ No raw card data stored
- ✅ Only store Stripe tokens (payment_intent_id, customer_id)

**Required:**
- ✅ Never log payment_intent IDs in client-side console
- ✅ Use sanitizeErrorForLogging for all Stripe errors

### 7. Fraud & Abuse Vectors

**RISKS**:
- 🟡 No rate limiting on checkout session creation
- 🟡 No duplicate registration detection (same player, same season)
- 🟡 No payment method verification (stolen cards)

**Mitigations:**
- Existing: UNIQUE constraint on `(player_id, league_id, season_id)`
- Needed: Rate limit on checkout creation (max 5 per player per hour)
- Needed: Stripe Radar automatic fraud detection (already enabled on platform account)

---

## Correct Database Schema for Registration Fees

### Missing Column: `fee_amount_cents`

**Migration Required:**

```sql
-- Add fee amount to registration_submissions
ALTER TABLE registration_submissions
ADD COLUMN fee_amount_cents INTEGER DEFAULT 0 CHECK (fee_amount_cents >= 0);

-- Add currency field
ALTER TABLE registration_submissions
ADD COLUMN currency TEXT DEFAULT 'usd' CHECK (currency IN ('usd', 'cad'));

-- Add checkout session tracking
ALTER TABLE registration_submissions
ADD COLUMN stripe_checkout_session_id TEXT;

-- Add index for payment tracking
CREATE INDEX idx_reg_submissions_payment_status
ON registration_submissions(payment_status)
WHERE payment_status != 'not_required';

-- Update payment_status check constraint to include 'partial'
ALTER TABLE registration_submissions
DROP CONSTRAINT IF EXISTS registration_submissions_payment_status_check;

ALTER TABLE registration_submissions
ADD CONSTRAINT registration_submissions_payment_status_check
CHECK (payment_status IN ('not_required', 'pending', 'partial', 'completed', 'failed', 'refunded'));
```

---

## Implementation Checklist

### Phase 1: Database Schema (REQUIRED FIRST)
- [ ] Add `fee_amount_cents` column to `registration_submissions`
- [ ] Add `currency` column
- [ ] Add `stripe_checkout_session_id` column
- [ ] Update payment_status constraint
- [ ] Deploy migration to production

### Phase 2: Server Action Implementation
- [ ] Create `apps/league-sites/src/lib/actions/registration-payments.ts`
- [ ] Implement `createRegistrationCheckout(registrationId)` action
  - [ ] Fetch registration with league join
  - [ ] Verify player owns registration
  - [ ] Verify league has Stripe Connect
  - [ ] Calculate amount owed
  - [ ] Calculate application fee (2.99%)
  - [ ] Create Stripe Checkout Session with idempotency key
  - [ ] Store session ID
  - [ ] Return checkout URL
- [ ] Implement `getRegistrationPaymentHistory(leagueSlug)` action

### Phase 3: Webhook Handler Updates
- [ ] Update `handleCheckoutCompleted()` to process registration payments
  - [ ] Check `metadata.type === 'registration_fee'`
  - [ ] Update `registration_submissions.payment_status`
  - [ ] Update `amount_paid_cents`
  - [ ] Store `stripe_payment_intent_id`
  - [ ] Log to audit table
- [ ] Add `handleRegistrationRefund()` for refund events
- [ ] Test webhook idempotency (same event delivered 2x)

### Phase 4: UI Updates
- [ ] Fix data fetching in `page.tsx` to use correct schema
- [ ] Update "Pay Now" button to call real server action
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add success redirect logic
- [ ] Display payment history from audit log

### Phase 5: Testing & Security Review
- [ ] Test: Successful payment flow end-to-end
- [ ] Test: Failed payment (declined card)
- [ ] Test: Webhook replay (same event 2x)
- [ ] Test: Race condition (webhook before user redirect)
- [ ] Test: Partial payment (pay 50%, pay 50% later)
- [ ] Test: Refund flow
- [ ] Test: League without Stripe Connect
- [ ] Security review: No PCI data leakage
- [ ] Security review: Proper authorization checks

---

## Recommended Implementation

Since the existing `player_payments` system is sophisticated and well-tested, I recommend a **HYBRID APPROACH**:

1. **Keep registration_submissions simple** - just track payment status
2. **Reuse existing payment infrastructure** - leverage `createCheckoutSession()` pattern
3. **Separate webhook logic** - add registration-specific handlers
4. **Unified audit trail** - use existing `player_payment_audit_log` table

This minimizes code duplication while maintaining security guarantees.

---

## Critical Next Steps

1. **Schema Migration**: Add `fee_amount_cents` to `registration_submissions` (BLOCKING)
2. **Server Action**: Create `createRegistrationCheckout()` using existing patterns
3. **Webhook Handler**: Add registration payment case to existing handler
4. **UI Update**: Connect "Pay Now" button to real action
5. **Testing**: Full end-to-end payment flow test

**Estimated Effort**: 4-6 hours for complete implementation + testing

**Risk Level**: HIGH - Money operations require extreme care

---

## Conclusion

The League Sites payment flow is **NOT IMPLEMENTED**. The UI shows a skeleton, but:

- No API endpoint exists
- No server action exists
- No webhook handler for registration payments
- Database schema is missing fee amount field

**RECOMMENDATION**: Follow the implementation checklist above to build a secure, idempotent payment flow that reuses existing Stripe Connect infrastructure while keeping registration payments separate from season fee payments.

All critical invariants must be maintained:
- Stripe is source of truth
- Webhook signature verification BEFORE any logic
- Idempotent operations with proper keys
- Atomic database updates
- Full audit logging
- No PCI data exposure

**Priority**: CRITICAL - Revenue-impacting feature
