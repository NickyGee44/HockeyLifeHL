-- ==============================================================================
-- MULTI-TENANT MIGRATION: League Helper Functions
-- ==============================================================================
-- Description: Creates utility functions for league-aware queries and permissions
-- Priority: MEDIUM - Makes backend development easier
-- Author: Agent 1 - Database & Infrastructure
-- Date: January 25, 2026
-- ==============================================================================

-- ==============================================================================
-- LEAGUE MEMBERSHIP FUNCTIONS
-- ==============================================================================

-- Function to get all teams for a specific league
CREATE OR REPLACE FUNCTION get_league_teams(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  short_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  captain_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.short_name,
    t.logo_url,
    t.primary_color,
    t.secondary_color,
    t.captain_id
  FROM teams t
  WHERE t.league_id = check_league_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all seasons for a specific league
CREATE OR REPLACE FUNCTION get_league_seasons(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  status TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.status,
    s.start_date,
    s.end_date,
    s.created_at
  FROM seasons s
  WHERE s.league_id = check_league_id
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has access to a specific league
CREATE OR REPLACE FUNCTION user_has_league_access(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a specific league
CREATE OR REPLACE FUNCTION get_user_league_role(user_uuid UUID, check_league_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM league_memberships
  WHERE user_id = user_uuid
    AND league_id = check_league_id
    AND status = 'active';

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PLAYER STATS AGGREGATION FUNCTIONS
-- ==============================================================================

-- Function to get player stats for a specific league and season
CREATE OR REPLACE FUNCTION get_player_season_stats(
  check_league_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  player_id UUID,
  games_played BIGINT,
  total_goals BIGINT,
  total_assists BIGINT,
  total_points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.player_id,
    COUNT(DISTINCT ps.game_id) AS games_played,
    SUM(ps.goals) AS total_goals,
    SUM(ps.assists) AS total_assists,
    SUM(ps.goals + ps.assists) AS total_points
  FROM player_stats ps
  WHERE ps.league_id = check_league_id
    AND ps.season_id = check_season_id
  GROUP BY ps.player_id
  ORDER BY total_points DESC, total_goals DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get goalie stats for a specific league and season
CREATE OR REPLACE FUNCTION get_goalie_season_stats(
  check_league_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  player_id UUID,
  games_played BIGINT,
  total_goals_against BIGINT,
  total_saves BIGINT,
  shutouts BIGINT,
  save_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.player_id,
    COUNT(DISTINCT gs.game_id) AS games_played,
    SUM(gs.goals_against) AS total_goals_against,
    SUM(gs.saves) AS total_saves,
    SUM(CASE WHEN gs.shutout THEN 1 ELSE 0 END) AS shutouts,
    CASE
      WHEN SUM(gs.saves + gs.goals_against) > 0
      THEN ROUND((SUM(gs.saves)::NUMERIC / SUM(gs.saves + gs.goals_against)::NUMERIC) * 100, 2)
      ELSE 0
    END AS save_percentage
  FROM goalie_stats gs
  WHERE gs.league_id = check_league_id
    AND gs.season_id = check_season_id
  GROUP BY gs.player_id
  ORDER BY save_percentage DESC, total_saves DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- TEAM STATS AGGREGATION FUNCTIONS
-- ==============================================================================

-- Function to get team standings for a specific league and season
CREATE OR REPLACE FUNCTION get_team_standings(
  check_league_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  team_id UUID,
  games_played BIGINT,
  wins BIGINT,
  losses BIGINT,
  ties BIGINT,
  goals_for BIGINT,
  goals_against BIGINT,
  goal_differential BIGINT,
  points BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    COUNT(g.id) AS games_played,
    SUM(CASE
      WHEN (g.home_team_id = t.id AND g.home_score > g.away_score) OR
           (g.away_team_id = t.id AND g.away_score > g.home_score)
      THEN 1 ELSE 0
    END) AS wins,
    SUM(CASE
      WHEN (g.home_team_id = t.id AND g.home_score < g.away_score) OR
           (g.away_team_id = t.id AND g.away_score < g.home_score)
      THEN 1 ELSE 0
    END) AS losses,
    SUM(CASE
      WHEN g.home_score = g.away_score
      THEN 1 ELSE 0
    END) AS ties,
    SUM(CASE
      WHEN g.home_team_id = t.id THEN g.home_score
      WHEN g.away_team_id = t.id THEN g.away_score
      ELSE 0
    END) AS goals_for,
    SUM(CASE
      WHEN g.home_team_id = t.id THEN g.away_score
      WHEN g.away_team_id = t.id THEN g.home_score
      ELSE 0
    END) AS goals_against,
    SUM(CASE
      WHEN g.home_team_id = t.id THEN g.home_score - g.away_score
      WHEN g.away_team_id = t.id THEN g.away_score - g.home_score
      ELSE 0
    END) AS goal_differential,
    SUM(CASE
      WHEN (g.home_team_id = t.id AND g.home_score > g.away_score) OR
           (g.away_team_id = t.id AND g.away_score > g.home_score)
      THEN 2 -- Win = 2 points
      WHEN g.home_score = g.away_score
      THEN 1 -- Tie = 1 point
      ELSE 0
    END) AS points
  FROM teams t
  LEFT JOIN games g ON (
    (g.home_team_id = t.id OR g.away_team_id = t.id)
    AND g.season_id = check_season_id
    AND g.status = 'completed'
  )
  WHERE t.league_id = check_league_id
  GROUP BY t.id
  ORDER BY points DESC, wins DESC, goal_differential DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- GAME MANAGEMENT FUNCTIONS
-- ==============================================================================

-- Function to get upcoming games for a league
CREATE OR REPLACE FUNCTION get_upcoming_games(
  check_league_id UUID,
  days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE(
  id UUID,
  season_id UUID,
  home_team_id UUID,
  away_team_id UUID,
  scheduled_at TIMESTAMPTZ,
  location TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.season_id,
    g.home_team_id,
    g.away_team_id,
    g.scheduled_at,
    g.location,
    g.status
  FROM games g
  WHERE g.league_id = check_league_id
    AND g.status IN ('scheduled', 'in_progress')
    AND g.scheduled_at BETWEEN NOW() AND NOW() + (days_ahead || ' days')::INTERVAL
  ORDER BY g.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent games for a league
CREATE OR REPLACE FUNCTION get_recent_games(
  check_league_id UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  id UUID,
  season_id UUID,
  home_team_id UUID,
  away_team_id UUID,
  home_score INTEGER,
  away_score INTEGER,
  scheduled_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.season_id,
    g.home_team_id,
    g.away_team_id,
    g.home_score,
    g.away_score,
    g.scheduled_at,
    g.status
  FROM games g
  WHERE g.league_id = check_league_id
    AND g.status = 'completed'
    AND g.scheduled_at BETWEEN NOW() - (days_back || ' days')::INTERVAL AND NOW()
  ORDER BY g.scheduled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PAYMENT TRACKING FUNCTIONS
-- ==============================================================================

-- Function to get unpaid player fees for a league and season
CREATE OR REPLACE FUNCTION get_unpaid_fees(
  check_league_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  player_id UUID,
  amount DECIMAL,
  payment_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.player_id,
    p.amount,
    p.payment_date
  FROM payments p
  WHERE p.league_id = check_league_id
    AND p.season_id = check_season_id
    AND p.status != 'paid'
  ORDER BY p.payment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get scorekeeper payment summary for a league
CREATE OR REPLACE FUNCTION get_scorekeeper_payments(
  check_league_id UUID,
  check_scorekeeper_id UUID DEFAULT NULL
)
RETURNS TABLE(
  scorekeeper_id UUID,
  games_worked BIGINT,
  total_hours NUMERIC,
  total_payment NUMERIC,
  pending_payment NUMERIC,
  approved_payment NUMERIC,
  paid_payment NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gsa.scorekeeper_id,
    COUNT(gsa.id) AS games_worked,
    SUM(COALESCE(gsa.duration_minutes, 0))::NUMERIC / 60 AS total_hours,
    SUM(COALESCE(gsa.payment_amount, 0)) AS total_payment,
    SUM(CASE WHEN gsa.payment_status = 'pending' THEN COALESCE(gsa.payment_amount, 0) ELSE 0 END) AS pending_payment,
    SUM(CASE WHEN gsa.payment_status = 'approved' THEN COALESCE(gsa.payment_amount, 0) ELSE 0 END) AS approved_payment,
    SUM(CASE WHEN gsa.payment_status = 'paid' THEN COALESCE(gsa.payment_amount, 0) ELSE 0 END) AS paid_payment
  FROM game_scorekeeper_assignments gsa
  WHERE gsa.league_id = check_league_id
    AND (check_scorekeeper_id IS NULL OR gsa.scorekeeper_id = check_scorekeeper_id)
  GROUP BY gsa.scorekeeper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- LEAGUE VALIDATION FUNCTIONS
-- ==============================================================================

-- Function to validate league slug uniqueness
CREATE OR REPLACE FUNCTION is_league_slug_available(check_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM leagues WHERE slug = check_slug
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get league by slug
CREATE OR REPLACE FUNCTION get_league_by_slug(check_slug TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  status TEXT,
  subscription_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.description,
    l.logo_url,
    l.primary_color,
    l.secondary_color,
    l.status,
    l.subscription_tier
  FROM leagues l
  WHERE l.slug = check_slug
    AND l.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- IMPORTANT NOTES
-- ==============================================================================
--
-- These helper functions:
-- 1. Use SECURITY DEFINER to bypass RLS for controlled queries
-- 2. Should be called from server actions with proper permission checks
-- 3. Make it easier to build league-aware backend logic
-- 4. Provide common aggregations and queries
--
-- Usage example in server actions:
-- const stats = await supabase.rpc('get_player_season_stats', {
--   check_league_id: leagueId,
--   check_season_id: seasonId
-- });
--
-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
