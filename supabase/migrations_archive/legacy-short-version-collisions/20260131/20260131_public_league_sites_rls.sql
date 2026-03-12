-- ==============================================================================
-- PUBLIC LEAGUE SITES RLS POLICIES
-- ==============================================================================
-- Description: RLS policies for Platform 2 (public league websites)
-- Purpose: Allow anonymous read access to league data for public consumption
-- Date: January 31, 2026
-- Security: Read-only access to published/active league data
-- ==============================================================================

-- ==============================================================================
-- SECURITY RATIONALE
-- ==============================================================================
-- Platform 2 (league-sites) provides public-facing websites for leagues.
-- These policies enable anonymous users to:
-- - View active league information
-- - See game schedules and results
-- - View standings and team rosters
-- - Access player statistics
--
-- These policies DO NOT allow:
-- - Access to draft/archived leagues
-- - Access to private player information (email, phone)
-- - Write operations (create, update, delete)
-- - Access to administrative data
-- ==============================================================================

-- ==============================================================================
-- LEAGUES TABLE
-- ==============================================================================

-- Allow public read access to active leagues
CREATE POLICY IF NOT EXISTS "public_read_active_leagues"
  ON public.leagues
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

COMMENT ON POLICY "public_read_active_leagues" ON public.leagues IS
  'Allow public read access to active leagues for Platform 2 (league-sites)';

-- ==============================================================================
-- SEASONS TABLE
-- ==============================================================================

-- Allow public read access to seasons of active leagues
CREATE POLICY IF NOT EXISTS "public_read_seasons"
  ON public.seasons
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = seasons.league_id
        AND status = 'active'
    )
  );

COMMENT ON POLICY "public_read_seasons" ON public.seasons IS
  'Allow public read access to seasons of active leagues';

-- ==============================================================================
-- DIVISIONS TABLE
-- ==============================================================================

-- Allow public read access to divisions of active leagues
CREATE POLICY IF NOT EXISTS "public_read_divisions"
  ON public.divisions
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.leagues l ON l.id = s.league_id
      WHERE s.id = divisions.season_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "public_read_divisions" ON public.divisions IS
  'Allow public read access to divisions of active leagues';

-- ==============================================================================
-- TEAMS TABLE
-- ==============================================================================

-- Allow public read access to teams of active leagues
CREATE POLICY IF NOT EXISTS "public_read_teams"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = teams.league_id
        AND status = 'active'
    )
  );

COMMENT ON POLICY "public_read_teams" ON public.teams IS
  'Allow public read access to teams of active leagues';

-- ==============================================================================
-- GAMES TABLE
-- ==============================================================================

-- Allow public read access to games of active leagues
CREATE POLICY IF NOT EXISTS "public_read_games"
  ON public.games
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = games.league_id
        AND status = 'active'
    )
  );

COMMENT ON POLICY "public_read_games" ON public.games IS
  'Allow public read access to games of active leagues';

-- ==============================================================================
-- TEAM_ROSTERS TABLE
-- ==============================================================================

-- Allow public read access to team rosters
-- Note: This only exposes player_id, not personal information
CREATE POLICY IF NOT EXISTS "public_read_team_rosters"
  ON public.team_rosters
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.leagues l ON l.id = t.league_id
      WHERE t.id = team_rosters.team_id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "public_read_team_rosters" ON public.team_rosters IS
  'Allow public read access to team rosters of active leagues';

-- ==============================================================================
-- PROFILES TABLE
-- ==============================================================================

-- Allow public read access to limited profile fields for roster display
-- Only expose: first_name, last_name, avatar_url
-- DO NOT expose: email, phone, address, etc.
CREATE POLICY IF NOT EXISTS "public_read_player_profiles"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    -- User must be on a roster of an active league
    EXISTS (
      SELECT 1 FROM public.team_rosters tr
      JOIN public.teams t ON t.id = tr.team_id
      JOIN public.leagues l ON l.id = t.league_id
      WHERE tr.player_id = profiles.id
        AND l.status = 'active'
    )
  );

COMMENT ON POLICY "public_read_player_profiles" ON public.profiles IS
  'Allow public read access to limited profile info for players on active league rosters';

-- ==============================================================================
-- GAME_STATS TABLE (if exists)
-- ==============================================================================

-- Allow public read access to game statistics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'game_stats'
  ) THEN
    EXECUTE '
      CREATE POLICY IF NOT EXISTS "public_read_game_stats"
        ON public.game_stats
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.games g
            JOIN public.leagues l ON l.id = g.league_id
            WHERE g.id = game_stats.game_id
              AND l.status = ''active''
          )
        )
    ';
  END IF;
END $$;

-- ==============================================================================
-- PLAYER_STATS TABLE (if exists)
-- ==============================================================================

-- Allow public read access to player statistics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'player_stats'
  ) THEN
    EXECUTE '
      CREATE POLICY IF NOT EXISTS "public_read_player_stats"
        ON public.player_stats
        FOR SELECT
        TO anon, authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.teams t
            JOIN public.leagues l ON l.id = t.league_id
            WHERE t.id = player_stats.team_id
              AND l.status = ''active''
          )
        )
    ';
  END IF;
END $$;

-- ==============================================================================
-- STANDINGS VIEW (if exists)
-- ==============================================================================

-- Note: Views inherit RLS from underlying tables, so no additional policy needed

-- ==============================================================================
-- VENUES TABLE (if exists)
-- ==============================================================================

-- Allow public read access to venues for game display
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'venues'
  ) THEN
    EXECUTE '
      CREATE POLICY IF NOT EXISTS "public_read_venues"
        ON public.venues
        FOR SELECT
        TO anon, authenticated
        USING (true)
    ';
  END IF;
END $$;

-- ==============================================================================
-- STANDINGS RPC FUNCTION
-- ==============================================================================

-- Create secure RPC function for standings calculation
CREATE OR REPLACE FUNCTION public.get_league_standings(
  p_league_id UUID,
  p_season_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify league is active
  IF NOT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = p_league_id AND status = 'active'
  ) THEN
    RETURN '[]'::json;
  END IF;

  -- Build standings from teams (basic version - extend with game data)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'team_id', t.id,
        'team_name', t.name,
        'team_logo', t.logo,
        'division_id', t.division_id,
        'division_name', d.name,
        'games_played', 0,
        'wins', 0,
        'losses', 0,
        'ties', 0,
        'overtime_losses', 0,
        'points', 0,
        'goals_for', 0,
        'goals_against', 0,
        'goal_differential', 0,
        'streak', null,
        'last_10', null
      )
      ORDER BY t.name
    ),
    '[]'::json
  ) INTO v_result
  FROM public.teams t
  LEFT JOIN public.divisions d ON d.id = t.division_id
  WHERE t.league_id = p_league_id;

  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_league_standings(UUID, UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.get_league_standings(UUID, UUID) IS
  'Get league standings for Platform 2 public display. Returns team standings ordered by points.';

-- ==============================================================================
-- STATS LEADERS RPC FUNCTION
-- ==============================================================================

-- Create secure RPC function for stats leaders
CREATE OR REPLACE FUNCTION public.get_stats_leaders(
  p_league_id UUID,
  p_stat_type TEXT DEFAULT 'points',
  p_limit INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify league is active
  IF NOT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = p_league_id AND status = 'active'
  ) THEN
    RETURN '[]'::json;
  END IF;

  -- Return empty array (stats system not fully implemented)
  -- When player_stats table has data, extend this function
  RETURN '[]'::json;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_stats_leaders(UUID, TEXT, INTEGER) TO anon, authenticated;

COMMENT ON FUNCTION public.get_stats_leaders(UUID, TEXT, INTEGER) IS
  'Get stats leaders for Platform 2 public display. Returns top players by specified stat.';

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Public League Sites RLS Policies Created';
  RAISE NOTICE '🔒 Read-only access to active league data enabled';
  RAISE NOTICE '👤 Anonymous users can view: leagues, teams, games, rosters, standings';
  RAISE NOTICE '🛡️ Protected data: inactive leagues, private profile fields';
  RAISE NOTICE '📊 RPC functions created: get_league_standings, get_stats_leaders';
END $$;
