-- Auto-Tier Columns Migration
-- Adds floor subscription tracking columns to league_billing_settings
-- and updates the get_league_billing_settings RPC to expose them.
-- These support monthly floor billing (Standard $250/mo, Large $500/mo)
-- and the platform-side Stripe billing customer used for floor + settlement invoices.

-- 1. Add new columns
ALTER TABLE league_billing_settings
  ADD COLUMN IF NOT EXISTS floor_stripe_subscription_id  text,
  ADD COLUMN IF NOT EXISTS floor_stripe_product_id       text,
  ADD COLUMN IF NOT EXISTS stripe_billing_customer_id    text;

COMMENT ON COLUMN league_billing_settings.floor_stripe_subscription_id IS
  'Stripe Subscription ID for monthly floor billing (Standard $250/mo, Large $500/mo). NULL if no floor.';
COMMENT ON COLUMN league_billing_settings.floor_stripe_product_id IS
  'Stripe Product ID used for the floor subscription line item.';
COMMENT ON COLUMN league_billing_settings.stripe_billing_customer_id IS
  'Stripe Customer ID on the BLH platform account used for billing floors and season settlement invoices.';

-- 2. Replace get_league_billing_settings to include the new columns.
--    PostgreSQL does not allow CREATE OR REPLACE to change the RETURNS TABLE
--    row shape, so the old function must be dropped first.
DROP FUNCTION IF EXISTS public.get_league_billing_settings(uuid);

--    This is a security-definer function (reads billing settings regardless of RLS)
--    so it can only be called server-side with the service role key.
CREATE FUNCTION public.get_league_billing_settings(p_league_id uuid)
RETURNS TABLE (
  league_id                    uuid,
  platform_fee_bps             integer,
  platform_fee_mode            text,
  pricing_tier                 text,
  monthly_floor_cents          integer,
  flat_season_fee_cents        integer,
  contract_term_months         integer,
  referral_discount_bps        integer,
  floor_stripe_subscription_id text,
  floor_stripe_product_id      text,
  stripe_billing_customer_id   text,
  setup_fee_amount_cents       integer,
  setup_fee_currency           text,
  setup_fee_status             text,
  setup_fee_paid_at            timestamptz,
  setup_fee_stripe_invoice_id  text,
  stripe_account_id            text,
  stripe_account_status        text,
  charges_enabled              boolean,
  payouts_enabled              boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lbs.league_id,
    lbs.platform_fee_bps,
    lbs.platform_fee_mode,
    lbs.pricing_tier::text,
    lbs.monthly_floor_cents,
    lbs.flat_season_fee_cents,
    lbs.contract_term_months,
    lbs.referral_discount_bps,
    lbs.floor_stripe_subscription_id,
    lbs.floor_stripe_product_id,
    lbs.stripe_billing_customer_id,
    lbs.setup_fee_amount_cents,
    lbs.setup_fee_currency,
    lbs.setup_fee_status,
    lbs.setup_fee_paid_at,
    lbs.setup_fee_stripe_invoice_id,
    lbs.stripe_account_id,
    lbs.stripe_account_status,
    lbs.charges_enabled,
    lbs.payouts_enabled
  FROM league_billing_settings lbs
  WHERE lbs.league_id = p_league_id;
$$;
