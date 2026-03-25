-- Canonicalized from legacy short migration version 20260210.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- MIGRATION: Beer League Hockey Default Sponsor
-- ==============================================================================
-- Description: Inserts Beer League Hockey as the default sponsor for all
--              existing leagues and adds a trigger so new leagues get it too.
-- Author: Claude Agent
-- Date: February 10, 2026
-- ==============================================================================

-- ==============================================================================
-- Add display_order column if missing (needed for ordering)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_sponsors' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE league_sponsors ADD COLUMN display_order INTEGER DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'league_sponsors' AND column_name = 'description'
  ) THEN
    ALTER TABLE league_sponsors ADD COLUMN description TEXT;
  END IF;
END $$;

-- ==============================================================================
-- Add 'premier' to tier CHECK constraint if not already allowed
-- ==============================================================================
-- Drop existing constraint and recreate with premier tier included
DO $$
BEGIN
  -- Only alter if the constraint exists and doesn't include 'premier'
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%league_sponsors_tier_check%'
  ) THEN
    ALTER TABLE league_sponsors DROP CONSTRAINT IF EXISTS league_sponsors_tier_check;
    ALTER TABLE league_sponsors ADD CONSTRAINT league_sponsors_tier_check
      CHECK (tier IN ('premier', 'gold', 'silver', 'bronze', 'title'));
  END IF;
END $$;

-- ==============================================================================
-- INSERT: Beer League Hockey sponsor for all existing leagues
-- ==============================================================================
INSERT INTO league_sponsors (id, league_id, name, logo_url, website_url, tier, is_active, display_order, description)
SELECT
  gen_random_uuid(),
  l.id,
  'Beer League Hockey',
  '/sponsors/beer-league-hockey.png',
  'https://beerleaguehockey.ca',
  'gold',
  true,
  0,
  'Powered by Beer League Hockey - the free platform for managing your hockey league.'
FROM leagues l
WHERE NOT EXISTS (
  SELECT 1 FROM league_sponsors ls
  WHERE ls.league_id = l.id
    AND ls.name = 'Beer League Hockey'
);

-- ==============================================================================
-- FUNCTION + TRIGGER: Auto-add BLH sponsor to new leagues
-- ==============================================================================
CREATE OR REPLACE FUNCTION add_blh_default_sponsor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO league_sponsors (league_id, name, logo_url, website_url, tier, is_active, display_order, description)
  VALUES (
    NEW.id,
    'Beer League Hockey',
    '/sponsors/beer-league-hockey.png',
    'https://beerleaguehockey.ca',
    'gold',
    true,
    0,
    'Powered by Beer League Hockey - the free platform for managing your hockey league.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_add_blh_sponsor ON leagues;

CREATE TRIGGER trigger_add_blh_sponsor
  AFTER INSERT ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION add_blh_default_sponsor();

-- ==============================================================================
-- Add public read policy for league_sponsors (for league sites)
-- ==============================================================================
-- The current RLS only allows members to read. League sites need public access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'league_sponsors'
      AND policyname = 'Public can view league sponsors'
  ) THEN
    CREATE POLICY "Public can view league sponsors"
      ON league_sponsors FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM league_sponsors WHERE name = 'Beer League Hockey';
  RAISE NOTICE 'BLH default sponsor added to % leagues', v_count;
  RAISE NOTICE 'Auto-add trigger created for new leagues';
END $$;

