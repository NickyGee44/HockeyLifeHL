# Stripe Payment Setup Guide

## Overview
This guide will help you configure Stripe payments for HockeyLifeHL.

## Step 1: Create Stripe Account
1. Go to https://stripe.com
2. Sign up for an account (or log in)
3. Complete business verification

## Step 2: Get API Keys

### Test Mode Keys (for development)
1. In Stripe Dashboard, click "Developers" → "API keys"
2. Find your **Publishable key** (starts with `pk_test_`)
3. Find your **Secret key** (starts with `sk_test_`)

### Production Keys (for live payments)
1. Toggle from "Test mode" to "Live mode" in Stripe Dashboard
2. Get your **Live Publishable key** (starts with `pk_live_`)
3. Get your **Live Secret key** (starts with `sk_live_`)

## Step 3: Set Up Webhook

### Why Webhooks?
Webhooks allow Stripe to notify your app when payments succeed/fail.

### Create Webhook Endpoint
1. In Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Enter your URL:
   - **Development**: `http://localhost:3000/api/webhooks/stripe`
   - **Production**: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

### Webhook Payload Styles

Stripe offers two webhook payload styles:

- **Snapshot (Recommended)**: Includes full event data in the webhook payload. This is what HockeyLifeHL uses.
- **Thin**: Lightweight payload that requires additional API calls to fetch full data. Only needed for very high-volume scenarios (1000+ events/min).

For HockeyLifeHL, use the **snapshot** style webhook with API version `2025-12-15.clover`.

## Step 4: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Site URL (for redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# For production, use:
# STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
# NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Step 5: Verify Payment Migration

The payments table should already exist in your database. To verify:

1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'payments';
```

If the table doesn't exist, run the archived migration:
```sql
-- See supabase/archive/old-migrations/add_payments_table.sql
```

Then run the league_id migration:
```sql
-- supabase/migrations/20260125_add_league_id_to_draft_payment_tables.sql
```

## Step 6: Test Payments

### Test Cards
Use these test card numbers in development:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work.

### Test the Flow
1. Start your dev server: `npm run dev`
2. Log in as admin
3. Go to Admin → Payments
4. Create a test payment entry
5. Try processing with test card

## Step 7: Production Checklist

Before going live:
- [ ] Switch to live Stripe keys
- [ ] Update webhook URL to production domain
- [ ] Test with real card (small amount)
- [ ] Set up proper error logging
- [ ] Configure email notifications
- [ ] Review payment flow security
- [ ] Test refund process
- [ ] Document payment procedures for admins

## Troubleshooting

### Webhook Not Receiving Events
- Check that webhook URL is correct
- Verify webhook secret matches .env file
- Check Stripe Dashboard → Webhooks for delivery attempts
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Payment Not Completing
- Check browser console for errors
- Verify Stripe publishable key is set
- Check network tab for failed API calls
- Review Stripe Dashboard → Logs

### RLS Policies Blocking Access
- Ensure user has proper league membership
- Check that league_id is set correctly on payments
- Verify user role (owner/admin can manage payments)

## Security Best Practices

1. **Never commit secrets**: Keep .env.local in .gitignore
2. **Use environment variables**: Never hardcode keys
3. **Validate webhooks**: Always verify webhook signatures
4. **Log transactions**: Keep audit trail of all payments
5. **Test thoroughly**: Use test mode extensively before going live

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- HockeyLifeHL Issues: Check the project's issue tracker

---

Last updated: January 2026
