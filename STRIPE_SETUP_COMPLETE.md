# ✅ Stripe Configuration Complete

## Stripe Products Created

I've successfully created all 4 subscription products in your Stripe account (test mode):

### 1. Starter - $99/month
- **Product ID**: `prod_TtIliL9IJ5PSz1`
- **Price ID**: `price_1SvWAgJFxgitS6Iv6UBiOYNQ`
- **Description**: Up to 100 players total, unlimited leagues, shared deployment
- **Price**: $99.00 USD/month

### 2. Pro - $299/month
- **Product ID**: `prod_TtImGiPcLLv3xe`
- **Price ID**: `price_1SvWAzJFxgitS6Iv5AvwHYTC`
- **Description**: Up to 500 players total, unlimited leagues, shared deployment, advanced features
- **Price**: $299.00 USD/month

### 3. Business - $799/month
- **Product ID**: `prod_TtImisjJVhG7N4`
- **Price ID**: `price_1SvWBLJFxgitS6IvzoM5MTe1`
- **Description**: Unlimited players and leagues, dedicated deployment, priority support
- **Price**: $799.00 USD/month

### 4. Enterprise - Custom Pricing
- **Product ID**: `prod_TtInsZQK9wJeT7`
- **Price ID**: `price_1SvWBgJFxgitS6IvKJtRUERK`
- **Description**: Isolated deployment, white-label, SLA guarantees, custom integrations
- **Base Price**: $1,000.00 USD/month (customize per customer)

---

## 📝 Next Step: Add to .env.local

Add these environment variables to your `apps/league-builder/.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_existing_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_existing_key_here

# Platform 1 Subscription Price IDs (League-size based pricing)
STRIPE_PRICE_STARTER=price_1SvWAgJFxgitS6Iv6UBiOYNQ
STRIPE_PRICE_PRO=price_1SvWAzJFxgitS6Iv5AvwHYTC
STRIPE_PRICE_BUSINESS=price_1SvWBLJFxgitS6IvzoM5MTe1
STRIPE_PRICE_ENTERPRISE=price_1SvWBgJFxgitS6IvKJtRUERK

# Webhook Secret (you'll set this up next)
STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_your_webhook_secret_here
```

---

## 🔔 Configure Webhook Endpoint

### Option A: Using Stripe CLI (Development)

1. **Forward webhooks to your local server:**
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
   ```

2. **Copy the webhook signing secret** that appears (starts with `whsec_`)

3. **Add to .env.local:**
   ```env
   STRIPE_WEBHOOK_SECRET_ORGANIZATIONS=whsec_the_secret_from_cli
   ```

4. **Start your dev server:**
   ```bash
   pnpm dev:builder
   ```

### Option B: Using Stripe Dashboard (Production)

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/stripe/webhooks/subscriptions`
4. Events to send:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `payment_method.attached`
5. Click "Add endpoint"
6. Copy the signing secret
7. Add to production environment variables

---

## 🧪 Test Your Setup

### 1. Test Webhook Forwarding

In one terminal:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhooks/subscriptions
```

In another terminal:
```bash
pnpm dev:builder
```

### 2. Trigger Test Events

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test invoice paid
stripe trigger invoice.paid

# Test payment failed
stripe trigger invoice.payment_failed
```

### 3. Check Console Output

You should see logs like:
```
[Webhook] Received event: customer.subscription.created
[Webhook] Subscription created for org: xxx
✅ Webhook processed successfully
```

---

## 🎯 Code Changes Made

I've updated the codebase to reflect the correct league-size based pricing model:

### Files Modified:

1. **`apps/league-builder/src/lib/types/subscription.ts`**
   - Added `business` tier to `SubscriptionTier` type
   - Updated prices: Starter $99, Pro $299, Business $799
   - Changed from `maxPlayersPerLeague` to `maxPlayersTotal`
   - Updated feature limits to match pricing tiers

2. **`apps/league-builder/src/lib/features/subscription-gates.ts`**
   - Updated `canAddPlayer()` to check TOTAL players across ALL leagues
   - Added `business` tier to `getTierLimits()`
   - Updated limits: Starter (100 players), Pro (500 players), Business/Enterprise (unlimited)

3. **`apps/league-builder/src/lib/stripe/client.ts`**
   - Added `STRIPE_PRICE_BUSINESS` to price IDs
   - Updated `getPriceIdByTier()` and `getTierByPriceId()` to support `business` tier

4. **`.env.example`**
   - Updated with new pricing structure and descriptions
   - Added `STRIPE_PRICE_BUSINESS` variable

---

## ✅ Pricing Summary

| Tier | Price/Month | Player Limit | Key Features |
|------|-------------|--------------|--------------|
| **Starter** | $99 | Up to 100 players | Unlimited leagues, shared deployment |
| **Pro** | $299 | Up to 500 players | Advanced stats, API access, priority support |
| **Business** | $799 | Unlimited players | Dedicated deployment, custom branding |
| **Enterprise** | Custom | Unlimited players | Isolated deployment, white-label, SLA |

---

## 🔐 Security Features (Already Implemented)

All critical security fixes from the audit are in place:

- ✅ Idempotency keys on all Stripe API calls
- ✅ Webhook event deduplication
- ✅ Webhook event ordering protection
- ✅ Trial abuse prevention
- ✅ Race condition protection (optimistic locking)
- ✅ SQL injection prevention (SECURITY DEFINER with search_path)
- ✅ PCI compliance (no card data stored)

---

## 🚀 Ready to Test

Your Stripe subscription system is now configured with the correct league-size based pricing!

**Next steps:**
1. Add the price IDs to your `.env.local` file
2. Set up webhook forwarding with Stripe CLI
3. Start your dev server
4. Test creating a subscription in the UI
5. Watch the webhook events flow through

Let me know if you need help with any of the testing steps!
