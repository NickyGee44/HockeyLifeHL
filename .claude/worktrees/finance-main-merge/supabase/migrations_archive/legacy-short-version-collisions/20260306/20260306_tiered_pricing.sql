-- Tiered Pricing Migration
-- Ratified by advisory council 2026-03-02
-- Adds tier columns to league_billing_settings to support:
--   Small    (<10 teams AND <$50K fees)  $299/season flat
--   Standard (10-99 teams OR $50K-$499K) 3.5% of gross reg fees, $250/mo floor
--   Large    (100-499 teams)             3.25% + 2-year contract, $500/mo floor
--   Enterprise (500+ teams OR $2M+ fees) 2.75-3.0% negotiated

-- 1. Create enum type (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_tier') THEN
    CREATE TYPE pricing_tier AS ENUM ('small', 'standard', 'large', 'enterprise');
  END IF;
END
$$;

-- 2. Add new columns to league_billing_settings
ALTER TABLE league_billing_settings
  ADD COLUMN IF NOT EXISTS pricing_tier         pricing_tier NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS monthly_floor_cents  integer      NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS contract_term_months integer      NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS referral_discount_bps integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flat_season_fee_cents integer     NOT NULL DEFAULT 0;

-- 3. Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'league_billing_settings'
      AND constraint_name = 'referral_discount_bps_range'
  ) THEN
    ALTER TABLE league_billing_settings
      ADD CONSTRAINT referral_discount_bps_range
        CHECK (referral_discount_bps >= 0 AND referral_discount_bps <= 75);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'league_billing_settings'
      AND constraint_name = 'monthly_floor_cents_non_negative'
  ) THEN
    ALTER TABLE league_billing_settings
      ADD CONSTRAINT monthly_floor_cents_non_negative
        CHECK (monthly_floor_cents >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'league_billing_settings'
      AND constraint_name = 'flat_season_fee_cents_non_negative'
  ) THEN
    ALTER TABLE league_billing_settings
      ADD CONSTRAINT flat_season_fee_cents_non_negative
        CHECK (flat_season_fee_cents >= 0);
  END IF;
END
$$;

-- 4. Update existing rows: assign standard tier with correct floor
--    (rows added by default already get 'standard' / 25000 but be explicit)
UPDATE league_billing_settings
SET
  pricing_tier          = 'standard',
  monthly_floor_cents   = 25000,
  contract_term_months  = 12,
  referral_discount_bps = 0,
  flat_season_fee_cents = 0
WHERE pricing_tier = 'standard';

-- 5. Comments for schema documentation
COMMENT ON COLUMN league_billing_settings.pricing_tier IS
  'Tier locked at registration open: small | standard | large | enterprise';
COMMENT ON COLUMN league_billing_settings.monthly_floor_cents IS
  'Monthly minimum billed via card-on-file, credited against season % invoice. 0=none, 25000=$250, 50000=$500';
COMMENT ON COLUMN league_billing_settings.contract_term_months IS
  'Contract length in months: 0=none, 12=annual, 24=2-year';
COMMENT ON COLUMN league_billing_settings.referral_discount_bps IS
  '0.25% (25 bps) off per qualified referral, max 75 bps (0.75%), floor 2.75%';
COMMENT ON COLUMN league_billing_settings.flat_season_fee_cents IS
  'Flat season fee for small tier: 29900 = $299 CAD. 0 for all other tiers.';
