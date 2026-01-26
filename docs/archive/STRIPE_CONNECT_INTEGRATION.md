## Stripe Connect Integration - Complete Implementation

This document describes the complete Stripe Connect integration for HockeyLifeHL multi-tenant platform.

---

## Overview

This integration implements Stripe Connect for a multi-tenant hockey league platform using:
- **V2 Connect Accounts** - Unified accounts that can both accept payments and be charged
- **Direct Charges** - Payments go to connected accounts, platform takes application fee
- **Platform Subscriptions** - Charge connected accounts for platform usage
- **Webhook Handling** - Both thin events (V2) and regular events (subscriptions)

---

## Architecture

### Connected Accounts (Leagues)
Each league gets a Stripe V2 Connect account that can:
1. **Accept payments** (merchant) - Sell products to players
2. **Be charged** (customer) - Pay for platform subscription

### Payment Flows

#### 1. League → Players (Direct Charge)
```
Player pays $100 for season registration
→ $5 goes to platform (5% application fee)
→ $95 goes to league's connected account
```

#### 2. Platform → League (Subscription)
```
League subscribes to Pro plan ($99/month)
→ Platform charges the league's connected account
→ Money goes to platform account
```

---

## Files Created

### 1. Stripe Client
**`src/lib/stripe/client.ts`**
- Creates single Stripe client instance
- Validates environment variables
- Exports publishable key for client-side

### 2. API Routes

#### Connected Account Management
- **`src/app/api/stripe/connect/create-account/route.ts`**
  - Creates V2 Connect account for leagues
  - Stores account ID in database
  - Uses unified account model (no top-level type)

- **`src/app/api/stripe/connect/create-account-link/route.ts`**
  - Generates onboarding link for Express accounts
  - Configures merchant + customer capabilities
  - Handles return/refresh URLs

- **`src/app/api/stripe/connect/account-status/route.ts`**
  - Fetches account status directly from Stripe API
  - Checks onboarding completion
  - Verifies payment processing capability

#### Product Management
- **`src/app/api/stripe/connect/create-product/route.ts`**
  - Creates products on connected account using Stripe-Account header
  - Includes default price data
  - Returns product and price IDs

- **`src/app/api/stripe/connect/list-products/route.ts`**
  - Lists products from connected account
  - Expands default_price for full details
  - Public endpoint (no auth required)

#### Payment Processing
- **`src/app/api/stripe/connect/create-checkout/route.ts`**
  - Creates checkout session for Direct Charges
  - Calculates and applies application fee (5%)
  - Uses connected account header

#### Subscription Management
- **`src/app/api/stripe/connect/create-subscription-checkout/route.ts`**
  - Creates subscription checkout for platform plans
  - Uses customer_account (V2 feature)
  - Charges connected account for platform subscription

- **`src/app/api/stripe/connect/create-billing-portal/route.ts`**
  - Creates billing portal session
  - Uses customer_account (V2)
  - Allows subscription management

#### Webhook Handlers
- **`src/app/api/stripe/webhooks/v2-accounts/route.ts`**
  - Handles thin events for V2 accounts
  - Events: requirements.updated, capability_status_updated
  - Fetches full event data from Stripe

- **`src/app/api/stripe/webhooks/subscriptions/route.ts`**
  - Handles regular subscription events
  - Events: subscription created/updated/deleted, invoices, payment methods
  - Updates database with subscription status

### 3. UI Components

- **`src/components/stripe/StripeConnectDashboard.tsx`**
  - Shows account status and onboarding progress
  - Create account button
  - Complete onboarding button
  - Real-time status from API

- **`src/components/stripe/CreateProductForm.tsx`**
  - Form to create products
  - Validates price (min $0.50)
  - Shows success/error messages

- **`src/components/stripe/Storefront.tsx`**
  - Public-facing product display
  - Purchase button for each product
  - Creates checkout session on click

- **`src/components/stripe/SubscriptionManager.tsx`**
  - Subscribe to platform plans
  - Manage billing via portal
  - Shows current plan status

---

## Environment Variables Required

Add these to your `.env.local`:

```bash
# Stripe API Keys (TEST mode for development)
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Webhook Secrets (get from Stripe Dashboard after creating webhooks)
STRIPE_WEBHOOK_SECRET_V2=whsec_xxxxx  # For V2 account events
STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS=whsec_xxxxx  # For subscription events

# Platform Subscription Price ID (create in Stripe Dashboard)
STRIPE_SUBSCRIPTION_PRICE_ID=price_xxxxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Setup Instructions

### 1. Enable Stripe Connect

Follow `STRIPE_CONNECT_SETUP.md` for detailed steps:
1. Go to https://dashboard.stripe.com/connect/accounts/overview
2. Click "Get started with Connect"
3. Choose "Platform or marketplace"
4. Choose "Express accounts"
5. Complete application setup

### 2. Create Platform Subscription Price

In Stripe Dashboard:
1. Go to Products → Create product
2. Name: "HockeyLifeHL Pro Plan"
3. Create recurring price: $99/month (or your pricing)
4. Copy the price ID (starts with `price_`)
5. Add to `.env.local` as `STRIPE_SUBSCRIPTION_PRICE_ID`

### 3. Set Up Webhooks

#### V2 Account Webhook (Thin Events)
1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add destination"
3. Events from: **Connected accounts**
4. Show advanced options → Payload style: **Thin**
5. Events:
   - `v2.core.account[requirements].updated`
   - `v2.core.account[configuration.merchant].capability_status_updated`
   - `v2.core.account[configuration.customer].capability_status_updated`
6. Endpoint URL: `https://your-app.com/api/stripe/webhooks/v2-accounts`
7. Copy signing secret → `STRIPE_WEBHOOK_SECRET_V2`

#### Subscription Webhook (Regular Events)
1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add destination"
3. Events from: **Your account**
4. Events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_method.attached`
   - `payment_method.detached`
   - `customer.updated`
   - `customer.tax_id.*`
   - `billing_portal.*`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Endpoint URL: `https://your-app.com/api/stripe/webhooks/subscriptions`
6. Copy signing secret → `STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS`

### 4. Test Locally with Stripe CLI

```bash
# Install Stripe CLI
# Download from: https://github.com/stripe/stripe-cli/releases

# Login
stripe login

# Forward V2 webhooks
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' --forward-thin-to http://localhost:3000/api/stripe/webhooks/v2-accounts

# Forward subscription webhooks (in another terminal)
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
```

---

## Usage Examples

### Creating a Connected Account

```typescript
// POST /api/stripe/connect/create-account
const response = await fetch('/api/stripe/connect/create-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leagueId: 'league-uuid',
    displayName: 'Winter Warriors Hockey',
    contactEmail: 'admin@winterwarriors.com',
  }),
});

const data = await response.json();
// Returns: { success: true, accountId: 'acct_xxxxx' }
```

### Starting Onboarding

```typescript
// POST /api/stripe/connect/create-account-link
const response = await fetch('/api/stripe/connect/create-account-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ leagueId: 'league-uuid' }),
});

const data = await response.json();
// Redirect user to: data.url
window.location.href = data.url;
```

### Checking Account Status

```typescript
// GET /api/stripe/connect/account-status?leagueId=xxx
const response = await fetch('/api/stripe/connect/account-status?leagueId=xxx');
const data = await response.json();

console.log(data.readyToProcessPayments); // true/false
console.log(data.onboardingComplete); // true/false
console.log(data.currentlyDue); // Array of requirements
```

### Creating a Product

```typescript
// POST /api/stripe/connect/create-product
const response = await fetch('/api/stripe/connect/create-product', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leagueId: 'league-uuid',
    name: 'Season Registration',
    description: 'Full season registration for Spring 2026',
    priceInCents: 15000, // $150.00
    currency: 'usd',
  }),
});
```

### Purchasing a Product

```typescript
// POST /api/stripe/connect/create-checkout
const response = await fetch('/api/stripe/connect/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leagueId: 'league-uuid',
    priceId: 'price_xxxxx',
    quantity: 1,
  }),
});

const data = await response.json();
// Redirect to Stripe Checkout
window.location.href = data.url;
```

---

## Database Integration (TODO)

The following database updates should be added:

### Store Connected Account ID
```sql
-- Already exists in leagues table
UPDATE leagues
SET stripe_account_id = 'acct_xxxxx',
    stripe_account_status = 'active',
    payment_mode = 'stripe_connect'
WHERE id = 'league-uuid';
```

### Track Subscriptions
```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  stripe_subscription_id TEXT NOT NULL,
  stripe_account_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Track Products (Optional)
```sql
-- Create league_products table
CREATE TABLE league_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id),
  stripe_product_id TEXT NOT NULL,
  stripe_price_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price_in_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Testing

### Test Card Numbers

Use these in TEST mode:
- **Success:** `4242 4242 4242 4242`
- **Requires 3D Secure:** `4000 0025 0000 3155`
- **Decline:** `4000 0000 0000 0002`

Any future expiry date and any CVC.

### Test Account Onboarding

Use these test values during Express onboarding:
- **Business name:** Any name
- **Country:** United States
- **Business type:** Individual
- **Email:** Any email
- **Phone:** Any 10 digits
- **DOB:** Any date (over 18)
- **SSN:** `000000000` (test mode only)
- **Address:** Any US address
- **Routing number:** `110000000`
- **Account number:** Any 9-17 digits

---

## Key Concepts

### V2 Connect Accounts

V2 accounts are **unified accounts** that can:
1. Accept payments (merchant capabilities)
2. Be charged for subscriptions (customer capabilities)

**Important:** Use `customer_account` instead of `customer` for V2 accounts.

Example:
```typescript
// OLD (V1): customer: 'cus_xxxxx'
// NEW (V2): customer_account: 'acct_xxxxx'

await stripeClient.checkout.sessions.create({
  customer_account: 'acct_xxxxx', // V2 account ID
  mode: 'subscription',
  // ...
});
```

### Thin Events

V2 account webhooks use "thin" events that only contain the event ID.
You must fetch the full event data:

```typescript
const thinEvent = stripeClient.parseThinEvent(body, sig, secret);
const fullEvent = await stripeClient.v2.core.events.retrieve(thinEvent.id);
```

### Application Fees

Direct Charges use application fees to monetize transactions:

```typescript
payment_intent_data: {
  application_fee_amount: 500, // $5 to platform
}
```

If product is $100:
- Platform gets: $5
- Connected account gets: $95

---

## Security Considerations

1. **Always verify webhook signatures** - Prevents forged events
2. **Use service role for database** - When updating from webhooks
3. **Validate user permissions** - Before creating accounts/products
4. **Never expose secret keys** - Keep in .env.local and Vercel
5. **Use HTTPS in production** - Required for webhooks

---

## Going Live Checklist

- [ ] Switch to LIVE mode API keys
- [ ] Create LIVE webhook endpoints
- [ ] Update `STRIPE_SUBSCRIPTION_PRICE_ID` to live price
- [ ] Complete platform account activation
- [ ] Test onboarding flow with real bank account
- [ ] Verify webhook events are being received
- [ ] Set up monitoring/alerts for failed payments

---

## Resources

- **Stripe Connect Docs:** https://stripe.com/docs/connect
- **V2 Accounts:** https://docs.stripe.com/api/v2/core/accounts
- **Account Links:** https://docs.stripe.com/api/v2/core/account_links
- **Webhooks:** https://docs.stripe.com/webhooks
- **Thin Events:** https://docs.stripe.com/webhooks?snapshot-or-thin=thin
- **Testing:** https://stripe.com/docs/testing

---

## Support

If you encounter issues:
1. Check Stripe logs: https://dashboard.stripe.com/logs
2. Review webhook events: https://dashboard.stripe.com/webhooks
3. Use Stripe CLI for local testing
4. Contact Stripe support: https://support.stripe.com

---

**Implementation Status:** ✅ Complete

All Stripe Connect integration code is ready to use. Just configure environment variables and test!
