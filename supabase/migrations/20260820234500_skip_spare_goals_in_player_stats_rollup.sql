-- Prevent spare/team-only goals from aborting the season player-stat rollup.
-- Preserve period-assist breakdowns for players whose only events were assists.

BEGIN;

CREATE OR REPLACE FUNCTION public.rollup_player_season_stats(p_season_id uuid, p_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing player_stats for this season/league so we can recalculate cleanly
  DELETE FROM player_stats
  WHERE season_id = p_season_id
    AND league_id = p_league_id;

  -- Insert aggregated stats from game_events for completed games
  INSERT INTO player_stats (
    game_id, player_id, team_id, season_id, league_id,
    goals, assists, penalty_minutes,
    power_play_goals, power_play_assists,
    short_handed_goals, short_handed_assists,
    empty_net_goals, shots,
    plus_minus,
    period_1_goals, period_1_assists,
    period_2_goals, period_2_assists,
    period_3_goals, period_3_assists,
    ot_goals, ot_assists
  )
  SELECT
    ge_agg.game_id,
    ge_agg.player_id,
    ge_agg.team_id,
    g.season_id,
    g.league_id,
    -- Goals
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' THEN 1 ELSE 0 END), 0),
    -- Assists (count times this player was assist1 or assist2 on ANY goal in this game)
    COALESCE((
      SELECT COUNT(*)
      FROM game_events a
      WHERE a.game_id = ge_agg.game_id
        AND a.event_type = 'goal'
        AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    -- Penalty minutes
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'penalty' THEN ge_agg.penalty_minutes ELSE 0 END), 0),
    -- Power play goals
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.is_power_play = true THEN 1 ELSE 0 END), 0),
    -- Power play assists
    COALESCE((
      SELECT COUNT(*)
      FROM game_events a
      WHERE a.game_id = ge_agg.game_id
        AND a.event_type = 'goal'
        AND a.is_power_play = true
        AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    -- Short-handed goals
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.is_short_handed = true THEN 1 ELSE 0 END), 0),
    -- Short-handed assists
    COALESCE((
      SELECT COUNT(*)
      FROM game_events a
      WHERE a.game_id = ge_agg.game_id
        AND a.event_type = 'goal'
        AND a.is_short_handed = true
        AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    -- Empty net goals
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.is_empty_net = true THEN 1 ELSE 0 END), 0),
    -- Shots (goals count as shots too)
    COALESCE(SUM(CASE WHEN ge_agg.event_type IN ('goal', 'shot') THEN 1 ELSE 0 END), 0),
    -- Plus/minus (placeholder 0 - calculated separately below)
    0,
    -- Period breakdowns
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.period = 1 THEN 1 ELSE 0 END), 0),
    COALESCE((
      SELECT COUNT(*) FROM game_events a
      WHERE a.game_id = ge_agg.game_id AND a.event_type = 'goal' AND a.period = 1 AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.period = 2 THEN 1 ELSE 0 END), 0),
    COALESCE((
      SELECT COUNT(*) FROM game_events a
      WHERE a.game_id = ge_agg.game_id AND a.event_type = 'goal' AND a.period = 2 AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.period = 3 THEN 1 ELSE 0 END), 0),
    COALESCE((
      SELECT COUNT(*) FROM game_events a
      WHERE a.game_id = ge_agg.game_id AND a.event_type = 'goal' AND a.period = 3 AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0),
    -- OT
    COALESCE(SUM(CASE WHEN ge_agg.event_type = 'goal' AND ge_agg.period > 3 THEN 1 ELSE 0 END), 0),
    COALESCE((
      SELECT COUNT(*) FROM game_events a
      WHERE a.game_id = ge_agg.game_id AND a.event_type = 'goal' AND a.period > 3 AND a.deleted_at IS NULL
        AND (a.assist1_player_id = ge_agg.player_id OR a.assist2_player_id = ge_agg.player_id)
    ), 0)
  FROM game_events ge_agg
  JOIN games g ON g.id = ge_agg.game_id
  WHERE g.season_id = p_season_id
    AND g.league_id = p_league_id
    AND g.status = 'completed'
    AND ge_agg.deleted_at IS NULL
    AND ge_agg.player_id IS NOT NULL
    AND ge_agg.event_type IN ('goal', 'penalty', 'shot')
  GROUP BY ge_agg.game_id, ge_agg.player_id, ge_agg.team_id, g.season_id, g.league_id
  ON CONFLICT (game_id, player_id)
  DO UPDATE SET
    goals = EXCLUDED.goals,
    assists = EXCLUDED.assists,
    penalty_minutes = EXCLUDED.penalty_minutes,
    power_play_goals = EXCLUDED.power_play_goals,
    power_play_assists = EXCLUDED.power_play_assists,
    short_handed_goals = EXCLUDED.short_handed_goals,
    short_handed_assists = EXCLUDED.short_handed_assists,
    empty_net_goals = EXCLUDED.empty_net_goals,
    shots = EXCLUDED.shots,
    period_1_goals = EXCLUDED.period_1_goals,
    period_1_assists = EXCLUDED.period_1_assists,
    period_2_goals = EXCLUDED.period_2_goals,
    period_2_assists = EXCLUDED.period_2_assists,
    period_3_goals = EXCLUDED.period_3_goals,
    period_3_assists = EXCLUDED.period_3_assists,
    ot_goals = EXCLUDED.ot_goals,
    ot_assists = EXCLUDED.ot_assists;

  -- Also insert records for players who ONLY had assists (not goals/penalties/shots)
  -- These players wouldn't appear in the main query above
  INSERT INTO player_stats (
    game_id, player_id, team_id, season_id, league_id,
    goals, assists, penalty_minutes,
    power_play_goals, power_play_assists,
    short_handed_goals, short_handed_assists,
    empty_net_goals, shots, plus_minus,
    period_1_assists, period_2_assists, period_3_assists, ot_assists
  )
  SELECT DISTINCT
    a.game_id,
    assist_pid,
    -- Get team from the goal event's team (assist player is on same team as scorer)
    a.team_id,
    g.season_id,
    g.league_id,
    0, -- goals
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    0, 0, -- pim, ppg
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.is_power_play = true AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    0, -- shg
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.is_short_handed = true AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    0, 0, 0, -- eng, shots, plus_minus
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.period = 1 AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.period = 2 AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.period = 3 AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid)),
    (SELECT COUNT(*) FROM game_events a2
     WHERE a2.game_id = a.game_id AND a2.event_type = 'goal' AND a2.period > 3 AND a2.deleted_at IS NULL
       AND (a2.assist1_player_id = assist_pid OR a2.assist2_player_id = assist_pid))
  FROM (
    SELECT game_id, team_id, assist1_player_id AS assist_pid
    FROM game_events
    WHERE event_type = 'goal' AND assist1_player_id IS NOT NULL AND deleted_at IS NULL
    UNION
    SELECT game_id, team_id, assist2_player_id AS assist_pid
    FROM game_events
    WHERE event_type = 'goal' AND assist2_player_id IS NOT NULL AND deleted_at IS NULL
  ) a
  JOIN games g ON g.id = a.game_id
  WHERE g.season_id = p_season_id
    AND g.league_id = p_league_id
    AND g.status = 'completed'
  ON CONFLICT (game_id, player_id) DO NOTHING; -- Already inserted in main query
END;
$function$;

REVOKE ALL ON FUNCTION public.rollup_player_season_stats(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rollup_player_season_stats(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.rollup_player_season_stats(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rollup_player_season_stats(uuid, uuid) TO service_role;

COMMIT;
