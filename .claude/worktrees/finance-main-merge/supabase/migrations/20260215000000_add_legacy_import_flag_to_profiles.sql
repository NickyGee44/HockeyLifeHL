-- Canonicalized from legacy short migration version 20260215.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- PROFILES: Add Legacy Import Tracking Columns
-- ==============================================================================
-- Description: Track which profiles were created from legacy import
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Add column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_legacy_import BOOLEAN DEFAULT FALSE;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_legacy_import
ON profiles(is_legacy_import)
WHERE is_legacy_import = TRUE;

-- Add column to track source legacy player
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS legacy_player_id UUID REFERENCES legacy_players(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_player_id
ON profiles(legacy_player_id)
WHERE legacy_player_id IS NOT NULL;

COMMIT;

-- Verification
SELECT
  'Profile Columns Added' as check_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('is_legacy_import', 'legacy_player_id')
ORDER BY column_name;

