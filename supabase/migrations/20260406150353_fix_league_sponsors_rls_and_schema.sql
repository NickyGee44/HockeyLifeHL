-- ==========================================================================
-- FIX: league_sponsors RLS + tier constraint + missing columns
-- ==========================================================================
-- Problem: INSERT policy only checks league_memberships, but league builder
-- users may own the league via leagues.owner_id or organizations.owner_user_id
-- without having a league_memberships row with role='owner'/'admin'.
-- Also: tier CHECK doesn't include 'premier', and description/display_order
-- columns are missing from original schema but used by the UI.
-- ==========================================================================

-- 1) Add missing columns the UI depends on
ALTER TABLE league_sponsors
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2) Drop old tier CHECK and replace with one that includes 'premier'
ALTER TABLE league_sponsors DROP CONSTRAINT IF EXISTS league_sponsors_tier_check;
ALTER TABLE league_sponsors
  ADD CONSTRAINT league_sponsors_tier_check
  CHECK (tier IN ('premier', 'gold', 'silver', 'bronze', 'title'));

-- 3) Drop the restrictive INSERT policy and replace with one that covers
--    all ownership paths: league_memberships, leagues.owner_id, and
--    organizations.owner_user_id
DROP POLICY IF EXISTS "Admins can create league sponsors" ON league_sponsors;

CREATE POLICY "Admins can create league sponsors"
  ON league_sponsors FOR INSERT
  WITH CHECK (
    -- Path 1: league_memberships with owner/admin role
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = league_sponsors.league_id
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR
    -- Path 2: direct league owner
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_sponsors.league_id
        AND l.owner_id = auth.uid()
    )
    OR
    -- Path 3: org owner whose org owns the league
    EXISTS (
      SELECT 1 FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE l.id = league_sponsors.league_id
        AND o.owner_user_id = auth.uid()
    )
  );

-- 4) Same fix for UPDATE policy
DROP POLICY IF EXISTS "Admins can update league sponsors" ON league_sponsors;

CREATE POLICY "Admins can update league sponsors"
  ON league_sponsors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = league_sponsors.league_id
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_sponsors.league_id
        AND l.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE l.id = league_sponsors.league_id
        AND o.owner_user_id = auth.uid()
    )
  );

-- 5) Widen DELETE policy to match (was owner-only via memberships)
DROP POLICY IF EXISTS "Owners can delete league sponsors" ON league_sponsors;

CREATE POLICY "Owners can delete league sponsors"
  ON league_sponsors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = league_sponsors.league_id
        AND lm.status = 'active'
        AND lm.role = 'owner'
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_sponsors.league_id
        AND l.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE l.id = league_sponsors.league_id
        AND o.owner_user_id = auth.uid()
    )
  );

-- 6) Widen SELECT policy too — league owners should always see their sponsors
DROP POLICY IF EXISTS "Users can view league sponsors" ON league_sponsors;

CREATE POLICY "Users can view league sponsors"
  ON league_sponsors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = league_sponsors.league_id
        AND lm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_sponsors.league_id
        AND l.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE l.id = league_sponsors.league_id
        AND o.owner_user_id = auth.uid()
    )
  );
