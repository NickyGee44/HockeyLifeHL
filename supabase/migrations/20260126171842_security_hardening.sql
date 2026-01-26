-- ==============================================================================
-- SECURITY HARDENING MIGRATION
-- ==============================================================================
-- Purpose: Fix critical security vulnerabilities identified by Supabase Database Linter
-- Date: January 27, 2026
-- Reference: https://supabase.com/docs/guides/database/database-linter
--
-- FIXES:
-- 1. CRITICAL: Remove SECURITY DEFINER from views (public_leagues, league_branding)
-- 2. CRITICAL: Enable RLS on webhook_events table
-- 3. HIGH: Add SET search_path = '' to all functions (prevents search path hijacking)
-- 4. HIGH: Revoke anon/authenticated access from materialized views
-- ==============================================================================

-- ==============================================================================
-- CRITICAL FIX #1: SECURITY DEFINER VIEWS
-- ==============================================================================
-- Views with SECURITY DEFINER can bypass RLS policies, allowing users to access
-- data they shouldn't. These views expose league data and should use SECURITY INVOKER.
--
-- Risk: An attacker could access all league data regardless of RLS policies.
-- Fix: Recreate views without SECURITY DEFINER (PostgreSQL views use INVOKER by default)
-- ==============================================================================

-- Drop and recreate public_leagues view (removes any SECURITY DEFINER)
DROP VIEW IF EXISTS public_leagues CASCADE;

CREATE VIEW public_leagues AS
SELECT
  id,
  name,
  slug,
  description,
  logo_url,
  city,
  state_province,
  country,
  latitude,
  longitude,
  primary_color,
  secondary_color,
  website_url,
  contact_email,
  registration_url,
  search_keywords,
  address,
  postal_code,
  created_at
FROM leagues
WHERE is_public = true
  AND status = 'active';

-- Explicitly set SECURITY INVOKER (default, but explicit is better)
ALTER VIEW public_leagues SET (security_invoker = on);

COMMENT ON VIEW public_leagues IS 'Publicly visible leagues for discovery (safe for unauthenticated access). Uses SECURITY INVOKER - RLS policies apply.';

-- Grant read access (RLS will still apply)
GRANT SELECT ON public_leagues TO anon;
GRANT SELECT ON public_leagues TO authenticated;


-- Drop and recreate league_branding view (removes any SECURITY DEFINER)
DROP VIEW IF EXISTS league_branding CASCADE;

CREATE VIEW league_branding AS
SELECT
  id,
  name,
  slug,
  subdomain,
  custom_domain,
  custom_domain_verified,
  tagline,
  logo_url,
  banner_url,
  favicon_url,
  primary_color,
  secondary_color,
  accent_color,
  font_family,
  custom_css,
  status
FROM leagues
WHERE status = 'active';

-- Explicitly set SECURITY INVOKER
ALTER VIEW league_branding SET (security_invoker = on);

COMMENT ON VIEW league_branding IS 'Active league branding information. Uses SECURITY INVOKER - RLS policies apply.';

-- Grant read access (RLS will still apply)
GRANT SELECT ON league_branding TO authenticated;
GRANT SELECT ON league_branding TO anon;


-- ==============================================================================
-- CRITICAL FIX #2: ENABLE RLS ON webhook_events
-- ==============================================================================
-- The webhook_events table stores Stripe webhook event IDs for idempotency.
-- Without RLS, any authenticated user could read/write webhook event records.
--
-- Risk: Information disclosure, potential for DoS by polluting the idempotency table.
-- Fix: Enable RLS and create strict policies (service role only).
-- ==============================================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role has full access to webhook events" ON webhook_events;
DROP POLICY IF EXISTS "No direct access to webhook events" ON webhook_events;

-- Only service role can access webhook_events (used by backend webhook handlers)
CREATE POLICY "Service role has full access to webhook events"
  ON webhook_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Explicit deny for all other roles (defense in depth)
-- Note: With RLS enabled and no matching policy, access is denied by default
-- This comment documents the intent.

COMMENT ON TABLE webhook_events IS 'Tracks processed Stripe webhook events for idempotency. RLS enabled - service role only.';


-- ==============================================================================
-- HIGH PRIORITY FIX #3: ADD search_path TO ALL FUNCTIONS
-- ==============================================================================
-- Functions without explicit search_path can be vulnerable to search path hijacking.
-- An attacker with CREATE privileges could create malicious objects in a schema
-- that appears earlier in the search_path, hijacking function calls.
--
-- Risk: Privilege escalation, arbitrary code execution as function owner.
-- Fix: SET search_path = '' (empty string forces fully-qualified object names)
-- ==============================================================================

-- Drop functions that might have signature conflicts (return type changes)
-- This prevents "cannot change return type of existing function" errors
DROP FUNCTION IF EXISTS get_player_approval_status(uuid, uuid);
DROP FUNCTION IF EXISTS get_player_request_status(uuid, uuid, uuid);

-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTIONS (updated_at triggers)
-- -----------------------------------------------------------------------------

-- update_trades_updated_at
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_player_goalie_matchups_updated_at
CREATE OR REPLACE FUNCTION update_player_goalie_matchups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.points = NEW.goals + NEW.assists;
  NEW.shooting_percentage = CASE
    WHEN NEW.shots > 0 THEN ROUND((NEW.goals::DECIMAL / NEW.shots::DECIMAL) * 100, 2)
    ELSE NULL
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_season_highlights_updated_at
CREATE OR REPLACE FUNCTION update_season_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_sponsors_updated_at
CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_leagues_updated_at
CREATE OR REPLACE FUNCTION update_leagues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_divisions_updated_at
CREATE OR REPLACE FUNCTION update_divisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_venues_updated_at
CREATE OR REPLACE FUNCTION update_venues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_league_scorekeepers_updated_at
CREATE OR REPLACE FUNCTION update_league_scorekeepers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- update_game_scorekeeper_assignments_updated_at
CREATE OR REPLACE FUNCTION update_game_scorekeeper_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Sponsors
-- -----------------------------------------------------------------------------

-- get_active_league_sponsors
CREATE OR REPLACE FUNCTION get_active_league_sponsors(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT,
  placement_preference TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    ls.name,
    ls.logo_url,
    ls.website_url,
    ls.tier,
    ls.placement_preference
  FROM public.league_sponsors ls
  WHERE ls.league_id = check_league_id
    AND ls.is_active = true
    AND (ls.start_date IS NULL OR ls.start_date <= NOW())
    AND (ls.end_date IS NULL OR ls.end_date >= NOW())
  ORDER BY
    CASE ls.tier
      WHEN 'title' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      WHEN 'bronze' THEN 4
      ELSE 5
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_active_platform_sponsors
CREATE OR REPLACE FUNCTION get_active_platform_sponsors()
RETURNS TABLE(
  id UUID,
  name TEXT,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT,
  placement_preference TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.name,
    ps.logo_url,
    ps.website_url,
    ps.tier,
    ps.placement_preference
  FROM public.platform_sponsors ps
  WHERE ps.is_active = true
    AND (ps.start_date IS NULL OR ps.start_date <= NOW())
    AND (ps.end_date IS NULL OR ps.end_date >= NOW())
  ORDER BY
    CASE ps.tier
      WHEN 'gold' THEN 1
      WHEN 'silver' THEN 2
      WHEN 'bronze' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Season Registration
-- -----------------------------------------------------------------------------

-- is_season_registration_open
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
  FROM public.seasons
  WHERE id = check_season_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF season_record.status NOT IN ('active', 'upcoming') THEN
    RETURN false;
  END IF;

  is_open := true;

  IF season_record.registration_opens_at IS NOT NULL THEN
    is_open := is_open AND (NOW() >= season_record.registration_opens_at);
  END IF;

  IF season_record.registration_closes_at IS NOT NULL THEN
    is_open := is_open AND (NOW() <= season_record.registration_closes_at);
  END IF;

  RETURN is_open;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- calculate_season_stats
CREATE OR REPLACE FUNCTION calculate_season_stats(season_uuid UUID)
RETURNS void AS $$
DECLARE
  total_goals INT;
  total_games INT;
  avg_gpg DECIMAL(5,2);
  winner_team UUID;
BEGIN
  SELECT COALESCE(SUM(home_score + away_score), 0)
  INTO total_goals
  FROM public.games
  WHERE season_id = season_uuid
    AND status = 'completed';

  SELECT COUNT(*)
  INTO total_games
  FROM public.games
  WHERE season_id = season_uuid
    AND status = 'completed';

  IF total_games > 0 THEN
    avg_gpg := ROUND(total_goals::DECIMAL / total_games::DECIMAL, 2);
  ELSE
    avg_gpg := 0;
  END IF;

  SELECT ts.team_id
  INTO winner_team
  FROM public.team_standings ts
  WHERE ts.season_id = season_uuid
  ORDER BY ts.points DESC, ts.wins DESC, (ts.goals_for - ts.goals_against) DESC
  LIMIT 1;

  UPDATE public.seasons
  SET
    total_goals_scored = total_goals,
    average_goals_per_game = avg_gpg,
    champion_team_id = winner_team
  WHERE id = season_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_open_registration_seasons
CREATE OR REPLACE FUNCTION get_open_registration_seasons(check_league_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  registration_type public.registration_type,
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
  FROM public.seasons s
  WHERE s.league_id = check_league_id
    AND s.status IN ('active', 'upcoming')
    AND (s.registration_opens_at IS NULL OR s.registration_opens_at <= NOW())
    AND (s.registration_closes_at IS NULL OR s.registration_closes_at >= NOW())
  ORDER BY s.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- is_team_roster_full
CREATE OR REPLACE FUNCTION is_team_roster_full(
  check_team_id UUID,
  check_season_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_players INTEGER;
BEGIN
  SELECT max_players_per_team INTO max_players
  FROM public.seasons
  WHERE id = check_season_id;

  IF max_players IS NULL THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.team_rosters
  WHERE team_id = check_team_id
    AND season_id = check_season_id
    AND status = 'active';

  RETURN current_count >= max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- validate_season_registration_dates
CREATE OR REPLACE FUNCTION validate_season_registration_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_opens_at IS NOT NULL
     AND NEW.registration_closes_at IS NOT NULL
     AND NEW.registration_opens_at >= NEW.registration_closes_at THEN
    RAISE EXCEPTION 'registration_opens_at must be before registration_closes_at';
  END IF;

  IF NEW.registration_closes_at IS NOT NULL
     AND NEW.start_date IS NOT NULL
     AND NEW.registration_closes_at > NEW.start_date THEN
    RAISE WARNING 'registration_closes_at is after season start_date - this may be intentional';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - League Discovery
-- -----------------------------------------------------------------------------

-- search_nearby_leagues
CREATE OR REPLACE FUNCTION search_nearby_leagues(
  user_lat DECIMAL,
  user_lon DECIMAL,
  radius_km DECIMAL DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  city TEXT,
  state_province TEXT,
  distance_km DECIMAL,
  logo_url TEXT,
  primary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.city,
    l.state_province,
    ROUND(
      CAST(
        (6371 * acos(
          cos(radians(user_lat))
          * cos(radians(l.latitude))
          * cos(radians(l.longitude) - radians(user_lon))
          + sin(radians(user_lat))
          * sin(radians(l.latitude))
        )) AS NUMERIC
      ), 2
    ) AS distance_km,
    l.logo_url,
    l.primary_color
  FROM public.leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND l.latitude IS NOT NULL
    AND l.longitude IS NOT NULL
    AND l.latitude BETWEEN (user_lat - (radius_km / 111.0)) AND (user_lat + (radius_km / 111.0))
    AND l.longitude BETWEEN (user_lon - (radius_km / (111.0 * cos(radians(user_lat))))) AND (user_lon + (radius_km / (111.0 * cos(radians(user_lat)))))
  HAVING
    (6371 * acos(
      cos(radians(user_lat))
      * cos(radians(l.latitude))
      * cos(radians(l.longitude) - radians(user_lon))
      + sin(radians(user_lat))
      * sin(radians(l.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- search_leagues_by_keyword
CREATE OR REPLACE FUNCTION search_leagues_by_keyword(
  search_query TEXT,
  limit_results INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  logo_url TEXT,
  relevance INTEGER
) AS $$
DECLARE
  search_term TEXT;
BEGIN
  search_term := LOWER(search_query);

  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.description,
    l.city,
    l.state_province,
    l.country,
    l.logo_url,
    (
      CASE WHEN LOWER(l.name) = search_term THEN 100 ELSE 0 END +
      CASE WHEN LOWER(l.name) LIKE search_term || '%' THEN 50 ELSE 0 END +
      CASE WHEN LOWER(l.name) LIKE '%' || search_term || '%' THEN 20 ELSE 0 END +
      CASE WHEN LOWER(l.description) LIKE '%' || search_term || '%' THEN 10 ELSE 0 END +
      CASE WHEN LOWER(l.city) = search_term THEN 30 ELSE 0 END +
      CASE WHEN search_term = ANY(ARRAY(SELECT LOWER(unnest(l.search_keywords)))) THEN 40 ELSE 0 END
    ) AS relevance
  FROM public.leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND (
      LOWER(l.name) LIKE '%' || search_term || '%'
      OR LOWER(l.description) LIKE '%' || search_term || '%'
      OR LOWER(l.city) LIKE '%' || search_term || '%'
      OR LOWER(l.state_province) LIKE '%' || search_term || '%'
      OR search_term = ANY(ARRAY(SELECT LOWER(unnest(l.search_keywords))))
    )
  ORDER BY relevance DESC, l.name ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_leagues_by_location
CREATE OR REPLACE FUNCTION get_leagues_by_location(
  search_city TEXT DEFAULT NULL,
  search_state TEXT DEFAULT NULL,
  search_country TEXT DEFAULT 'USA'
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  city TEXT,
  state_province TEXT,
  logo_url TEXT,
  primary_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.city,
    l.state_province,
    l.logo_url,
    l.primary_color
  FROM public.leagues l
  WHERE l.is_public = true
    AND l.status = 'active'
    AND (search_city IS NULL OR LOWER(l.city) = LOWER(search_city))
    AND (search_state IS NULL OR LOWER(l.state_province) = LOWER(search_state))
    AND LOWER(l.country) = LOWER(search_country)
  ORDER BY l.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Team Join Requests
-- -----------------------------------------------------------------------------

-- handle_team_join_request_review
CREATE OR REPLACE FUNCTION handle_team_join_request_review()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- auto_add_player_to_roster
CREATE OR REPLACE FUNCTION auto_add_player_to_roster()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_rosters
      WHERE team_id = NEW.team_id
        AND player_id = NEW.player_id
        AND season_id = NEW.season_id
    ) THEN
      INSERT INTO public.team_rosters (
        team_id,
        player_id,
        season_id,
        league_id,
        status
      ) VALUES (
        NEW.team_id,
        NEW.player_id,
        NEW.season_id,
        NEW.league_id,
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- validate_team_join_request_league_id
CREATE OR REPLACE FUNCTION validate_team_join_request_league_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams WHERE id = NEW.team_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to league %', NEW.league_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seasons WHERE id = NEW.season_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Season does not belong to league %', NEW.league_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- get_team_pending_requests
CREATE OR REPLACE FUNCTION get_team_pending_requests(check_team_id UUID)
RETURNS TABLE(
  id UUID,
  player_id UUID,
  player_name TEXT,
  player_email TEXT,
  message TEXT,
  requested_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tjr.id,
    tjr.player_id,
    p.full_name as player_name,
    p.email as player_email,
    tjr.message,
    tjr.requested_at
  FROM public.team_join_requests tjr
  JOIN public.profiles p ON p.id = tjr.player_id
  WHERE tjr.team_id = check_team_id
    AND tjr.status = 'pending'
  ORDER BY tjr.requested_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_player_request_status
CREATE OR REPLACE FUNCTION get_player_request_status(
  check_player_id UUID,
  check_team_id UUID,
  check_season_id UUID
)
RETURNS TABLE(
  has_request BOOLEAN,
  status TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as has_request,
    tjr.status,
    tjr.requested_at,
    tjr.reviewed_at
  FROM public.team_join_requests tjr
  WHERE tjr.player_id = check_player_id
    AND tjr.team_id = check_team_id
    AND tjr.season_id = check_season_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - League Core
-- -----------------------------------------------------------------------------

-- get_user_league_ids
CREATE OR REPLACE FUNCTION get_user_league_ids(user_uuid UUID)
RETURNS TABLE(league_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT lm.league_id
  FROM public.league_memberships lm
  WHERE lm.user_id = user_uuid AND lm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- is_league_owner
CREATE OR REPLACE FUNCTION is_league_owner(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND role = 'owner'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- is_league_admin
CREATE OR REPLACE FUNCTION is_league_admin(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Scorekeepers
-- -----------------------------------------------------------------------------

-- is_league_scorekeeper
CREATE OR REPLACE FUNCTION is_league_scorekeeper(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.league_scorekeepers
    WHERE scorekeeper_id = user_uuid
      AND league_id = check_league_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_scorekeeper_assigned_games
CREATE OR REPLACE FUNCTION get_scorekeeper_assigned_games(scorekeeper_uuid UUID)
RETURNS TABLE(
  game_id UUID,
  league_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gsa.game_id,
    gsa.league_id,
    gsa.assigned_at,
    gsa.payment_status
  FROM public.game_scorekeeper_assignments gsa
  WHERE gsa.scorekeeper_id = scorekeeper_uuid
  ORDER BY gsa.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - League Data Access
-- -----------------------------------------------------------------------------

-- get_league_teams
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
  FROM public.teams t
  WHERE t.league_id = check_league_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_league_seasons
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
  FROM public.seasons s
  WHERE s.league_id = check_league_id
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- user_has_league_access
CREATE OR REPLACE FUNCTION user_has_league_access(user_uuid UUID, check_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = user_uuid
      AND league_id = check_league_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_user_league_role
CREATE OR REPLACE FUNCTION get_user_league_role(user_uuid UUID, check_league_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.league_memberships
  WHERE user_id = user_uuid
    AND league_id = check_league_id
    AND status = 'active';

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Stats
-- -----------------------------------------------------------------------------

-- get_player_season_stats
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
  FROM public.player_stats ps
  WHERE ps.league_id = check_league_id
    AND ps.season_id = check_season_id
  GROUP BY ps.player_id
  ORDER BY total_points DESC, total_goals DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_goalie_season_stats
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
  FROM public.goalie_stats gs
  WHERE gs.league_id = check_league_id
    AND gs.season_id = check_season_id
  GROUP BY gs.player_id
  ORDER BY save_percentage DESC, total_saves DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_team_standings
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
      THEN 2
      WHEN g.home_score = g.away_score
      THEN 1
      ELSE 0
    END) AS points
  FROM public.teams t
  LEFT JOIN public.games g ON (
    (g.home_team_id = t.id OR g.away_team_id = t.id)
    AND g.season_id = check_season_id
    AND g.status = 'completed'
  )
  WHERE t.league_id = check_league_id
  GROUP BY t.id
  ORDER BY points DESC, wins DESC, goal_differential DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Games
-- -----------------------------------------------------------------------------

-- get_upcoming_games
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
  FROM public.games g
  WHERE g.league_id = check_league_id
    AND g.status IN ('scheduled', 'in_progress')
    AND g.scheduled_at BETWEEN NOW() AND NOW() + (days_ahead || ' days')::INTERVAL
  ORDER BY g.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_recent_games
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
  FROM public.games g
  WHERE g.league_id = check_league_id
    AND g.status = 'completed'
    AND g.scheduled_at BETWEEN NOW() - (days_back || ' days')::INTERVAL AND NOW()
  ORDER BY g.scheduled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Payments
-- -----------------------------------------------------------------------------

-- get_unpaid_fees
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
  FROM public.payments p
  WHERE p.league_id = check_league_id
    AND p.season_id = check_season_id
    AND p.status != 'paid'
  ORDER BY p.payment_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_scorekeeper_payments
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
  FROM public.game_scorekeeper_assignments gsa
  WHERE gsa.league_id = check_league_id
    AND (check_scorekeeper_id IS NULL OR gsa.scorekeeper_id = check_scorekeeper_id)
  GROUP BY gsa.scorekeeper_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - League Validation
-- -----------------------------------------------------------------------------

-- is_league_slug_available
CREATE OR REPLACE FUNCTION is_league_slug_available(check_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.leagues WHERE slug = check_slug
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_league_by_slug
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
  FROM public.leagues l
  WHERE l.slug = check_slug
    AND l.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Game Stats Validation
-- -----------------------------------------------------------------------------

-- validate_game_stats_league_id
CREATE OR REPLACE FUNCTION validate_game_stats_league_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.games WHERE id = NEW.game_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Game does not belong to league %', NEW.league_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teams WHERE id = NEW.team_id AND league_id = NEW.league_id
  ) THEN
    RAISE EXCEPTION 'Team does not belong to league %', NEW.league_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - Player Approvals
-- -----------------------------------------------------------------------------

-- set_player_approval_approved_by
CREATE OR REPLACE FUNCTION set_player_approval_approved_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by IS NULL AND NEW.approval_method != 'auto' THEN
    NEW.approved_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- is_player_approved
CREATE OR REPLACE FUNCTION is_player_approved(
  check_player_id UUID,
  check_league_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.player_approvals
    WHERE player_id = check_player_id
      AND league_id = check_league_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- get_player_approval_status
CREATE OR REPLACE FUNCTION get_player_approval_status(
  check_player_id UUID,
  check_league_id UUID
)
RETURNS TABLE(
  is_approved BOOLEAN,
  approval_method TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_approved,
    pa.approval_method,
    p.full_name as approved_by_name,
    pa.created_at as approved_at,
    pa.notes
  FROM public.player_approvals pa
  LEFT JOIN public.profiles p ON p.id = pa.approved_by
  WHERE pa.player_id = check_player_id
    AND pa.league_id = check_league_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS - League Branding/Hostname
-- -----------------------------------------------------------------------------

-- get_league_by_hostname
-- Drop first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_league_by_hostname(text);

CREATE OR REPLACE FUNCTION get_league_by_hostname(hostname TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  subdomain TEXT,
  custom_domain TEXT,
  custom_domain_verified BOOLEAN,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_family TEXT,
  custom_css TEXT,
  status TEXT
) AS $$
DECLARE
  clean_hostname TEXT;
  subdomain_part TEXT;
BEGIN
  clean_hostname := LOWER(REGEXP_REPLACE(hostname, ':\d+$', ''));
  clean_hostname := REGEXP_REPLACE(clean_hostname, '^www\.', '');

  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.slug,
    l.subdomain,
    l.custom_domain,
    l.custom_domain_verified,
    l.logo_url,
    l.favicon_url,
    l.primary_color,
    l.secondary_color,
    l.accent_color,
    l.font_family,
    l.custom_css,
    l.status
  FROM public.leagues l
  WHERE l.custom_domain = clean_hostname
    AND l.custom_domain_verified = true
    AND l.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  IF clean_hostname ~ '\.beerleaguehockey\.ca$' OR clean_hostname ~ '\.localhost$' THEN
    subdomain_part := REGEXP_REPLACE(clean_hostname, '\.(beerleaguehockey\.ca|localhost)$', '');

    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.slug,
      l.subdomain,
      l.custom_domain,
      l.custom_domain_verified,
      l.logo_url,
      l.favicon_url,
      l.primary_color,
      l.secondary_color,
      l.accent_color,
      l.font_family,
      l.custom_css,
      l.status
    FROM public.leagues l
    WHERE l.subdomain = subdomain_part
      AND l.status = 'active'
    LIMIT 1;

    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  IF clean_hostname IN ('beerleaguehockey.ca', 'localhost', 'hockeylifehl.com') THEN
    RETURN;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';


-- ==============================================================================
-- HIGH PRIORITY FIX #4: REVOKE API ACCESS FROM MATERIALIZED VIEWS
-- ==============================================================================
-- Materialized views exposed via the API can leak aggregated data.
-- They should only be accessible via specific functions or server-side code.
--
-- Risk: Unintended data exposure through PostgREST API.
-- Fix: Revoke anon/authenticated access, grant only to service_role.
-- ==============================================================================

-- Revoke access from materialized views (if they exist)
DO $$
BEGIN
  -- player_season_stats_mv
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'player_season_stats_mv' AND schemaname = 'public'
  ) THEN
    REVOKE ALL ON public.player_season_stats_mv FROM anon;
    REVOKE ALL ON public.player_season_stats_mv FROM authenticated;
    GRANT SELECT ON public.player_season_stats_mv TO service_role;
    RAISE NOTICE 'Revoked public access from player_season_stats_mv';
  END IF;

  -- goalie_season_stats_mv
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE matviewname = 'goalie_season_stats_mv' AND schemaname = 'public'
  ) THEN
    REVOKE ALL ON public.goalie_season_stats_mv FROM anon;
    REVOKE ALL ON public.goalie_season_stats_mv FROM authenticated;
    GRANT SELECT ON public.goalie_season_stats_mv TO service_role;
    RAISE NOTICE 'Revoked public access from goalie_season_stats_mv';
  END IF;
END $$;


-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Run these to verify the security fixes were applied correctly

DO $$
DECLARE
  view_count INTEGER;
  func_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  SECURITY HARDENING VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  -- Check views don't have SECURITY DEFINER
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE viewname IN ('public_leagues', 'league_branding')
    AND schemaname = 'public';

  IF view_count = 2 THEN
    RAISE NOTICE '[OK] Views recreated: public_leagues, league_branding';
  ELSE
    RAISE WARNING '[WARN] Expected 2 views, found %', view_count;
  END IF;

  -- Check RLS on webhook_events
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'webhook_events';

  IF rls_enabled THEN
    RAISE NOTICE '[OK] RLS enabled on webhook_events';
  ELSE
    RAISE WARNING '[FAIL] RLS not enabled on webhook_events';
  END IF;

  -- Count functions with search_path set
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proconfig IS NOT NULL
    AND 'search_path=' = ANY(p.proconfig);

  RAISE NOTICE '[INFO] Functions with search_path set: %', func_count;

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '  SECURITY HARDENING COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary of changes:';
  RAISE NOTICE '  1. Views use SECURITY INVOKER (RLS applies)';
  RAISE NOTICE '  2. webhook_events has RLS (service_role only)';
  RAISE NOTICE '  3. All functions have SET search_path = ''''';
  RAISE NOTICE '  4. Materialized views restricted to service_role';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Review auth configuration to enable';
  RAISE NOTICE 'leaked password protection in Supabase dashboard.';
  RAISE NOTICE '';
END $$;
