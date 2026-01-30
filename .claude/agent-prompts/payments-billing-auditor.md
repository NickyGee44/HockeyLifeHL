# Payments & Billing Auditor Agent Prompts

**Agent:** payments-billing-auditor
**Purpose:** Stripe integration, billing logic, PCI compliance, payment security

---

## Full Billing System Audit

```
Perform comprehensive audit of billing and payment system.

Audit:

1. Stripe Integration
   - API key security
   - Webhook configuration
   - Webhook signature verification
   - Error handling
   - Retry logic
   - Idempotency

2. Subscription Management
   - Subscription creation flow
   - Subscription upgrade flow
   - Subscription downgrade flow
   - Subscription cancellation flow
   - Trial period handling
   - Proration calculations

3. Payment Processing
   - Payment method handling
   - Payment intent creation
   - Payment confirmation
   - Failed payment handling
   - Refund processing
   - Dispute handling

4. Data Consistency
   - Stripe data synced with database?
   - Subscription status always accurate?
   - Payment history complete?
   - Audit trail exists?

5. PCI Compliance
   - No card data stored locally?
   - Stripe.js used for card collection?
   - PCI SAQ-A compliance?
   - Secure iframe for payment forms?

6. Security
   - Webhook endpoints secured?
   - API calls authenticated?
   - Sensitive data logged?
   - Rate limiting on payment endpoints?

7. Error Handling
   - Network errors handled?
   - Stripe API errors handled?
   - Partial failures recovered?
   - Users notified appropriately?

8. Testing
   - Test mode properly configured in dev?
   - Production keys secured?
   - Test coverage for payment flows?

Provide detailed report with:
- Critical issues (fix immediately)
- High priority issues (fix within 1 week)
- Medium priority issues (fix within 1 month)
- Recommendations
- Compliance gaps

For each issue:
- File location
- Code snippet
- Risk description
- Recommended fix
- Compliance impact
```

---

## Stripe Webhook Audit

```
Audit Stripe webhook implementation: [WEBHOOK_PATH]

Review:

1. Webhook Configuration
   - Webhook URL correct?
   - Events subscribed correct?
   - Webhook secret configured?

2. Signature Verification
   - Is webhook signature verified?
   - Is verification done before processing?
   - Is raw body used for verification?

   Example:
   ```typescript
   const sig = req.headers['stripe-signature'];
   const event = stripe.webhooks.constructEvent(
     req.body,
     sig,
     webhookSecret
   );
   ```

3. Idempotency
   - Are webhooks idempotent?
   - Are duplicate events handled?
   - Is event ID stored to prevent reprocessing?

   Example:
   ```typescript
   // Check if event already processed
   const existing = await db
     .from('stripe_events')
     .select('id')
     .eq('stripe_event_id', event.id)
     .single();

   if (existing) {
     return { status: 'already_processed' };
   }
   ```

4. Event Handling
   - What events are handled?
   - Is each event handler correct?
   - Are errors caught and logged?

   Events to handle:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - customer.subscription.trial_will_end
   - invoice.payment_succeeded
   - invoice.payment_failed
   - payment_intent.succeeded
   - payment_intent.payment_failed

5. Data Consistency
   - Is subscription status updated correctly?
   - Is organization data synced?
   - Are payment records created?
   - Are failed updates retried?

6. Error Handling
   - What happens if database update fails?
   - Are errors logged with context?
   - Are failed webhooks retried?
   - Is there alerting for failures?

7. Transaction Safety
   - Are database updates atomic?
   - Can partial updates occur?
   - Is rollback possible?

8. Security
   - Is webhook endpoint rate limited?
   - Is authentication required?
   - Are logs sanitized (no sensitive data)?

Test scenarios:
- Valid webhook with signature
- Invalid signature (should reject)
- Duplicate webhook (should handle)
- Database error during processing
- Unknown event type

Provide:
- Vulnerabilities found
- Correctness issues
- Recommended fixes
- Test cases needed
```

---

## Subscription Flow Audit

```
Audit subscription flow: [FLOW_NAME]

Flow: [signup / upgrade / downgrade / cancellation]

Review:

1. Flow Steps
   - List all steps in the flow
   - Verify each step is correct
   - Check for missing steps

2. Stripe API Calls
   - What Stripe APIs are called?
   - Are calls in correct order?
   - Are parameters correct?
   - Is error handling present?

3. Proration Handling (for upgrades/downgrades)
   - Is proration calculated correctly?
   - Is proration behavior set (create_prorations)?
   - Is invoice preview shown to user?
   - Is charge amount correct?

   Example:
   ```typescript
   // Preview invoice before upgrade
   const invoice = await stripe.invoices.retrieveUpcoming({
     customer: customerId,
     subscription: subscriptionId,
     subscription_items: [{
       id: subscriptionItemId,
       price: newPriceId,
     }],
   });
   ```

4. Trial Period
   - Is trial period set correctly?
   - Is trial_end timestamp correct?
   - What happens when trial ends?
   - Can user cancel during trial?

5. Payment Method
   - Is payment method required?
   - Is payment method validated?
   - Can user update payment method?
   - What if payment method expired?

6. Failed Payments
   - What happens if payment fails?
   - Is subscription status updated?
   - Is user notified?
   - Is retry schedule configured?

7. Cancellation
   - Is subscription cancelled immediately or at period end?
   - Is subscription_cancel_at_period_end set?
   - Can user reactivate cancelled subscription?
   - Is data retained after cancellation?

8. Database Sync
   - Is organization.subscription_status updated?
   - Is organization.subscription_tier updated?
   - Is organization.trial_ends_at updated?
   - Is sync atomic?

9. Edge Cases
   - User upgrades during trial
   - User downgrades immediately after upgrade
   - Payment fails during upgrade
   - User has multiple active subscriptions
   - Subscription deleted in Stripe but not in DB

10. User Experience
    - Are loading states shown?
    - Are errors displayed clearly?
    - Is success confirmed?
    - Is email confirmation sent?

Test cases:
- Happy path (successful flow)
- Failed payment
- Network error
- Stripe API error
- Concurrent subscription changes
- User closes browser mid-flow

Provide:
- Flow diagram
- Issues found
- Recommended fixes
- Test coverage gaps
```

---

## Payment Method Security Audit

```
Audit payment method handling for PCI compliance.

Review:

1. Card Data Collection
   - Is Stripe.js or Stripe Elements used?
   - Is card data sent to our servers? (MUST BE NO)
   - Is payment form in secure iframe?
   - Is HTTPS enforced?

   Correct implementation:
   ```typescript
   // CORRECT: Using Stripe.js
   const { error, paymentMethod } = await stripe.createPaymentMethod({
     type: 'card',
     card: cardElement,
   });

   // Send only paymentMethod.id to server
   await fetch('/api/payment', {
     method: 'POST',
     body: JSON.stringify({ paymentMethodId: paymentMethod.id }),
   });
   ```

   Incorrect implementation:
   ```typescript
   // WRONG: Sending card data to server
   await fetch('/api/payment', {
     method: 'POST',
     body: JSON.stringify({
       cardNumber: '4242424242424242', // PCI violation!
       cardExpiry: '12/25',
       cardCvc: '123',
     }),
   });
   ```

2. Payment Method Storage
   - Are payment methods stored in Stripe only?
   - Do we store only payment method IDs?
   - Do we store last 4 digits? (allowed)
   - Do we store full card number? (NOT ALLOWED)

   Allowed to store:
   - Payment method ID (pm_xxx)
   - Last 4 digits
   - Brand (Visa, Mastercard, etc.)
   - Expiry month/year

   Not allowed to store:
   - Full card number
   - CVV/CVC
   - PIN

3. PCI SAQ-A Compliance
   - Do we qualify for SAQ-A? (should be yes)
   - Are payment forms hosted by Stripe?
   - Is our server never touching card data?

4. Logging
   - Are payment method IDs logged? (okay)
   - Are card numbers logged? (NOT ALLOWED)
   - Are CVVs logged? (NOT ALLOWED)
   - Are logs sanitized?

5. Error Messages
   - Do error messages expose card data?
   - Are error messages generic?

6. Test Data
   - Are test card numbers used in dev?
   - Are test keys used in dev?
   - Are production keys secured?

7. Access Control
   - Who can access payment methods?
   - Are payment methods encrypted?
   - Is access logged?

PCI Compliance Checklist:
- [ ] No card data sent to our servers
- [ ] Stripe.js/Elements used for collection
- [ ] HTTPS enforced everywhere
- [ ] No card numbers in logs
- [ ] No CVVs stored anywhere
- [ ] Production keys secured
- [ ] Access control in place
- [ ] Security audit completed

Provide:
- PCI compliance status (compliant / non-compliant)
- Violations found
- Recommended fixes
- Compliance documentation needed
```

---

## Refund Process Audit

```
Audit refund processing logic: [CODE_PATH]

Review:

1. Refund Creation
   - When can refunds be issued?
   - Who can issue refunds?
   - Are refunds validated before processing?

   Example:
   ```typescript
   const refund = await stripe.refunds.create({
     payment_intent: paymentIntentId,
     amount: amountToRefund, // in cents
     reason: 'requested_by_customer',
   });
   ```

2. Partial vs Full Refunds
   - Can partial refunds be issued?
   - Is refund amount validated?
   - Are multiple partial refunds allowed?
   - Is total refunded tracked?

3. Subscription Refunds
   - What happens to subscription after refund?
   - Is subscription cancelled?
   - Is access revoked immediately?
   - Is proration considered?

4. Database Updates
   - Is refund recorded in database?
   - Is organization status updated?
   - Is subscription status updated?
   - Is update atomic?

5. Idempotency
   - Can duplicate refunds occur?
   - Is idempotency key used?
   - Are refund IDs stored?

   Example:
   ```typescript
   const refund = await stripe.refunds.create({
     payment_intent: paymentIntentId,
     amount: amount,
   }, {
     idempotencyKey: `refund-${orderId}`,
   });
   ```

6. Error Handling
   - What if refund fails?
   - Is user notified?
   - Is admin alerted?
   - Is retry attempted?

7. Audit Trail
   - Who issued the refund?
   - When was refund issued?
   - Why was refund issued?
   - Is audit trail complete?

8. Webhook Handling
   - Is charge.refunded webhook handled?
   - Is database updated on webhook?
   - Is idempotency ensured?

9. Edge Cases
   - Refund after subscription cancelled
   - Multiple refund requests simultaneously
   - Refund of disputed charge
   - Refund after trial ended

Test scenarios:
- Full refund
- Partial refund
- Multiple partial refunds
- Refund of non-existent charge
- Duplicate refund request
- Refund during active subscription

Provide:
- Issues found
- Recommended fixes
- Test cases needed
```

---

## Billing Analytics Audit

```
Review billing analytics and reporting.

Analyze:

1. Revenue Tracking
   - Is MRR (Monthly Recurring Revenue) tracked?
   - Is ARR (Annual Recurring Revenue) tracked?
   - Is churn rate calculated?
   - Is LTV (Lifetime Value) calculated?

2. Subscription Metrics
   - New subscriptions
   - Upgraded subscriptions
   - Downgraded subscriptions
   - Cancelled subscriptions
   - Reactivated subscriptions

3. Payment Metrics
   - Successful payments
   - Failed payments
   - Failed payment rate
   - Average transaction value
   - Refund rate

4. Customer Metrics
   - Total customers
   - Active customers
   - Churned customers
   - Customer acquisition cost
   - Customer lifetime value

5. Data Sources
   - Stripe reporting
   - Database queries
   - Custom analytics
   - Consistency between sources

6. Reporting
   - Admin dashboard
   - Email reports
   - Stripe dashboard
   - Export functionality

7. Alerting
   - Failed payment spike alert
   - Churn rate increase alert
   - Revenue drop alert

Provide:
- Current metrics being tracked
- Missing metrics
- Recommended metrics to add
- Dashboard improvements
- Alert configurations
```

---

## Stripe Test Mode Verification

```
Verify Stripe test mode is correctly configured in development.

Check:

1. API Keys
   - Are test keys used in development?
   - Are production keys used in production?
   - Are keys stored securely?
   - Are keys in environment variables?

   Test keys start with:
   - pk_test_... (publishable key)
   - sk_test_... (secret key)

   Production keys start with:
   - pk_live_... (publishable key)
   - sk_live_... (secret key)

2. Test Cards
   - Are test cards documented?
   - Are test cards used in development?
   - Are real cards rejected in dev?

   Common test cards:
   - 4242424242424242 (success)
   - 4000000000000002 (declined)
   - 4000002500003155 (requires authentication)

3. Webhooks
   - Are test webhooks configured?
   - Is test webhook secret used?
   - Can test webhooks be triggered?

4. Data Separation
   - Is test data separate from prod data?
   - Can test mode access prod data? (should be no)

5. UI Indicators
   - Is test mode indicated in UI?
   - Are developers aware they're in test mode?

Provide:
- Configuration status
- Issues found
- Setup guide for new developers
```

---

## Failed Payment Recovery Audit

```
Audit failed payment recovery process.

Review:

1. Detection
   - How are failed payments detected?
   - Is webhook handled? (invoice.payment_failed)
   - Is polling used as backup?

2. Retry Logic
   - What is retry schedule?
   - How many retries?
   - Is exponential backoff used?

   Stripe Smart Retries:
   - Automatically retries failed payments
   - Uses optimal timing based on failure reason
   - Can be configured in Stripe dashboard

3. User Notification
   - Is user notified of failure?
   - Is notification immediate?
   - Is notification method appropriate (email)?
   - Does notification include next steps?

4. Payment Method Update
   - Can user update payment method easily?
   - Is link provided in notification?
   - Is process self-service?

5. Subscription Status
   - What happens to subscription after failure?
   - Is subscription paused or cancelled?
   - How long before access is revoked?
   - Is grace period provided?

6. Database State
   - Is subscription_status updated? (e.g., 'past_due')
   - Is payment failure recorded?
   - Is retry count tracked?

7. Recovery Success
   - Is successful recovery tracked?
   - Is user notified of recovery?
   - Is access restored immediately?

8. Final Cancellation
   - After how many failures is subscription cancelled?
   - Is user notified before cancellation?
   - Can subscription be reactivated?

Provide:
- Current recovery flow
- Issues found
- Recommended improvements
- Success rate metrics
```

---

## Invoice Generation Audit

```
Audit invoice generation and delivery.

Review:

1. Invoice Creation
   - When are invoices created?
   - What is included on invoice?
   - Are line items correct?
   - Is tax calculated?

2. Invoice Delivery
   - Are invoices emailed to customers?
   - Can customers download invoices?
   - Are invoices accessible in dashboard?

3. Invoice Data
   Required fields:
   - Invoice number
   - Invoice date
   - Due date
   - Billing address
   - Line items with descriptions
   - Subtotal
   - Tax
   - Total
   - Payment status

4. Proration
   - Are prorations shown on invoice?
   - Are prorations calculated correctly?
   - Are prorations explained clearly?

5. Customization
   - Is company logo on invoice?
   - Is company information correct?
   - Is invoice customized per customer?

6. Compliance
   - Does invoice meet tax requirements?
   - Is invoice format compliant?
   - Are all required fields present?

7. Storage
   - Are invoices stored?
   - Can invoices be retrieved?
   - Is historical access available?

Provide:
- Invoice template review
- Missing fields
- Compliance gaps
- Recommended improvements
```

---

## Usage Examples

### Full Billing Audit
```bash
claude --agent payments-billing-auditor \
  "Use 'Full Billing System Audit' prompt"
```

### Audit Webhook
```bash
claude --agent payments-billing-auditor \
  "Use 'Stripe Webhook Audit' prompt for subscription webhook handler"
```

### Audit Subscription Flow
```bash
claude --agent payments-billing-auditor \
  "Use 'Subscription Flow Audit' prompt for upgrade flow"
```

### Check PCI Compliance
```bash
claude --agent payments-billing-auditor \
  "Use 'Payment Method Security Audit' prompt"
```

---

**Last Updated:** 2026-01-30
