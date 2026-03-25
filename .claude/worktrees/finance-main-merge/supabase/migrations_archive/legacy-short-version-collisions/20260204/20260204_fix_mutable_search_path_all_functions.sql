-- =============================================================================
-- Migration: fix_mutable_search_path_all_functions
-- Purpose: Pin search_path on all 17 public functions to prevent privilege
--          escalation via search_path manipulation.
-- Risk: Functions with SECURITY DEFINER and no explicit search_path allow an
--        attacker to create objects in a higher-priority schema, hijacking
--        table/function references and executing arbitrary SQL with the
--        function owner's privileges (typically postgres/superuser).
-- Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. set_updated_at_metadata() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return NEW;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. calculate_installment_amount() -- pure function, INVOKER, IMMUTABLE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_installment_amount(
  p_total_amount_cents integer,
  p_total_installments integer,
  p_installment_number integer
)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
DECLARE
  base_installment INTEGER;
  remainder INTEGER;
BEGIN
  IF p_total_installments <= 0 THEN
    RETURN p_total_amount_cents;
  END IF;

  base_installment := p_total_amount_cents / p_total_installments;
  remainder := p_total_amount_cents % p_total_installments;

  -- Add remainder to last installment
  IF p_installment_number = p_total_installments AND remainder > 0 THEN
    RETURN base_installment + remainder;
  END IF;

  RETURN base_installment;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. increment_game_score() -- SECURITY DEFINER (CRITICAL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_game_score(p_game_id uuid, p_team_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_team_type = 'home' THEN
    UPDATE games SET home_score = COALESCE(home_score, 0) + 1 WHERE id = p_game_id;
  ELSE
    UPDATE games SET away_score = COALESCE(away_score, 0) + 1 WHERE id = p_game_id;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. set_updated_at() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
begin
  new._updated_at = now();
  return NEW;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5. rollup_game_stats() -- SECURITY DEFINER (CRITICAL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollup_game_stats(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_game RECORD;
  v_league_id UUID;
  v_season_id UUID;
  v_event RECORD;
BEGIN
  -- Get game info
  SELECT
    g.id, g.league_id, g.season_id, g.home_team_id, g.away_team_id,
    g.home_score, g.away_score
  INTO v_game
  FROM games g
  WHERE g.id = p_game_id;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  v_league_id := v_game.league_id;
  v_season_id := v_game.season_id;

  -- Calculate scores from events
  UPDATE games
  SET
    home_score = (
      SELECT COUNT(*)
      FROM game_events
      WHERE game_id = p_game_id
        AND team_type = 'home'
        AND event_type = 'goal'
        AND deleted_at IS NULL
    ),
    away_score = (
      SELECT COUNT(*)
      FROM game_events
      WHERE game_id = p_game_id
        AND team_type = 'away'
        AND event_type = 'goal'
        AND deleted_at IS NULL
    ),
    status = 'completed'
  WHERE id = p_game_id;

  -- Re-fetch game with updated scores
  SELECT home_score, away_score INTO v_game.home_score, v_game.away_score
  FROM games WHERE id = p_game_id;

  -- Roll up individual player stats (goals)
  FOR v_event IN
    SELECT player_id, COUNT(*) as goals
    FROM game_events
    WHERE game_id = p_game_id
      AND event_type = 'goal'
      AND deleted_at IS NULL
    GROUP BY player_id
  LOOP
    INSERT INTO game_stats (
      game_id, player_id, league_id, stat_type, value,
      team_id, entered_by
    )
    SELECT
      p_game_id, v_event.player_id, v_league_id, 'Goal', v_event.goals,
      COALESCE(
        (SELECT team_id FROM game_events WHERE game_id = p_game_id AND player_id = v_event.player_id LIMIT 1),
        v_game.home_team_id
      ),
      '00000000-0000-0000-0000-000000000000'
    ON CONFLICT (game_id, player_id, stat_type)
    DO UPDATE SET value = EXCLUDED.value;
  END LOOP;

  -- Roll up individual player stats (assists)
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    assist_player_id,
    v_league_id,
    'Assist',
    COUNT(*),
    COALESCE(
      (SELECT team_id FROM game_events ge2 WHERE ge2.game_id = p_game_id AND ge2.player_id = assist_player_id LIMIT 1),
      v_game.home_team_id
    ),
    '00000000-0000-0000-0000-000000000000'
  FROM (
    SELECT assist1_player_id as assist_player_id, team_id
    FROM game_events
    WHERE game_id = p_game_id
      AND event_type = 'goal'
      AND assist1_player_id IS NOT NULL
      AND deleted_at IS NULL
    UNION ALL
    SELECT assist2_player_id as assist_player_id, team_id
    FROM game_events
    WHERE game_id = p_game_id
      AND event_type = 'goal'
      AND assist2_player_id IS NOT NULL
      AND deleted_at IS NULL
  ) assists
  GROUP BY assist_player_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Roll up penalty minutes
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    player_id,
    v_league_id,
    'PIM',
    SUM(penalty_minutes),
    team_id,
    '00000000-0000-0000-0000-000000000000'
  FROM game_events
  WHERE game_id = p_game_id
    AND event_type = 'penalty'
    AND deleted_at IS NULL
  GROUP BY player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Roll up saves
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    player_id,
    v_league_id,
    'Save',
    COUNT(*),
    team_id,
    '00000000-0000-0000-0000-000000000000'
  FROM game_events
  WHERE game_id = p_game_id
    AND event_type = 'save'
    AND deleted_at IS NULL
  GROUP BY player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Update team standings
  -- Home team
  INSERT INTO team_standings (
    team_id, league_id, season_id,
    games_played, wins, losses, ties, overtime_losses,
    goals_for, goals_against, points
  )
  VALUES (
    v_game.home_team_id, v_league_id, v_season_id,
    1,
    CASE WHEN v_game.home_score > v_game.away_score THEN 1 ELSE 0 END,
    CASE WHEN v_game.home_score < v_game.away_score THEN 1 ELSE 0 END,
    CASE WHEN v_game.home_score = v_game.away_score THEN 1 ELSE 0 END,
    0,
    v_game.home_score,
    v_game.away_score,
    CASE
      WHEN v_game.home_score > v_game.away_score THEN 2
      WHEN v_game.home_score = v_game.away_score THEN 1
      ELSE 0
    END
  )
  ON CONFLICT (team_id, league_id, season_id)
  DO UPDATE SET
    games_played = team_standings.games_played + 1,
    wins = team_standings.wins + CASE WHEN v_game.home_score > v_game.away_score THEN 1 ELSE 0 END,
    losses = team_standings.losses + CASE WHEN v_game.home_score < v_game.away_score THEN 1 ELSE 0 END,
    ties = team_standings.ties + CASE WHEN v_game.home_score = v_game.away_score THEN 1 ELSE 0 END,
    goals_for = team_standings.goals_for + v_game.home_score,
    goals_against = team_standings.goals_against + v_game.away_score,
    points = team_standings.points + CASE
      WHEN v_game.home_score > v_game.away_score THEN 2
      WHEN v_game.home_score = v_game.away_score THEN 1
      ELSE 0
    END,
    updated_at = NOW();

  -- Away team
  INSERT INTO team_standings (
    team_id, league_id, season_id,
    games_played, wins, losses, ties, overtime_losses,
    goals_for, goals_against, points
  )
  VALUES (
    v_game.away_team_id, v_league_id, v_season_id,
    1,
    CASE WHEN v_game.away_score > v_game.home_score THEN 1 ELSE 0 END,
    CASE WHEN v_game.away_score < v_game.home_score THEN 1 ELSE 0 END,
    CASE WHEN v_game.away_score = v_game.home_score THEN 1 ELSE 0 END,
    0,
    v_game.away_score,
    v_game.home_score,
    CASE
      WHEN v_game.away_score > v_game.home_score THEN 2
      WHEN v_game.away_score = v_game.home_score THEN 1
      ELSE 0
    END
  )
  ON CONFLICT (team_id, league_id, season_id)
  DO UPDATE SET
    games_played = team_standings.games_played + 1,
    wins = team_standings.wins + CASE WHEN v_game.away_score > v_game.home_score THEN 1 ELSE 0 END,
    losses = team_standings.losses + CASE WHEN v_game.away_score < v_game.home_score THEN 1 ELSE 0 END,
    ties = team_standings.ties + CASE WHEN v_game.away_score = v_game.home_score THEN 1 ELSE 0 END,
    goals_for = team_standings.goals_for + v_game.away_score,
    goals_against = team_standings.goals_against + v_game.home_score,
    points = team_standings.points + CASE
      WHEN v_game.away_score > v_game.home_score THEN 2
      WHEN v_game.away_score = v_game.home_score THEN 1
      ELSE 0
    END,
    updated_at = NOW();

END;
$function$;

-- ---------------------------------------------------------------------------
-- 6. generate_verification_token() -- INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_verification_token()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Generate a random 32-character token
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. increment_draft_state_version() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_draft_state_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.state_version := COALESCE(OLD.state_version, 0) + 1;
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. update_registration_submissions_updated_at() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_registration_submissions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. update_player_payment_status() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_player_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Check if fully paid
  IF NEW.amount_paid_cents >= NEW.total_amount_cents THEN
    NEW.status = 'paid';
    NEW.paid_at = COALESCE(NEW.paid_at, now());
  -- Check if partially paid
  ELSIF NEW.amount_paid_cents > 0 THEN
    NEW.status = 'partially_paid';
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 10. validate_scorekeeper_token() -- SECURITY DEFINER (CRITICAL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_scorekeeper_token(p_token text)
 RETURNS TABLE(session_id uuid, game_id uuid, league_id uuid, is_valid boolean, expires_at timestamp with time zone, game_status text, home_team_name text, away_team_name text, scheduled_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_session RECORD;
BEGIN
  -- Find the session
  SELECT
    ss.*,
    g.status as game_status,
    ht.name as home_team_name,
    at.name as away_team_name,
    g.scheduled_at
  INTO v_session
  FROM scorekeeper_sessions ss
  JOIN games g ON g.id = ss.game_id
  LEFT JOIN teams ht ON ht.id = g.home_team_id
  LEFT JOIN teams at ON at.id = g.away_team_id
  WHERE ss.token = p_token
  AND ss.is_active = true;

  IF v_session IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, false, NULL::TIMESTAMP WITH TIME ZONE,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if expired
  IF v_session.expires_at < NOW() THEN
    RETURN QUERY SELECT
      v_session.id, v_session.game_id, v_session.league_id, false, v_session.expires_at,
      v_session.game_status, v_session.home_team_name, v_session.away_team_name, v_session.scheduled_at;
    RETURN;
  END IF;

  -- Update last accessed
  UPDATE scorekeeper_sessions
  SET
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE id = v_session.id;

  RETURN QUERY SELECT
    v_session.id, v_session.game_id, v_session.league_id, true, v_session.expires_at,
    v_session.game_status, v_session.home_team_name, v_session.away_team_name, v_session.scheduled_at;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 11. check_and_lock_stats() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_lock_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Check if both captains have verified
  IF NEW.home_verified_at IS NOT NULL AND
     NEW.away_verified_at IS NOT NULL AND
     NEW.stats_locked_at IS NULL THEN
    -- Lock the stats
    NEW.stats_locked_at = NOW();

    -- Lock all individual game stats
    UPDATE game_stats
    SET locked = true
    WHERE game_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 12. update_standings_config_updated_at() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_standings_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 13. create_scorekeeper_session() -- SECURITY DEFINER (CRITICAL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_scorekeeper_session(
  p_game_id uuid,
  p_scorekeeper_id uuid DEFAULT NULL::uuid,
  p_expires_hours integer DEFAULT 24
)
 RETURNS TABLE(session_id uuid, token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_league_id UUID;
  v_session_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the league_id from the game
  SELECT g.league_id INTO v_league_id
  FROM games g
  WHERE g.id = p_game_id;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Generate token and expiry
  v_token := generate_scorekeeper_token();
  v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;

  -- Insert the session
  INSERT INTO scorekeeper_sessions (
    token,
    game_id,
    league_id,
    scorekeeper_id,
    created_by,
    expires_at
  ) VALUES (
    v_token,
    p_game_id,
    v_league_id,
    p_scorekeeper_id,
    auth.uid(),
    v_expires_at
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_token, v_expires_at;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 14. trigger_refresh_standings_on_game_complete() -- trigger, INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_refresh_standings_on_game_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM refresh_standings();
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 15. validate_captain_token() -- SECURITY DEFINER (CRITICAL)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_captain_token(p_token text)
 RETURNS TABLE(game_id uuid, team_type text, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_game RECORD;
BEGIN
  -- Find game by token
  SELECT
    g.id,
    CASE
      WHEN g.home_verification_token = p_token THEN 'home'
      WHEN g.away_verification_token = p_token THEN 'away'
      ELSE NULL
    END as team_type,
    g.home_verified_at,
    g.away_verified_at
  INTO v_game
  FROM games g
  WHERE g.home_verification_token = p_token
     OR g.away_verification_token = p_token;

  IF v_game.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_game.id, v_game.team_type, true;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 16. generate_scorekeeper_token() -- INVOKER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_scorekeeper_token()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Generate a URL-safe token (alphanumeric, 16 chars)
  RETURN upper(substr(encode(gen_random_bytes(12), 'base64'), 1, 16));
END;
$function$;

-- ---------------------------------------------------------------------------
-- 17. hash_waiver_content() -- INVOKER, IMMUTABLE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_waiver_content(content text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
BEGIN
  RETURN encode(sha256(content::bytea), 'hex');
END;
$function$;
