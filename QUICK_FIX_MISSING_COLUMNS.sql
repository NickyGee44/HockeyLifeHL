-- ==============================================================================
-- QUICK FIX: Add Missing Columns to leagues Table
-- ==============================================================================
-- Purpose: Add columns that signup function expects but may not exist yet
-- Date: January 28, 2026
-- Priority: CRITICAL - Blocks signup and possibly auth
-- ==============================================================================

-- Add sport column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'hockey';

-- Add subdomain column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Add owner_id column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Add accent_color column (if not exists)
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#FFD700';

-- Add constraints
ALTER TABLE leagues
ADD CONSTRAINT IF NOT EXISTS valid_sport CHECK (
  sport IN ('hockey', 'soccer', 'basketball', 'baseball', 'softball', 'volleyball', 'football', 'lacrosse', 'other')
);

-- Add unique constraint on subdomain
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_subdomain_key'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_subdomain_key UNIQUE (subdomain);
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leagues_subdomain ON leagues(subdomain);
CREATE INDEX IF NOT EXISTS idx_leagues_owner_id ON leagues(owner_id);
CREATE INDEX IF NOT EXISTS idx_leagues_sport ON leagues(sport);

-- Verification
DO $$
DECLARE
  v_sport_exists BOOLEAN;
  v_subdomain_exists BOOLEAN;
  v_owner_id_exists BOOLEAN;
  v_accent_color_exists BOOLEAN;
BEGIN
  -- Check columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'sport'
  ) INTO v_sport_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'subdomain'
  ) INTO v_subdomain_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'owner_id'
  ) INTO v_owner_id_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'accent_color'
  ) INTO v_accent_color_exists;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MISSING COLUMNS FIX - VERIFICATION';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Column status:';
  RAISE NOTICE '  sport: %', CASE WHEN v_sport_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  subdomain: %', CASE WHEN v_subdomain_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  owner_id: %', CASE WHEN v_owner_id_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  accent_color: %', CASE WHEN v_accent_color_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '';

  IF v_sport_exists AND v_subdomain_exists AND v_owner_id_exists AND v_accent_color_exists THEN
    RAISE NOTICE '✅ All required columns exist!';
    RAISE NOTICE '✅ Signup function should now work';
  ELSE
    RAISE WARNING 'Some columns still missing - check above';
  END IF;

  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
END $$;
