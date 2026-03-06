# BLH Auto-Tier Assignment + Monthly Floor Subscriptions

## Context
We have 4 pricing tiers in `league_billing_settings` but no automation connecting them to Stripe charges. Fix this.

## What to Build

### 1. Auto-Tier Assignment (on registration open)
Create a server action or utility that:
- Counts a league's teams for the current season
- Estimates total registration fees (team count × average fee or actual fee config)
- Calls `determinePricingTier(teamCount, totalFeesCents)` from platform-fees.ts
- Updates `league_billing_settings` with the correct:
  - `pricing_tier`
  - `platform_fee_bps` (350 standard, 325 large, 275-300 enterprise)
  - `monthly_floor_cents` (0 small, 25000 standard, 50000 large)
  - `flat_season_fee_cents` (29900 for small, 0 for others)
  - `contract_term_months` (0 small, 12 standard, 24 large)
- This should trigger when:
  a) A season's `registration_type` is set and registration opens
  b) Can also be called manually by platform admin
- Tier is LOCKED for the season once registration opens (no mid-season changes)

### 2. Fix Payment Intent Flow for Small Tier
In `stripe-connect.ts`, `createPaymentIntent()`:
- Check if the league's `pricing_tier` is 'small'
- If small: set `application_fee_amount = 0` (no per-transaction fee)
- Instead, the small league gets a flat $299 invoice per season (see #4)
- For standard/large/enterprise: use `platform_fee_bps` from `league_billing_settings` as today

### 3. Monthly Floor Subscriptions
Create Stripe Products + Prices for monthly floors:
- "BLH Platform Floor — Standard" ($250/mo CAD recurring)
- "BLH Platform Floor — Large" ($500/mo CAD recurring)
When a league is assigned Standard or Large tier:
- Create a Stripe Subscription on the league's Connect account for the floor
- Store `floor_subscription_id` in `league_billing_settings`
- Floor is credited against the season % invoice at registration close

Add to migration or a new migration:
- `floor_stripe_subscription_id` column on `league_billing_settings`
- `floor_stripe_product_id` column

### 4. Season Invoice for Small Tier + Season Settlement for All
At registration close (or 90-day backstop):
- **Small tier:** Create Stripe Invoice for $299 flat fee
- **Standard/Large/Enterprise:** Create Stripe Invoice for:
  - Total registration fees collected × tier rate
  - MINUS monthly floor payments already collected
  - = Net amount due (or $0 if floor exceeded %)
- Invoice sent net-14 days
- Pre-billing summary email 7 days before

### 5. Referral Discount Application
When `referral_discount_bps > 0` on a league:
- Subtract from the tier's base bps when calculating application_fee_amount
- Floor at 275 bps (2.75%) — never go below
- Example: Standard (350) with 2 referrals (50 bps off) = 300 bps effective

### 6. Platform Admin UI
Add to the league admin/billing page:
- Display current tier, effective rate, monthly floor status
- Allow platform admin to manually override tier
- Show referral discount if any
- Show floor subscription status

## Files to Touch
- `apps/league-builder/src/lib/fees/platform-fees.ts` — add auto-assign function
- `apps/league-builder/src/lib/leagues/stripe-connect.ts` — fix small tier, add floor subscriptions
- `apps/league-builder/src/lib/payments/payment-actions.ts` — season settlement
- `apps/league-builder/src/lib/actions/fees.ts` — server actions for tier management
- `apps/league-builder/src/components/billing/LeagueBillingDashboard.tsx` — tier display
- New migration: `supabase/migrations/20260306_auto_tier_columns.sql`

## DO NOT
- Break existing payment flow for current leagues
- Delete any data
- Change webhook handler logic
- Remove any existing billing settings
