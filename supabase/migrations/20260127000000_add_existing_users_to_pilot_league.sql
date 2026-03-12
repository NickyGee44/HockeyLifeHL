-- Canonicalized from legacy short migration version 20260127.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- MIGRATION: Add Existing Users to Pilot League
-- ==============================================================================
-- Description: Adds all existing users who signed up before the multi-tenant
--              fix to the pilot league (HockeyLifeHL)
-- Date: January 27, 2026
-- Priority: HIGH - Run this after deploying the multi-tenant fix
-- ==============================================================================

-- This migration adds all existing users to the pilot league if they don't
-- already have a league membership. This fixes the issue where users who
-- signed up before the fix couldn't access any dashboards.

BEGIN;

-- ==============================================================================
-- STEP 1: Add existing users to pilot league
-- ==============================================================================

INSERT INTO league_memberships (league_id, user_id, role, status, created_at)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID AS league_id,
  p.id AS user_id,
  -- Use the role from profiles table if it exists, otherwise default to 'player'
  COALESCE(p.role, 'player') AS role,
  'active' AS status,
  p.created_at
FROM profiles p
WHERE p.id NOT IN (
  -- Exclude users who already have a league membership
  SELECT user_id FROM league_memberships
)
AND p.id IS NOT NULL;

-- ==============================================================================
-- STEP 2: Log the results
-- ==============================================================================

DO $$
DECLARE
  added_count INTEGER;
BEGIN
  -- Count how many users were added
  SELECT COUNT(*)
  INTO added_count
  FROM league_memberships
  WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;

  RAISE NOTICE 'Added % existing users to pilot league', added_count;
END $$;

-- ==============================================================================
-- STEP 3: Verify the migration
-- ==============================================================================

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Check for users without league memberships
  SELECT COUNT(*)
  INTO orphan_count
  FROM profiles p
  WHERE p.id NOT IN (
    SELECT user_id FROM league_memberships
  );

  IF orphan_count > 0 THEN
    RAISE WARNING 'Warning: % profiles still have no league membership', orphan_count;
  ELSE
    RAISE NOTICE 'Success: All profiles have league memberships';
  END IF;
END $$;

-- ==============================================================================
-- STEP 4: Display summary
-- ==============================================================================

SELECT
  'Pilot League Memberships' AS summary,
  COUNT(*) AS total_members,
  COUNT(*) FILTER (WHERE role = 'owner') AS owners,
  COUNT(*) FILTER (WHERE role = 'admin') AS admins,
  COUNT(*) FILTER (WHERE role = 'captain') AS captains,
  COUNT(*) FILTER (WHERE role = 'scorekeeper') AS scorekeepers,
  COUNT(*) FILTER (WHERE role = 'player') AS players
FROM league_memberships
WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;

COMMIT;

-- ==============================================================================
-- ROLLBACK (if needed)
-- ==============================================================================
-- To rollback this migration, run:
--
-- DELETE FROM league_memberships
-- WHERE league_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID
-- AND created_at >= '2026-01-27 00:00:00';
--
-- Note: This will remove ALL league memberships created by this migration
-- Use with caution!
-- ==============================================================================;

