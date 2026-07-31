-- Allow admin-entered spare goal events to count toward team score without
-- attributing skater stats to a real or fake player profile.

BEGIN;

ALTER TABLE public.game_events
  ALTER COLUMN player_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.recalculate_game_stats_from_events(p_game_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game RECORD;
  v_old_home_score INT;
  v_old_away_score INT;
  v_new_home_score INT;
  v_new_away_score INT;
BEGIN
  -- Get game info
  SELECT
    g.id, g.league_id, g.season_id, g.home_team_id, g.away_team_id,
    g.home_score, g.away_score, g.status
  INTO v_game
  FROM games g
  WHERE g.id = p_game_id;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  v_old_home_score := v_game.home_score;
  v_old_away_score := v_game.away_score;

  -- Calculate new scores from all non-deleted goal events, including spare goals
  -- where player_id is NULL.
  SELECT COUNT(*) INTO v_new_home_score
  FROM game_events
  WHERE game_id = p_game_id
    AND team_type = 'home'
    AND event_type = 'goal'
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_new_away_score
  FROM game_events
  WHERE game_id = p_game_id
    AND team_type = 'away'
    AND event_type = 'goal'
    AND deleted_at IS NULL;

  -- Update game scores
  UPDATE games
  SET
    home_score = v_new_home_score,
    away_score = v_new_away_score,
    updated_at = NOW()
  WHERE id = p_game_id;

  -- Delete old game_stats for this game
  DELETE FROM game_stats WHERE game_id = p_game_id;

  -- Re-insert goals for real players only. Spare goals intentionally count only
  -- toward the team score and do not create a player stat row.
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id, player_id, v_game.league_id, 'Goal', COUNT(*),
    team_id,
    '00000000-0000-0000-0000-000000000000'
  FROM game_events
  WHERE game_id = p_game_id
    AND event_type = 'goal'
    AND player_id IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Re-insert assists for real players only. Spare assist selections are stored
  -- as NULL and therefore do not create player stat rows.
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    assist_player_id,
    v_game.league_id,
    'Assist',
    COUNT(*),
    team_id,
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
  GROUP BY assist_player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Re-insert PIM for real players only.
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    player_id,
    v_game.league_id,
    'PIM',
    SUM(penalty_minutes),
    team_id,
    '00000000-0000-0000-0000-000000000000'
  FROM game_events
  WHERE game_id = p_game_id
    AND event_type = 'penalty'
    AND player_id IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- Re-insert saves for real players only.
  INSERT INTO game_stats (game_id, player_id, league_id, stat_type, value, team_id, entered_by)
  SELECT
    p_game_id,
    player_id,
    v_game.league_id,
    'Save',
    COUNT(*),
    team_id,
    '00000000-0000-0000-0000-000000000000'
  FROM game_events
  WHERE game_id = p_game_id
    AND event_type = 'save'
    AND player_id IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY player_id, team_id
  ON CONFLICT (game_id, player_id, stat_type)
  DO UPDATE SET value = EXCLUDED.value;

  -- If game is completed, recalculate standings for both teams
  IF v_game.status = 'completed' THEN
    DELETE FROM team_standings
    WHERE season_id = v_game.season_id
      AND league_id = v_game.league_id
      AND team_id IN (v_game.home_team_id, v_game.away_team_id);

    INSERT INTO team_standings (
      team_id, league_id, season_id,
      games_played, wins, losses, ties, overtime_losses,
      goals_for, goals_against, points
    )
    SELECT
      t.team_id,
      v_game.league_id,
      v_game.season_id,
      COUNT(*),
      SUM(CASE WHEN t.goals_for > t.goals_against THEN 1 ELSE 0 END),
      SUM(CASE WHEN t.goals_for < t.goals_against THEN 1 ELSE 0 END),
      SUM(CASE WHEN t.goals_for = t.goals_against THEN 1 ELSE 0 END),
      0,
      SUM(t.goals_for),
      SUM(t.goals_against),
      SUM(CASE
        WHEN t.goals_for > t.goals_against THEN 2
        WHEN t.goals_for = t.goals_against THEN 1
        ELSE 0
      END)
    FROM (
      SELECT
        home_team_id as team_id,
        home_score as goals_for,
        away_score as goals_against
      FROM games
      WHERE season_id = v_game.season_id
        AND league_id = v_game.league_id
        AND status = 'completed'
        AND home_team_id IN (v_game.home_team_id, v_game.away_team_id)
      UNION ALL
      SELECT
        away_team_id as team_id,
        away_score as goals_for,
        home_score as goals_against
      FROM games
      WHERE season_id = v_game.season_id
        AND league_id = v_game.league_id
        AND status = 'completed'
        AND away_team_id IN (v_game.home_team_id, v_game.away_team_id)
    ) t
    GROUP BY t.team_id
    ON CONFLICT (team_id, league_id, season_id)
    DO UPDATE SET
      games_played = EXCLUDED.games_played,
      wins = EXCLUDED.wins,
      losses = EXCLUDED.losses,
      ties = EXCLUDED.ties,
      goals_for = EXCLUDED.goals_for,
      goals_against = EXCLUDED.goals_against,
      points = EXCLUDED.points,
      updated_at = NOW();
  END IF;

  BEGIN
    PERFORM rollup_player_season_stats(v_game.season_id, v_game.league_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    PERFORM rollup_goalie_season_stats(v_game.season_id, v_game.league_id);
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END;
$function$;

COMMIT;
