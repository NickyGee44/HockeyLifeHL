-- ==============================================================================
-- PROFILES: Create Profiles for Unmatched Legacy Players
-- ==============================================================================
-- Description: Create 803 profiles for legacy players without existing matches
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create profiles for unmatched legacy players
INSERT INTO profiles (
  id,
  full_name,
  is_legacy_import,
  legacy_player_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  lp.full_name,
  TRUE,
  lp.id,
  NOW(),
  NOW()
FROM legacy_players lp
WHERE lp.matched_to_profile_id IS NULL
  AND lp.full_name IS NOT NULL
  AND TRIM(lp.full_name) != ''
ON CONFLICT DO NOTHING;

-- Update legacy_players table to link newly created profiles
UPDATE legacy_players lp
SET matched_to_profile_id = p.id,
    matched_at = NOW(),
    updated_at = NOW()
FROM profiles p
WHERE p.legacy_player_id = lp.id
  AND lp.matched_to_profile_id IS NULL;

COMMIT;

-- Verification: All 923 legacy players should now have matched_to_profile_id
SELECT
  'Profile Matching Status' as check_name,
  COUNT(*) as total_legacy_players,
  COUNT(matched_to_profile_id) as matched_count,
  COUNT(*) - COUNT(matched_to_profile_id) as unmatched_count
FROM legacy_players;

-- Count newly created legacy profiles
SELECT
  'Newly Created Profiles' as check_name,
  COUNT(*) as legacy_imported_profiles
FROM profiles
WHERE is_legacy_import = TRUE;
