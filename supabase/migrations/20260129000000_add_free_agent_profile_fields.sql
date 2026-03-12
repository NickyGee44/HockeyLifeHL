-- Canonicalized from legacy short migration version 20260129.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



-- ==============================================================================
-- ADD FREE AGENT PROFILE FIELDS
-- ==============================================================================
-- Purpose: Add fields needed for free agent signup system
-- Date: January 29, 2026
-- ==============================================================================
-- Players can now sign up WITHOUT joining a league first
-- These fields allow league owners to evaluate players when reviewing join requests
-- ==============================================================================

-- ==============================================================================
-- ADD NEW COLUMNS TO PROFILES
-- ==============================================================================

-- Skill Level: Player's self-assessed skill level
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skill_level TEXT
  CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

COMMENT ON COLUMN profiles.skill_level IS 'Player skill level: beginner, intermediate, advanced, expert';

-- Availability: How often player can participate
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS availability TEXT
  CHECK (availability IN ('full_time', 'part_time', 'spare_only'));

COMMENT ON COLUMN profiles.availability IS 'Player availability: full_time, part_time, spare_only';

-- Contact Information
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.phone IS 'Player phone number (optional)';

-- Location Information (for league matching)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN profiles.city IS 'Player city (for finding local leagues)';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS province TEXT;

COMMENT ON COLUMN profiles.province IS 'Player province/state';

-- ==============================================================================
-- CREATE INDEXES FOR SEARCHING PLAYERS
-- ==============================================================================

-- League owners may want to search for players by location
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);

CREATE INDEX IF NOT EXISTS idx_profiles_province ON profiles(province);

-- Search by skill level and availability
CREATE INDEX IF NOT EXISTS idx_profiles_skill_level ON profiles(skill_level);

CREATE INDEX IF NOT EXISTS idx_profiles_availability ON profiles(availability);

-- Search by position (if not already indexed)
CREATE INDEX IF NOT EXISTS idx_profiles_position ON profiles(position);

-- ==============================================================================
-- UPDATE RLS POLICIES TO ALLOW LEAGUE OWNERS TO VIEW JOIN REQUEST PROFILES
-- ==============================================================================

-- League owners/admins need to see profiles of players requesting to join their league
CREATE POLICY "League owners can view join request user profiles"
  ON profiles FOR SELECT
  USING (
    -- Allow viewing profiles of users who have requested to join leagues I own/admin
    id IN (
      SELECT ljr.user_id
      FROM league_join_requests ljr
      JOIN league_memberships lm ON ljr.league_id = lm.league_id
      WHERE lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active'
        AND ljr.status = 'pending'
    )
  );

COMMENT ON POLICY "League owners can view join request user profiles" ON profiles IS
  'Allow league owners/admins to view full profiles of players who have requested to join their league';

-- ==============================================================================
-- UPDATE HELPER FUNCTION TO INCLUDE NEW PROFILE FIELDS
-- ==============================================================================

-- Update the existing join requests function to return all profile fields
DROP FUNCTION IF EXISTS get_league_pending_join_requests(UUID);

CREATE OR REPLACE FUNCTION get_league_pending_join_requests(p_league_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  "position" TEXT,  -- Quoted because it's a reserved keyword in PostgreSQL
  skill_level TEXT,
  availability TEXT,
  phone TEXT,
  city TEXT,
  province TEXT,
  jersey_number INTEGER,
  shot_hand TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- SECURITY: Verify caller is league owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM league_memberships
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Must be league owner or admin';
  END IF;

  RETURN QUERY
  SELECT
    ljr.id,
    ljr.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    p.position,
    p.skill_level,
    p.availability,
    p.phone,
    p.city,
    p.province,
    p.jersey_number,
    p.shot_hand,
    ljr.message,
    ljr.created_at
  FROM league_join_requests ljr
  JOIN profiles p ON p.id = ljr.user_id
  WHERE ljr.league_id = p_league_id
    AND ljr.status = 'pending'
  ORDER BY ljr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

COMMENT ON FUNCTION get_league_pending_join_requests IS 'Get all pending join requests with full player profile info (for admin review)';

-- ==============================================================================
-- CREATE FUNCTION TO GET PUBLIC LEAGUES (FOR PLAYER BROWSE PAGE)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_public_leagues_for_join()
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  description TEXT,
  city TEXT,
  province TEXT,
  sport TEXT,
  primary_color TEXT,
  logo_url TEXT,
  current_season_id UUID,
  current_season_name TEXT,
  user_request_status TEXT, -- null, 'pending', 'approved', 'rejected'
  user_is_member BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.subdomain,
    l.description,
    l.city,
    l.province,
    l.sport,
    l.primary_color,
    l.logo_url,
    l.current_season_id,
    cs.name AS current_season_name,
    ljr.status AS user_request_status,
    EXISTS(
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = l.id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    ) AS user_is_member
  FROM leagues l
  LEFT JOIN seasons cs ON cs.id = l.current_season_id
  LEFT JOIN league_join_requests ljr ON ljr.league_id = l.id
    AND ljr.user_id = auth.uid()
    AND ljr.status IN ('pending', 'approved') -- Only show latest relevant status
  WHERE l.is_public = true
    AND l.status = 'active'
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

GRANT EXECUTE ON FUNCTION get_public_leagues_for_join() TO authenticated;

COMMENT ON FUNCTION get_public_leagues_for_join IS 'Get all public leagues with user request/membership status (for player browse page)';

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Free agent profile fields added';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New columns:';
  RAISE NOTICE '  - skill_level (beginner/intermediate/advanced/expert)';
  RAISE NOTICE '  - availability (full_time/part_time/spare_only)';
  RAISE NOTICE '  - phone';
  RAISE NOTICE '  - city';
  RAISE NOTICE '  - province';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Indexes created for player search';
  RAISE NOTICE '✅ RLS policy updated for league owners to view join requests';
  RAISE NOTICE '✅ Updated: get_league_pending_join_requests()';
  RAISE NOTICE '✅ Created: get_public_leagues_for_join()';
  RAISE NOTICE '';
  RAISE NOTICE 'Players can now sign up without joining a league!';
  RAISE NOTICE '';
END $$;

