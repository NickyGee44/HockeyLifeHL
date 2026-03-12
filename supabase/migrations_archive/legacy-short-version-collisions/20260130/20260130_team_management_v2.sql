-- ==============================================================================
-- TEAM MANAGEMENT SCHEMA - PRODUCTION VERSION
-- ==============================================================================
-- Description: Team roster and staff management with division constraints
-- Author: Backend Architect + User Feedback
-- Date: January 30, 2026
-- Changes from v1:
--   - Max roster size: 20 (not 30)
--   - Players can be on multiple teams in different divisions
--   - Jersey switches tracked temporally (stats follow player_id)
-- ==============================================================================

-- ==============================================================================
-- ENUMS: Define valid values for type safety
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE player_position AS ENUM ('Forward', 'Defense', 'Goalie');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE team_staff_role AS ENUM (
    'Head Coach',
    'Assistant Coach',
    'Manager',
    'Trainer',
    'Equipment Manager',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE roster_status AS ENUM ('active', 'inactive', 'suspended', 'injured', 'traded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leadership_role AS ENUM ('captain', 'alternate_captain');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- ENHANCE EXISTING TEAMS TABLE
-- ==============================================================================

-- Add new columns to teams
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS home_venue_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS max_roster_size INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add constraints
DO $$ BEGIN
  ALTER TABLE teams ADD CONSTRAINT check_team_status CHECK (status IN ('active', 'inactive', 'suspended', 'disbanded'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE teams ADD CONSTRAINT check_max_roster_size CHECK (max_roster_size > 0 AND max_roster_size <= 50);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_teams_division ON teams(division_id) WHERE division_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(league_id, status);
CREATE INDEX IF NOT EXISTS idx_teams_league_active ON teams(league_id) WHERE status = 'active';

-- Add comments
COMMENT ON TABLE teams IS 'Core team entity with organization isolation via league_id';
COMMENT ON COLUMN teams.max_roster_size IS 'Maximum allowed roster size for this team (typically 20 for hockey)';

-- ==============================================================================
-- CREATE TEAM_ROSTERS TABLE
-- ==============================================================================

-- Backup existing data if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_rosters') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS team_rosters_backup_' || to_char(NOW(), 'YYYYMMDD_HH24MISS') || ' AS SELECT * FROM team_rosters';
  END IF;
END
$$;

-- Drop and recreate team_rosters
DROP TABLE IF EXISTS team_rosters CASCADE;

CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL, -- Denormalized from team for constraint checking

  -- Player Attributes
  jersey_number INTEGER CHECK (jersey_number > 0 AND jersey_number < 100),
  position player_position,
  leadership_role leadership_role,

  -- Status
  status roster_status NOT NULL DEFAULT 'active',
  is_goalie BOOLEAN GENERATED ALWAYS AS (position = 'Goalie') STORED,

  -- Temporal tracking (for jersey switches)
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT valid_captain_status CHECK (
    leadership_role IS NULL OR status = 'active'
  )
);

-- Create indexes
CREATE INDEX idx_team_rosters_team ON team_rosters(team_id, season_id) WHERE status = 'active';
CREATE INDEX idx_team_rosters_player ON team_rosters(player_id, season_id);
CREATE INDEX idx_team_rosters_league ON team_rosters(league_id, season_id);
CREATE INDEX idx_team_rosters_division ON team_rosters(division_id, season_id) WHERE division_id IS NOT NULL;
CREATE INDEX idx_team_rosters_jersey ON team_rosters(team_id, jersey_number) WHERE status = 'active';
CREATE INDEX idx_team_rosters_position ON team_rosters(team_id, position) WHERE status = 'active';
CREATE INDEX idx_team_rosters_leadership ON team_rosters(team_id, leadership_role) WHERE leadership_role IS NOT NULL;

-- Covering index for roster list queries
CREATE INDEX idx_team_rosters_list_covering ON team_rosters(team_id, season_id, status)
  INCLUDE (player_id, jersey_number, position, leadership_role);

-- Partial index for goalies
CREATE INDEX idx_team_rosters_goalies ON team_rosters(team_id, season_id)
  WHERE position = 'Goalie' AND status = 'active';

COMMENT ON TABLE team_rosters IS 'Player roster assignments - players can be on multiple teams in different divisions';
COMMENT ON COLUMN team_rosters.division_id IS 'Denormalized from team - used to enforce one team per division per player constraint';
COMMENT ON COLUMN team_rosters.jersey_number IS 'Can change during season - stats track player_id not jersey';
COMMENT ON COLUMN team_rosters.start_date IS 'When player joined team or changed jersey - enables temporal tracking';

-- ==============================================================================
-- DEFERRED CONSTRAINTS
-- ==============================================================================

-- Unique jersey per team/season for active players
ALTER TABLE team_rosters
ADD CONSTRAINT unique_jersey_per_team_season
UNIQUE (team_id, season_id, jersey_number, status)
DEFERRABLE INITIALLY DEFERRED;

-- Only one captain per team per season
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE team_rosters
ADD CONSTRAINT one_captain_per_team_season
EXCLUDE USING gist (
  team_id WITH =,
  season_id WITH =,
  leadership_role WITH =
) WHERE (leadership_role = 'captain' AND status = 'active');

-- Player can only be on ONE team per division per season (allows multiple divisions)
-- This is enforced via trigger (see below) because it requires JOIN to teams table

-- ==============================================================================
-- CREATE TEAM_STAFF TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS team_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Staff Details
  role team_staff_role NOT NULL,
  title TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Temporal
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Contact
  email TEXT,
  phone TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_staff_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT unique_active_staff_role UNIQUE (team_id, user_id, role, season_id, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Indexes
CREATE INDEX idx_team_staff_team ON team_staff(team_id, season_id) WHERE is_active = true;
CREATE INDEX idx_team_staff_user ON team_staff(user_id);
CREATE INDEX idx_team_staff_league ON team_staff(league_id);
CREATE INDEX idx_team_staff_role ON team_staff(team_id, role) WHERE is_active = true;

COMMENT ON TABLE team_staff IS 'Coaches, managers, and staff assigned to teams';

-- ==============================================================================
-- TRIGGERS: Data integrity and automation
-- ==============================================================================

-- Sync division_id and league_id from team
CREATE OR REPLACE FUNCTION sync_team_roster_denormalized_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate division_id and league_id from team
  SELECT t.division_id, t.league_id
  INTO NEW.division_id, NEW.league_id
  FROM teams t
  WHERE t.id = NEW.team_id;

  -- Validate division_id matches if provided
  IF TG_OP = 'UPDATE' AND OLD.division_id IS NOT NULL AND NEW.division_id != OLD.division_id THEN
    RAISE EXCEPTION 'Cannot change division_id directly - it syncs from team.division_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_team_roster_fields
  BEFORE INSERT OR UPDATE ON team_rosters
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_roster_denormalized_fields();

-- Enforce: Player can only be on ONE team per division per season
CREATE OR REPLACE FUNCTION enforce_one_team_per_division()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for active rosters with a division
  IF NEW.status = 'active' AND NEW.division_id IS NOT NULL THEN
    -- Check if player is already on another team in this division
    IF EXISTS (
      SELECT 1 FROM team_rosters tr
      WHERE tr.player_id = NEW.player_id
        AND tr.season_id = NEW.season_id
        AND tr.division_id = NEW.division_id
        AND tr.team_id != NEW.team_id
        AND tr.status = 'active'
        AND tr.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Player is already on another team in this division this season';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_one_team_per_division
  BEFORE INSERT OR UPDATE ON team_rosters
  FOR EACH ROW
  EXECUTE FUNCTION enforce_one_team_per_division();

-- Sync league_id and division_id for team_staff
CREATE OR REPLACE FUNCTION sync_team_staff_league_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT league_id INTO NEW.league_id FROM teams WHERE id = NEW.team_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_team_staff_league_id
  BEFORE INSERT OR UPDATE ON team_staff
  FOR EACH ROW
  EXECUTE FUNCTION sync_team_staff_league_id();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_team_rosters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_rosters_updated_at
  BEFORE UPDATE ON team_rosters
  FOR EACH ROW
  EXECUTE FUNCTION update_team_rosters_updated_at();

CREATE OR REPLACE FUNCTION update_team_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_staff_updated_at
  BEFORE UPDATE ON team_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_team_staff_updated_at();

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active rosters in public leagues" ON team_rosters;
DROP POLICY IF EXISTS "League members can view rosters" ON team_rosters;
DROP POLICY IF EXISTS "League admins can manage rosters" ON team_rosters;
DROP POLICY IF EXISTS "Organization owners can manage rosters" ON team_rosters;
DROP POLICY IF EXISTS "Service role has full access to team_rosters" ON team_rosters;

DROP POLICY IF EXISTS "Public can view staff in public leagues" ON team_staff;
DROP POLICY IF EXISTS "League members can view staff" ON team_staff;
DROP POLICY IF EXISTS "League admins can manage staff" ON team_staff;
DROP POLICY IF EXISTS "Organization owners can manage staff" ON team_staff;
DROP POLICY IF EXISTS "Service role has full access to team_staff" ON team_staff;

-- Policies for team_rosters
CREATE POLICY "Public can view active rosters in public leagues"
  ON team_rosters FOR SELECT
  USING (
    status = 'active'
    AND league_id IN (
      SELECT id FROM leagues WHERE is_public = true AND status = 'active'
    )
  );

CREATE POLICY "League members can view rosters"
  ON team_rosters FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage rosters"
  ON team_rosters FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Organization owners can manage rosters"
  ON team_rosters FOR ALL
  USING (
    league_id IN (
      SELECT l.id FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE o.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to team_rosters"
  ON team_rosters FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policies for team_staff
CREATE POLICY "Public can view staff in public leagues"
  ON team_staff FOR SELECT
  USING (
    is_active = true
    AND league_id IN (
      SELECT id FROM leagues WHERE is_public = true AND status = 'active'
    )
  );

CREATE POLICY "League members can view staff"
  ON team_staff FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "League admins can manage staff"
  ON team_staff FOR ALL
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Organization owners can manage staff"
  ON team_staff FOR ALL
  USING (
    league_id IN (
      SELECT l.id FROM leagues l
      JOIN organizations o ON o.id = l.organization_id
      WHERE o.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to team_staff"
  ON team_staff FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Get active roster for a team
CREATE OR REPLACE FUNCTION get_team_roster(
  p_team_id UUID,
  p_season_id UUID DEFAULT NULL
)
RETURNS TABLE(
  player_id UUID,
  full_name TEXT,
  jersey_number INTEGER,
  position player_position,
  leadership_role leadership_role,
  start_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.player_id,
    p.full_name,
    tr.jersey_number,
    tr.position,
    tr.leadership_role,
    tr.start_date
  FROM team_rosters tr
  JOIN profiles p ON p.id = tr.player_id
  WHERE tr.team_id = p_team_id
    AND (p_season_id IS NULL OR tr.season_id = p_season_id)
    AND tr.status = 'active'
  ORDER BY
    CASE WHEN tr.leadership_role = 'captain' THEN 1
         WHEN tr.leadership_role = 'alternate_captain' THEN 2
         ELSE 3 END,
    tr.jersey_number NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if jersey number is available
CREATE OR REPLACE FUNCTION is_jersey_available(
  p_team_id UUID,
  p_season_id UUID,
  p_jersey_number INTEGER,
  p_exclude_roster_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM team_rosters
    WHERE team_id = p_team_id
      AND season_id = p_season_id
      AND jersey_number = p_jersey_number
      AND status = 'active'
      AND (p_exclude_roster_id IS NULL OR id != p_exclude_roster_id)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get team captain
CREATE OR REPLACE FUNCTION get_team_captain(
  p_team_id UUID,
  p_season_id UUID
)
RETURNS TABLE(
  player_id UUID,
  full_name TEXT,
  jersey_number INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.player_id,
    p.full_name,
    tr.jersey_number
  FROM team_rosters tr
  JOIN profiles p ON p.id = tr.player_id
  WHERE tr.team_id = p_team_id
    AND tr.season_id = p_season_id
    AND tr.leadership_role = 'captain'
    AND tr.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Team Management Schema Migration Complete';
  RAISE NOTICE '📊 Max roster size: 20 players';
  RAISE NOTICE '🔒 Division constraint: One team per division per player';
  RAISE NOTICE '👕 Jersey tracking: Temporal (stats follow player_id)';
  RAISE NOTICE '🎯 Ready for API development';
END $$;
