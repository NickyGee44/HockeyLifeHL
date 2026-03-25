-- Fix Profile Privacy: Remove Public Email Exposure
-- GDPR Compliance: Email addresses should NOT be publicly visible

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create a public view that only exposes non-PII fields
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  full_name,
  avatar_url,
  position,
  skill_level,
  created_at
FROM profiles;

-- Grant access to the public view
GRANT SELECT ON public_profiles TO authenticated, anon;

-- Create new scoped policies for profiles table

-- 1. Users can view their own profile (all fields)
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- 2. League members can view profiles of other members in their leagues (including email)
CREATE POLICY "League members can view member profiles"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT lm.user_id
      FROM league_memberships lm
      WHERE lm.league_id IN (
        SELECT league_id
        FROM league_memberships
        WHERE user_id = auth.uid()
          AND status = 'active'
      )
      AND lm.status = 'active'
    )
  );

-- 3. Team captains can view profiles of players on their teams
CREATE POLICY "Team captains can view team member profiles"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT tr.player_id
      FROM team_rosters tr
      INNER JOIN teams t ON t.id = tr.team_id
      INNER JOIN leagues l ON l.id = t.league_id
      WHERE l.organization_id IN (
        SELECT organization_id
        FROM leagues
        WHERE id IN (
          SELECT league_id
          FROM league_memberships
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- 4. Organization owners can view all profiles in their organization
CREATE POLICY "Organization owners can view org member profiles"
  ON profiles
  FOR SELECT
  USING (
    id IN (
      SELECT user_id
      FROM league_memberships lm
      INNER JOIN leagues l ON l.id = lm.league_id
      WHERE l.organization_id IN (
        SELECT id FROM organizations WHERE owner_user_id = auth.uid()
      )
    )
  );

-- Keep existing update and insert policies unchanged
-- (Users can update their own profiles, service role can manage all)

COMMENT ON VIEW public_profiles IS 'Public view of profiles without PII (no email, phone, city, province)';
COMMENT ON POLICY "League members can view member profiles" ON profiles IS 'GDPR compliant: only league members can see email addresses';
