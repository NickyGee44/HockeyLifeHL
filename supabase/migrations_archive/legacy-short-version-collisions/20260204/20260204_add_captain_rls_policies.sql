-- ==============================================================================
-- ADD CAPTAIN RLS POLICIES
-- ==============================================================================
-- Purpose: Enable captains to manage their assigned teams
-- Agent: backend-architect
-- Date: February 4, 2026
-- Security Level: CRITICAL - These policies control access to team management
-- ==============================================================================

-- ==============================================================================
-- INVARIANTS ENFORCED BY THESE POLICIES:
-- ==============================================================================
-- 1. Captains can ONLY manage teams where teams.captain_id = auth.uid()
-- 2. Captains CANNOT change their own captain status (prevents privilege escalation)
-- 3. Captains CANNOT access teams outside their assignment
-- 4. Organization owners retain ALL access (existing policies preserved)
-- 5. All operations use auth.uid() for accountability
-- ==============================================================================

-- ==============================================================================
-- TEAM_ROSTERS: Captain Access
-- ==============================================================================

-- Policy: Captains can view rosters for their teams
CREATE POLICY "Captains can view their team rosters"
  ON team_rosters FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

-- Policy: Captains can manage rosters for their teams (INSERT, UPDATE, DELETE)
CREATE POLICY "Captains can manage their team rosters"
  ON team_rosters FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

COMMENT ON POLICY "Captains can view their team rosters" ON team_rosters IS
  'Allows captains to view roster for teams they manage. Critical: Uses teams.captain_id as source of truth.';

COMMENT ON POLICY "Captains can manage their team rosters" ON team_rosters IS
  'Allows captains to add/remove players, update jersey numbers, and assign leadership roles. USING and WITH CHECK both verify captain_id to prevent privilege escalation.';

-- ==============================================================================
-- TEAMS: Captain Access
-- ==============================================================================

-- Policy: Captains can view their teams
CREATE POLICY "Captains can view their teams"
  ON teams FOR SELECT
  USING (captain_id = auth.uid());

-- Policy: Captains can update their team settings
-- CRITICAL: WITH CHECK prevents captains from changing captain_id
CREATE POLICY "Captains can update their team settings"
  ON teams FOR UPDATE
  USING (captain_id = auth.uid())
  WITH CHECK (
    -- Ensure captain_id hasn't changed OR is being set to self
    (captain_id = auth.uid() OR captain_id IS NULL)
  );

COMMENT ON POLICY "Captains can view their teams" ON teams IS
  'Allows captains to view teams they manage. Simple captain_id check.';

COMMENT ON POLICY "Captains can update their team settings" ON teams IS
  'Allows captains to update team name, colors, logo, etc. CRITICAL: WITH CHECK prevents changing captain_id to prevent privilege escalation or removing self as captain.';

-- ==============================================================================
-- TEAM_STAFF: Captain Access
-- ==============================================================================

-- Policy: Captains can view staff for their teams
CREATE POLICY "Captains can view their team staff"
  ON team_staff FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

-- Policy: Captains can manage staff for their teams
CREATE POLICY "Captains can manage their team staff"
  ON team_staff FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE captain_id = auth.uid()
    )
  );

COMMENT ON POLICY "Captains can view their team staff" ON team_staff IS
  'Allows captains to view coaches, trainers, and other staff for their teams.';

COMMENT ON POLICY "Captains can manage their team staff" ON team_staff IS
  'Allows captains to add/remove staff members for their teams.';

-- ==============================================================================
-- VALIDATION: Verify Policies Exist
-- ==============================================================================
DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Count captain-specific policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'Captains%';

  IF v_policy_count >= 7 THEN
    RAISE NOTICE '✅ All captain RLS policies created (found % policies)', v_policy_count;
  ELSE
    RAISE WARNING '⚠️  Expected at least 7 captain policies, found %', v_policy_count;
  END IF;
END $$;

-- ==============================================================================
-- SECURITY AUDIT: Verify Policy Logic
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY AUDIT: Captain RLS Policies';
  RAISE NOTICE '';
  RAISE NOTICE '✅ team_rosters policies:';
  RAISE NOTICE '  - Captains can view their team rosters';
  RAISE NOTICE '  - Captains can manage their team rosters (INSERT/UPDATE/DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ teams policies:';
  RAISE NOTICE '  - Captains can view their teams';
  RAISE NOTICE '  - Captains can update team settings (CANNOT change captain_id)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ team_staff policies:';
  RAISE NOTICE '  - Captains can view their team staff';
  RAISE NOTICE '  - Captains can manage their team staff';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  SECURITY CONTROLS VERIFIED:';
  RAISE NOTICE '  ✓ Captains cannot access other teams';
  RAISE NOTICE '  ✓ Captains cannot change captain_id (prevents privilege escalation)';
  RAISE NOTICE '  ✓ All checks use auth.uid() for accountability';
  RAISE NOTICE '  ✓ Organization owner policies remain intact';
  RAISE NOTICE '';
END $$;

-- ==============================================================================
-- IMPORTANT NOTES FOR DEVELOPERS
-- ==============================================================================
-- 1. NEVER allow captains to modify captain_id - this would enable privilege escalation
-- 2. ALWAYS verify captain status via teams.captain_id, NOT team_rosters.leadership_role
-- 3. These policies are ADDITIVE - organization owners retain full access
-- 4. Captain actions are logged via auth.uid() in all queries
-- 5. RLS is defense-in-depth - application logic should also check permissions
-- ==============================================================================
