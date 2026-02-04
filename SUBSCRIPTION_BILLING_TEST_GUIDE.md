# Subscription Billing UI - Testing Guide

## Overview

This guide provides comprehensive testing instructions for the organization subscription billing UI feature.

## Prerequisites

1. **Stripe Account Setup**
   - Stripe account in test mode
   - Environment variables configured:
     - `STRIPE_SECRET_KEY` - Your Stripe secret key
     - `STRIPE_PRICE_ENTERPRISE` - Price ID for enterprise tier
     - `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS` - Webhook signing secret

2. **Database Setup**
   - Organization with user ownership
   - RLS policies enabled on `organizations` table

3. **Local Development**
   ```bash
   pnpm dev:builder
   ```

## Test Scenarios

### 1. View Current Subscription

**Test Free Tier (Default)**

1. Navigate to `/dashboard/settings/billing`
2. Verify current plan shows "Free Forever"
3. Verify "Upgrade Plan" button is visible
4. Verify no payment method is shown
5. Verify billing history is empty

**Expected Result:**
- Current plan card displays with tier "Free Forever"
- Status badge shows appropriate status
- Upgrade button present

### 2. Upgrade to Enterprise Tier

**Test Stripe Checkout Flow**

1. Click "Upgrade Plan" button
2. Modal opens showing available tiers
3. Click "Upgrade to Enterprise" button
4. Verify redirect to Stripe Checkout page
5. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
6. Complete checkout
7. Verify redirect to success page
8. Wait for automatic redirect to billing page

**Expected Result:**
- Checkout session created successfully
- Stripe Checkout page loads
- Payment processed successfully
- Success page displays
- Billing page shows updated subscription

### 3. Test Stripe Test Cards

**Successful Payment**
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: 12345
```

**Payment Requires Authentication (3D Secure)**
```
Card: 4000 0027 6000 3184
Expiry: 12/34
CVC: 123
ZIP: 12345
```
- Click "Complete authentication" in test modal

**Declined Payment**
```
Card: 4000 0000 0000 0002
Expiry: 12/34
CVC: 123
ZIP: 12345
```

**Insufficient Funds**
```
Card: 4000 0000 0000 9995
Expiry: 12/34
CVC: 123
ZIP: 12345
```

### 4. Cancel Checkout

1. Click "Upgrade Plan"
2. Select a tier
3. Redirect to Stripe Checkout
4. Click browser back button or cancel
5. Verify redirect to cancel page
6. Click "Try Again" or "Back to Billing"

**Expected Result:**
- Cancel page displays
- No charge made
- Return to billing page works

### 5. View Billing History

**After Successful Subscription**

1. Complete a successful upgrade
2. Wait 30 seconds for webhook processing
3. Refresh billing page
4. Verify invoice appears in billing history
5. Check invoice details:
   - Date
   - Description
   - Amount
   - Status (Paid)
6. Click "View" to see hosted invoice
7. Click "PDF" to download invoice

**Expected Result:**
- Invoice list populates
- Invoice details accurate
- Links to Stripe invoice work

### 6. Manage Billing Portal

**Test Stripe Customer Portal**

1. Click "Manage Billing" button
2. Verify redirect to Stripe billing portal
3. Verify customer information displays
4. Test payment method update
5. Test invoice download
6. Return to application

**Expected Result:**
- Billing portal opens
- Customer data accurate
- Payment method updates work
- Return URL redirects back

### 7. Cancel Subscription

**Test Cancellation Flow**

1. With active subscription, click "Cancel Subscription"
2. Confirm cancellation in dialog
3. Verify success toast message
4. Verify "Subscription Ending" notice appears
5. Verify effective date shows current period end
6. Verify "Reactivate Subscription" button appears

**Expected Result:**
- Cancellation succeeds
- Status shows cancellation scheduled
- Can reactivate before period ends

### 8. Reactivate Subscription

**Test Reactivation**

1. After canceling, click "Reactivate Subscription"
2. Verify success toast
3. Verify "Subscription Ending" notice disappears
4. Verify subscription continues normally

**Expected Result:**
- Reactivation succeeds
- Subscription status restored
- No new charge

### 9. Past Due Status

**Test Failed Payment Handling**

1. Update payment method to declined card
2. Wait for next billing cycle (or trigger via Stripe Dashboard)
3. Verify "Payment Failed" warning appears
4. Verify "Update Payment Method" button
5. Click button to open billing portal
6. Update to valid payment method

**Expected Result:**
- Past due warning displays
- Update payment works
- Subscription status recovers

### 10. Trial Period (If Applicable)

**Test Trial Flow**

1. Start new subscription with trial
2. Verify "Trial Period" notice appears
3. Verify days remaining display
4. Verify trial end date
5. Wait for trial to end (or simulate via Stripe)
6. Verify conversion to active subscription

**Expected Result:**
- Trial info displays correctly
- Trial converts to paid subscription
- First payment processes

## Webhook Testing

### Setup Stripe CLI

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe:
   ```bash
   stripe login
   ```
3. Forward webhooks to local:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhooks/subscriptions
   ```
4. Copy webhook signing secret to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_...
   ```

### Test Webhook Events

1. Trigger test events via Stripe CLI:
   ```bash
   # Successful payment
   stripe trigger checkout.session.completed

   # Subscription created
   stripe trigger customer.subscription.created

   # Subscription updated
   stripe trigger customer.subscription.updated

   # Invoice paid
   stripe trigger invoice.paid

   # Payment failed
   stripe trigger invoice.payment_failed

   # Subscription deleted
   stripe trigger customer.subscription.deleted
   ```

2. Verify each event updates the database correctly
3. Check application logs for webhook processing

## Error Scenarios

### 1. Missing Stripe Configuration

1. Remove `STRIPE_PRICE_ENTERPRISE` from env
2. Try to upgrade
3. Verify error message displays

### 2. Network Errors

1. Disconnect internet
2. Try to load billing page
3. Verify error handling

### 3. Invalid Session

1. Logout user
2. Try to access billing page
3. Verify redirect to login

### 4. Concurrent Modifications

1. Open billing page in two browser tabs
2. Upgrade in tab 1
3. Try to cancel in tab 2
4. Verify optimistic locking prevents race condition

## Database Verification

After each test, verify database state:

```sql
-- Check organization subscription
SELECT
  id,
  name,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  subscription_version
FROM organizations
WHERE id = 'your-org-id';

-- Check subscription events log
SELECT *
FROM organization_subscription_events
WHERE organization_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;
```

## Success Criteria

All tests must pass:

- [ ] Free tier displays correctly
- [ ] Upgrade flow completes successfully
- [ ] Stripe Checkout integration works
- [ ] Success page displays and redirects
- [ ] Cancel page works
- [ ] Billing history populates
- [ ] Invoice links work (view/download)
- [ ] Manage billing portal opens
- [ ] Cancel subscription works
- [ ] Reactivate subscription works
- [ ] Past due warning displays
- [ ] Trial period (if enabled) works
- [ ] Webhooks process correctly
- [ ] Database updates correctly
- [ ] Error handling works
- [ ] Concurrent modification prevention works

## Stripe Dashboard Verification

1. Login to Stripe Dashboard (Test Mode)
2. Navigate to Customers
3. Find your test customer
4. Verify:
   - Customer created with correct metadata
   - Subscription active
   - Payment method attached
   - Invoices generated
   - Events logged

## Known Issues / Notes

1. **Trial Abuse Prevention**: System checks if user has already had a trial. Test with fresh user accounts.
2. **Idempotency**: Duplicate requests within 24 hours return cached response.
3. **Webhook Delay**: Allow 30-60 seconds for webhook processing after Stripe events.
4. **Price IDs**: Ensure price IDs in env match those in Stripe Dashboard.
5. **Optimistic Locking**: Subscription version field prevents concurrent modifications.

## Troubleshooting

### Checkout Session Fails
- Check `STRIPE_SECRET_KEY` is set
- Check `STRIPE_PRICE_ENTERPRISE` exists in Stripe
- Check organization has user ownership
- Check Stripe Dashboard for error details

### Webhook Not Processing
- Check `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS` is correct
- Use Stripe CLI to test webhook delivery
- Check application logs for errors
- Verify webhook endpoint is accessible

### Database Not Updating
- Check RLS policies allow updates
- Check service role client is used
- Check optimistic locking version matches
- Check database logs for errors

## Next Steps After Testing

1. Deploy to staging environment
2. Configure production Stripe keys
3. Update webhook endpoints in Stripe Dashboard
4. Test with real payment methods (use Stripe test mode)
5. Monitor error logs
6. Set up Stripe event alerts
7. Configure subscription emails
8. Document customer support procedures
