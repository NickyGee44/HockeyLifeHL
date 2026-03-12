-- ==============================================================================
-- ADD SEASON REGISTRATION TYPE - Enhanced Registration Options
-- ==============================================================================
-- Purpose: Support multiple registration methods (draft, open, captain invite)
-- Agent: Agent 1 - Database & Infrastructure
-- Date: January 26, 2026
-- ==============================================================================

-- ==============================================================================
-- CREATE ENUM: registration_type
-- ==============================================================================
DO $$ BEGIN
  CREATE TYPE registration_type AS ENUM ('draft', 'open_registration', 'captain_invite_only');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE registration_type IS 'How players join teams: draft, open registration, or captain invites only';

-- ==============================================================================
-- ADD COLUMNS to seasons table
-- ==============================================================================

-- Registration Type & Settings
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS registration_type registration_type DEFAULT 'draft';

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS max_players_per_team INTEGER;

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS allow_team_selection BOOLEAN DEFAULT false;

-- ==============================================================================
-- COMMENTS
-- ==============================================================================
COMMENT ON COLUMN seasons.registration_type IS 'How players join teams: draft (traditional), open_registration (pick team), or captain_invite_only';
COMMENT ON COLUMN seasons.registration_opens_at IS 'When player registration opens (NULL = immediately)';
COMMENT ON COLUMN seasons.registration_closes_at IS 'When player registration closes (NULL = no deadline)';
COMMENT ON COLUMN seasons.max_players_per_team IS 'Maximum roster size per team (NULL = no limit)';
COMMENT ON COLUMN seasons.allow_team_selection IS 'If true, players can select their team in open_registration mode';

-- ==============================================================================
-- INDEXES for Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_seasons_registration_type
  ON seasons(registration_type);

CREATE INDEX IF NOT EXISTS idx_seasons_registration_dates
  ON seasons(registration_opens_at, registration_closes_at);

-- Composite index for finding open registration seasons
CREATE INDEX IF NOT EXISTS idx_seasons_open_registration
  ON seasons(league_id, registration_type, registration_opens_at, registration_closes_at)
  WHERE registration_type = 'open_registration';

-- ==============================================================================
-- HELPER FUNCTION: Check if season registration is open
-- ==============================================================================
CREATE OR REPLACE FUNCTION is_season_registration_open(check_season_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  season_record RECORD;
  is_open BOOLEAN;
BEGIN
  SELECT
    registration_opens_at,
    registration_closes_at,
    status
  INTO season_record
  FROM seasons
  WHERE id = check_season_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Season must be active or upcoming
  IF season_record.status NOT IN ('active', 'upcoming') THEN
    RETURN false;
  END IF;

  -- Check if registration window is open
  is_open := true;

  -- Check if registration has opened (if date is set)
  IF season_record.registration_opens_at IS NOT NULL THEN
    is_open := is_open AND (NOW() >= season_record.registration_opens_at);
  END IF;

  -- Check if registration has closed (if date is set)
  IF season_record.registration_closes_at IS NOT NULL THEN
    is_open := is_open AND (NOW() <= season_record.registration_closes_at);
  END IF;

  RETURN is_open;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_season_registration_open IS 'Check if a season is currently accepting player registrations';

-- ==============================================================================
-- HELPER FUNCTION: Get available seasons for registration
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_open_registration_seasons(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  registration_type registration_type,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  max_players_per_team INTEGER,
  allow_team_selection BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.registration_type,
    s.registration_opens_at,
    s.registration_closes_at,
    s.max_players_per_team,
    s.allow_team_selection
  FROM seasons s
  WHERE s.league_id = check_league_id
    AND s.status IN ('active', 'upcoming')
    AND (s.registration_opens_at IS NULL OR s.registration_opens_at <= NOW())
    AND (s.registration_closes_at IS NULL OR s.registration_closes_at >= NOW())
  ORDER BY s.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_open_registration_seasons IS 'Get all seasons currently accepting registrations in a league';

-- ==============================================================================
-- HELPER FUNCTION: Check team roster capacity
-- ==============================================================================
CREATE OR REPLACE FUNCTION is_team_roster_full(
  check_team_id UUID,
  check_season_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_players INTEGER;
BEGIN
  -- Get max players from season
  SELECT max_players_per_team INTO max_players
  FROM seasons
  WHERE id = check_season_id;

  -- If no limit set, roster is never full
  IF max_players IS NULL THEN
    RETURN false;
  END IF;

  -- Count current roster size
  SELECT COUNT(*) INTO current_count
  FROM team_rosters
  WHERE team_id = check_team_id
    AND season_id = check_season_id
    AND status = 'active';

  RETURN current_count >= max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_team_roster_full IS 'Check if a team has reached its roster capacity for a season';

-- ==============================================================================
-- VALIDATION: Check registration dates make sense
-- ==============================================================================
CREATE OR REPLACE FUNCTION validate_season_registration_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If both dates are set, opens must be before closes
  IF NEW.registration_opens_at IS NOT NULL
     AND NEW.registration_closes_at IS NOT NULL
     AND NEW.registration_opens_at >= NEW.registration_closes_at THEN
    RAISE EXCEPTION 'registration_opens_at must be before registration_closes_at';
  END IF;

  -- Registration should close before season starts (if both are set)
  IF NEW.registration_closes_at IS NOT NULL
     AND NEW.start_date IS NOT NULL
     AND NEW.registration_closes_at > NEW.start_date THEN
    RAISE WARNING 'registration_closes_at is after season start_date - this may be intentional';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_season_registration_dates
  BEFORE INSERT OR UPDATE ON seasons
  FOR EACH ROW
  EXECUTE FUNCTION validate_season_registration_dates();

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Season registration type system created successfully';
  RAISE NOTICE '✅ Added columns to seasons table:';
  RAISE NOTICE '  - registration_type (enum)';
  RAISE NOTICE '  - registration_opens_at, registration_closes_at';
  RAISE NOTICE '  - max_players_per_team';
  RAISE NOTICE '  - allow_team_selection';
  RAISE NOTICE '✅ Helper functions created:';
  RAISE NOTICE '  - is_season_registration_open(season_id)';
  RAISE NOTICE '  - get_open_registration_seasons(league_id)';
  RAISE NOTICE '  - is_team_roster_full(team_id, season_id)';
  RAISE NOTICE '✅ Validation trigger added for registration dates';
  RAISE NOTICE '';
END $$;
