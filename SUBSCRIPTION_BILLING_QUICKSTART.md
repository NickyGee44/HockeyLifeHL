# Subscription Billing UI - Quick Start Guide

## What Was Built

A complete organization subscription billing UI that allows league owners to:
- View current subscription status
- Upgrade to paid tiers via Stripe Checkout
- Manage payment methods
- Cancel/reactivate subscriptions
- View billing history and invoices

## Files Created

### API Routes
- `apps/league-builder/src/app/api/stripe/create-checkout-session/route.ts`
  - Creates Stripe Checkout sessions for upgrades

### Components
- `apps/league-builder/src/components/subscription/current-plan-card.tsx`
  - Displays current subscription with status and actions
- `apps/league-builder/src/components/subscription/upgrade-plan-modal.tsx`
  - Modal for selecting and upgrading tiers
- `apps/league-builder/src/components/subscription/billing-history-table.tsx`
  - Table showing invoice history

### Pages
- `apps/league-builder/src/app/[locale]/dashboard/settings/billing/page.tsx` (updated)
- `apps/league-builder/src/app/[locale]/dashboard/settings/billing/page-client.tsx` (new)
- `apps/league-builder/src/app/[locale]/dashboard/settings/billing/success/page.tsx`
- `apps/league-builder/src/app/[locale]/dashboard/settings/billing/cancel/page.tsx`

### Documentation
- `SUBSCRIPTION_BILLING_IMPLEMENTATION.md` - Complete implementation details
- `SUBSCRIPTION_BILLING_TEST_GUIDE.md` - Comprehensive testing guide
- `SUBSCRIPTION_BILLING_QUICKSTART.md` - This file

## How to Test Locally

### 1. Set Environment Variables

Add to `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PRICE_ENTERPRISE=price_your_price_id
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_your_webhook_secret
```

### 2. Start Development Server

```bash
pnpm dev:builder
```

### 3. Navigate to Billing Page

```
http://localhost:3000/dashboard/settings/billing
```

### 4. Test Upgrade Flow

1. Click "Upgrade Plan" button
2. Select "Enterprise" tier
3. Click "Upgrade to Enterprise"
4. Enter test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify success page displays
7. Wait for redirect to billing page

### 5. Verify Features

- [x] Current plan displays
- [x] Status badge shows correctly
- [x] Upgrade modal opens
- [x] Stripe Checkout works
- [x] Success page displays
- [x] Billing history populates
- [x] Cancel subscription works
- [x] Manage billing portal opens

## Stripe Test Cards

### Successful Payment
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: 12345
```

### Declined Payment
```
Card: 4000 0000 0000 0002
Expiry: 12/34
CVC: 123
ZIP: 12345
```

### 3D Secure Authentication
```
Card: 4000 0027 6000 3184
Expiry: 12/34
CVC: 123
ZIP: 12345
```

## Architecture

### Flow Diagram

```
User clicks "Upgrade"
  ↓
UpgradePlanModal opens
  ↓
User selects tier
  ↓
POST /api/stripe/create-checkout-session
  ↓
Create Stripe Checkout session
  ↓
Redirect to Stripe Checkout
  ↓
User enters payment
  ↓
Stripe processes payment
  ↓
Redirect to success page
  ↓
Webhook updates database
  ↓
User sees updated subscription
```

### Component Hierarchy

```
BillingPage (page.tsx)
  └── BillingPageClient (page-client.tsx)
      ├── CurrentPlanCard
      │   ├── Upgrade button → opens modal
      │   ├── Manage Billing → opens portal
      │   ├── Cancel → cancels subscription
      │   └── Reactivate → reactivates subscription
      ├── BillingHistoryTable
      │   ├── Invoice rows
      │   ├── View links → Stripe hosted invoice
      │   └── PDF links → Download invoice
      └── UpgradePlanModal
          ├── Tier cards
          └── Upgrade buttons → Stripe Checkout
```

## Backend Actions Used

All actions in `apps/league-builder/src/lib/actions/subscription.ts`:

- `getCurrentSubscription()` - Gets current subscription data
- `getBillingHistory()` - Fetches invoices from Stripe
- `createBillingPortalSession()` - Opens Stripe Customer Portal
- `cancelSubscription()` - Cancels subscription at period end
- `reactivateSubscription()` - Reactivates cancelled subscription

## Database Tables

### organizations
Stores subscription data:
- `subscription_tier` - Current tier (free/custom_domain/enterprise)
- `subscription_status` - Status (trialing/active/past_due/canceled)
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Stripe subscription ID
- `current_period_start` - Billing period start date
- `current_period_end` - Billing period end date
- `cancel_at_period_end` - Scheduled for cancellation
- `payment_method_last4` - Last 4 digits of card
- `payment_method_brand` - Card brand (visa/mastercard/etc)

### organization_subscription_events
Audit log of subscription changes:
- Event type (created/upgraded/cancelled/reactivated)
- From/to tier and status
- Timestamp and user who triggered

## Common Issues

### Checkout Session Creation Fails
**Problem:** API returns error
**Solution:**
- Check `STRIPE_SECRET_KEY` is set
- Verify `STRIPE_PRICE_ENTERPRISE` exists in Stripe Dashboard
- Check organization ownership in database

### Webhook Not Processing
**Problem:** Subscription not updating after payment
**Solution:**
- Check `STRIPE_WEBHOOK_SECRET_ORGANIZATIONS` is correct
- Use Stripe CLI to forward webhooks locally
- Verify webhook endpoint is accessible
- Check application logs

### Database Not Updating
**Problem:** Subscription data not saving
**Solution:**
- Check RLS policies on `organizations` table
- Verify service role client is used
- Check optimistic locking version matches
- Review database error logs

## Next Steps

1. **Test Thoroughly**
   - Follow `SUBSCRIPTION_BILLING_TEST_GUIDE.md`
   - Test all Stripe test card scenarios
   - Verify webhook processing
   - Check database updates

2. **Configure Production**
   - Set production Stripe keys
   - Create production price in Stripe
   - Set up production webhook endpoint
   - Configure Stripe Customer Portal

3. **Monitor**
   - Watch Stripe Dashboard for events
   - Monitor application error logs
   - Track subscription metrics
   - Set up alerts for failed payments

4. **Support**
   - Document customer support procedures
   - Train team on Stripe Dashboard
   - Create runbook for common issues
   - Set up escalation process

## Key Features

### Security
- PCI compliant (no card data on server)
- User authentication required
- Organization ownership verified
- Idempotency keys prevent duplicate charges
- Optimistic locking prevents race conditions

### User Experience
- Dark theme consistent with app
- Loading states for all actions
- Success/error toast notifications
- Clear status badges
- Helpful error messages
- Automatic redirects

### Integration
- Stripe Checkout for payments
- Stripe Customer Portal for management
- Webhook-driven updates
- Real-time status sync
- Invoice PDF downloads

## Support

For help:
- Check `SUBSCRIPTION_BILLING_IMPLEMENTATION.md` for details
- Review `SUBSCRIPTION_BILLING_TEST_GUIDE.md` for testing
- Contact: support@beerleaguehockey.ca

---

**Quick Reference:**
- Billing Page: `/dashboard/settings/billing`
- API Endpoint: `/api/stripe/create-checkout-session`
- Test Card: `4242 4242 4242 4242`
- Status: ✅ Ready for Testing
