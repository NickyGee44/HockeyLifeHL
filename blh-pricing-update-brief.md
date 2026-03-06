# BLH Pricing Update Brief

## What Changed
Advisory council ratified new tiered pricing on March 2, 2026. DB has been updated. Code needs to match.

## DB State (already updated)
- `platform_fee_config.processing_fee_percent` = 3.5 (was 2.99)
- `platform_fee_config.setup_fee_cents` = 0 (was 499900)
- All `league_billing_settings.platform_fee_bps` = 350 (was 299)
- All `league_billing_settings.setup_fee_status` = 'waived'

## Ratified Pricing Tiers

| Tier | Criteria | Rate | Monthly Floor | Contract |
|------|----------|------|---------------|----------|
| Small | <10 teams AND <$50K fees | $299/season flat | None | None |
| Standard | 10-99 teams OR $50K-$499K fees | 3.5% of gross reg fees | $250/mo | Annual |
| Large | 100-499 teams | 3.25% + 2-year contract | $500/mo | 2-year |
| Enterprise | 500+ teams OR $2M+ fees | 2.75-3.0% negotiated | Negotiated | Multi-year |

## Key Rules
- Tier determined at registration open, locked for the season
- "Registration fees" = gross payments processed through BLH
- Leagues pay Stripe processing fees directly (BLH % is clean margin)
- Monthly floor billed via card-on-file, credited against season % invoice
- Season % invoiced at registration close (net-14 days), with 90-day backstop
- Referral program: 0.25% off per qualified referral (min 10 teams), capped at 0.75% off, floor at 2.75%

## Files to Update

### 1. `apps/league-builder/src/lib/fees/platform-fees.ts`
- Update DEFAULT_CONFIG: processingFeePercent 3.5, setupFeeCents 0
- Add tier constants and tier determination logic
- Add function: `determinePricingTier(teamCount: number, totalFeesCents: number)` returning 'small' | 'standard' | 'large' | 'enterprise'
- Add function: `getTierRate(tier)` returning the bps for each tier
- Add function: `getMonthlyFloorCents(tier)` returning 0 | 25000 | 50000 | negotiated

### 2. `apps/league-builder/src/components/subscription/subscription-plans.tsx`
- Update the pricing display to show tiered pricing instead of single rate
- Show all 4 tiers with their rates and monthly floors
- Add a simple calculator: "Enter your team count and estimated registration fees"
- Remove the $4,999 setup fee card, replace with the tier cards

### 3. `apps/league-builder/src/lib/fees/platform-fees.ts` (league billing)
- `league_billing_settings` should support a `pricing_tier` field
- If the column doesn't exist, add a Supabase migration

### 4. Add migration: `supabase/migrations/20260306_tiered_pricing.sql`
- Add `pricing_tier` column to `league_billing_settings` (enum: 'small', 'standard', 'large', 'enterprise', default 'standard')
- Add `monthly_floor_cents` column to `league_billing_settings` (default 25000 for standard)
- Add `contract_term_months` column (default 12)
- Add `referral_discount_bps` column (default 0, max 75)
- Add `flat_season_fee_cents` column (for small tier: 29900 = $299)
- Update existing rows: set pricing_tier='standard', monthly_floor_cents=25000

## DO NOT
- Delete any existing data
- Change the Stripe Connect flow (it already works correctly with application_fee_amount)
- Touch the webhook handler
- Break existing billing for current leagues
