-- Ensure season completion is never blocked by badge-award drift.
-- This replaces the expanded award_season_badges() implementation with a
-- defensive version that skips best_plus_minus when the underlying stat is
-- unavailable, and makes the trigger non-blocking.

ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'most_assists';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'best_plus_minus';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'penalty_free';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'division_top_scorer';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'division_points_leader';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'division_top_goalie';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'team_mvp';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'rookie_of_the_year';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'hall_of_fame';
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'shutout_king';

CREATE OR REPLACE FUNCTION award_season_badges(
  p_league_id UUID,
  p_season_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_champion_team_id UUID;
  v_summary JSONB := '{}'::jsonb;
  v_count INTEGER;
  v_div RECORD;
  v_has_plus_minus BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_season_stats'
      AND column_name = 'plus_minus'
  ) INTO v_has_plus_minus;

  -- 1. Championship badges
  SELECT s.champion_team_id INTO v_champion_team_id
  FROM seasons s
  WHERE s.id = p_season_id AND s.league_id = p_league_id;

  IF v_champion_team_id IS NOT NULL THEN
    INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
    SELECT
      tr.player_id,
      p_league_id,
      p_season_id,
      tr.team_id,
      'championship',
      jsonb_build_object('team_id', v_champion_team_id)
    FROM team_rosters tr
    WHERE tr.team_id = v_champion_team_id
      AND tr.season_id = p_season_id
    ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_summary := v_summary || jsonb_build_object('championship', v_count);
  ELSE
    v_summary := v_summary || jsonb_build_object('championship', 0);
  END IF;

  -- 2. Top scorer
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    pss.player_id,
    p_league_id,
    p_season_id,
    COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )),
    'top_scorer',
    jsonb_build_object('goals', pss.goals)
  FROM player_season_stats pss
  WHERE pss.season_id = p_season_id
    AND pss.goals = (
      SELECT MAX(pss2.goals) FROM player_season_stats pss2
      WHERE pss2.season_id = p_season_id
    )
    AND pss.goals > 0
    AND COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )) IS NOT NULL
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('top_scorer', v_count);

  -- 3. Points leader
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    pss.player_id,
    p_league_id,
    p_season_id,
    COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )),
    'points_leader',
    jsonb_build_object('points', pss.points)
  FROM player_season_stats pss
  WHERE pss.season_id = p_season_id
    AND pss.points = (
      SELECT MAX(pss2.points) FROM player_season_stats pss2
      WHERE pss2.season_id = p_season_id
    )
    AND pss.points > 0
    AND COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )) IS NOT NULL
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('points_leader', v_count);

  -- 4. Top goalie
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    sub.player_id,
    p_league_id,
    p_season_id,
    sub.team_id,
    'top_goalie',
    jsonb_build_object(
      'save_percentage', sub.save_pct,
      'goals_against_average', sub.gaa,
      'games_played', sub.gp
    )
  FROM (
    SELECT
      gs.player_id,
      COALESCE(
        (SELECT tr.team_id FROM team_rosters tr
         WHERE tr.player_id = gs.player_id AND tr.season_id = p_season_id
         LIMIT 1),
        gs.team_id
      ) AS team_id,
      COUNT(*) AS gp,
      CASE
        WHEN SUM(gs.saves + gs.goals_against) > 0
        THEN ROUND((SUM(gs.saves)::NUMERIC / SUM(gs.saves + gs.goals_against)::NUMERIC) * 100, 2)
        ELSE NULL
      END AS save_pct,
      CASE
        WHEN COUNT(*) > 0
        THEN ROUND(SUM(gs.goals_against)::NUMERIC / COUNT(*)::NUMERIC, 2)
        ELSE NULL
      END AS gaa
    FROM goalie_stats gs
    WHERE gs.season_id = p_season_id
      AND gs.league_id = p_league_id
    GROUP BY gs.player_id, gs.team_id
    HAVING COUNT(*) >= 3
  ) sub
  WHERE sub.team_id IS NOT NULL
  ORDER BY
    CASE WHEN sub.save_pct IS NOT NULL THEN sub.save_pct ELSE -1 END DESC,
    CASE WHEN sub.save_pct IS NULL AND sub.gaa IS NOT NULL THEN sub.gaa ELSE 999 END ASC
  LIMIT 1
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('top_goalie', v_count);

  -- 5. Iron man
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    pss.player_id,
    p_league_id,
    p_season_id,
    COALESCE(pss.team_id, tr.team_id),
    'iron_man',
    jsonb_build_object('games_played', pss.games_played, 'team_games', team_games.total_games)
  FROM player_season_stats pss
  JOIN team_rosters tr ON tr.player_id = pss.player_id AND tr.season_id = p_season_id
  JOIN LATERAL (
    SELECT COUNT(*) AS total_games
    FROM games g
    WHERE g.season_id = p_season_id
      AND g.status = 'completed'
      AND (g.home_team_id = tr.team_id OR g.away_team_id = tr.team_id)
  ) team_games ON TRUE
  WHERE pss.season_id = p_season_id
    AND team_games.total_games > 0
    AND pss.games_played >= team_games.total_games
    AND COALESCE(pss.team_id, tr.team_id) IS NOT NULL
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('iron_man', v_count);

  -- 6. Most assists
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    pss.player_id,
    p_league_id,
    p_season_id,
    COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )),
    'most_assists',
    jsonb_build_object('assists', pss.assists)
  FROM player_season_stats pss
  WHERE pss.season_id = p_season_id
    AND pss.assists = (
      SELECT MAX(pss2.assists) FROM player_season_stats pss2
      WHERE pss2.season_id = p_season_id
    )
    AND pss.assists > 0
    AND COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )) IS NOT NULL
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('most_assists', v_count);

  -- 7. Best plus/minus
  IF v_has_plus_minus THEN
    INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
    SELECT
      pss.player_id,
      p_league_id,
      p_season_id,
      COALESCE(pss.team_id, (
        SELECT tr.team_id FROM team_rosters tr
        WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
        LIMIT 1
      )),
      'best_plus_minus',
      jsonb_build_object('plus_minus', pss.plus_minus)
    FROM player_season_stats pss
    WHERE pss.season_id = p_season_id
      AND pss.plus_minus = (
        SELECT MAX(pss2.plus_minus) FROM player_season_stats pss2
        WHERE pss2.season_id = p_season_id
      )
      AND pss.plus_minus > 0
      AND COALESCE(pss.team_id, (
        SELECT tr.team_id FROM team_rosters tr
        WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
        LIMIT 1
      )) IS NOT NULL
    ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    v_count := 0;
  END IF;
  v_summary := v_summary || jsonb_build_object('best_plus_minus', v_count);

  -- 8. Penalty free
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    pss.player_id,
    p_league_id,
    p_season_id,
    COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )),
    'penalty_free',
    jsonb_build_object('games_played', pss.games_played, 'penalty_minutes', 0)
  FROM player_season_stats pss
  WHERE pss.season_id = p_season_id
    AND pss.penalty_minutes = 0
    AND pss.games_played >= 5
    AND COALESCE(pss.team_id, (
      SELECT tr.team_id FROM team_rosters tr
      WHERE tr.player_id = pss.player_id AND tr.season_id = p_season_id
      LIMIT 1
    )) IS NOT NULL
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('penalty_free', v_count);

  -- 9. Division top scorer
  FOR v_div IN
    SELECT d.id AS division_id FROM divisions d
    WHERE d.league_id = p_league_id
      AND d.season_id = p_season_id
  LOOP
    INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
    SELECT
      pss.player_id,
      p_league_id,
      p_season_id,
      COALESCE(pss.team_id, tr.team_id),
      'division_top_scorer',
      jsonb_build_object('goals', pss.goals, 'division_id', v_div.division_id)
    FROM player_season_stats pss
    JOIN team_rosters tr ON tr.player_id = pss.player_id AND tr.season_id = p_season_id
    JOIN teams t ON t.id = tr.team_id AND t.division_id = v_div.division_id
    WHERE pss.season_id = p_season_id
      AND pss.goals = (
        SELECT MAX(pss2.goals)
        FROM player_season_stats pss2
        JOIN team_rosters tr2 ON tr2.player_id = pss2.player_id AND tr2.season_id = p_season_id
        JOIN teams t2 ON t2.id = tr2.team_id AND t2.division_id = v_div.division_id
        WHERE pss2.season_id = p_season_id
      )
      AND pss.goals > 0
    ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('division_top_scorer', v_count);

  -- 10. Division points leader
  FOR v_div IN
    SELECT d.id AS division_id FROM divisions d
    WHERE d.league_id = p_league_id
      AND d.season_id = p_season_id
  LOOP
    INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
    SELECT
      pss.player_id,
      p_league_id,
      p_season_id,
      COALESCE(pss.team_id, tr.team_id),
      'division_points_leader',
      jsonb_build_object('points', pss.points, 'division_id', v_div.division_id)
    FROM player_season_stats pss
    JOIN team_rosters tr ON tr.player_id = pss.player_id AND tr.season_id = p_season_id
    JOIN teams t ON t.id = tr.team_id AND t.division_id = v_div.division_id
    WHERE pss.season_id = p_season_id
      AND pss.points = (
        SELECT MAX(pss2.points)
        FROM player_season_stats pss2
        JOIN team_rosters tr2 ON tr2.player_id = pss2.player_id AND tr2.season_id = p_season_id
        JOIN teams t2 ON t2.id = tr2.team_id AND t2.division_id = v_div.division_id
        WHERE pss2.season_id = p_season_id
      )
      AND pss.points > 0
    ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('division_points_leader', v_count);

  -- 11. Division top goalie
  FOR v_div IN
    SELECT d.id AS division_id FROM divisions d
    WHERE d.league_id = p_league_id
      AND d.season_id = p_season_id
  LOOP
    INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
    SELECT
      sub.player_id,
      p_league_id,
      p_season_id,
      sub.team_id,
      'division_top_goalie',
      jsonb_build_object(
        'save_percentage', sub.save_pct,
        'games_played', sub.gp,
        'division_id', v_div.division_id
      )
    FROM (
      SELECT
        gs.player_id,
        COALESCE(
          (SELECT tr.team_id FROM team_rosters tr
           WHERE tr.player_id = gs.player_id AND tr.season_id = p_season_id
           LIMIT 1),
          gs.team_id
        ) AS team_id,
        COUNT(*) AS gp,
        CASE
          WHEN SUM(gs.saves + gs.goals_against) > 0
          THEN ROUND((SUM(gs.saves)::NUMERIC / SUM(gs.saves + gs.goals_against)::NUMERIC) * 100, 2)
          ELSE NULL
        END AS save_pct
      FROM goalie_stats gs
      JOIN team_rosters tr ON tr.player_id = gs.player_id AND tr.season_id = p_season_id
      JOIN teams t ON t.id = tr.team_id AND t.division_id = v_div.division_id
      WHERE gs.season_id = p_season_id
        AND gs.league_id = p_league_id
      GROUP BY gs.player_id, gs.team_id
      HAVING COUNT(*) >= 3
    ) sub
    WHERE sub.team_id IS NOT NULL
      AND sub.save_pct IS NOT NULL
    ORDER BY sub.save_pct DESC
    LIMIT 1
    ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('division_top_goalie', v_count);

  -- 12. Team MVP
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT DISTINCT ON (mvp.team_id)
    mvp.player_id,
    p_league_id,
    p_season_id,
    mvp.team_id,
    'team_mvp',
    jsonb_build_object('points', mvp.points, 'goals', mvp.goals, 'assists', mvp.assists)
  FROM (
    SELECT
      pss.player_id,
      tr.team_id,
      pss.points,
      pss.goals,
      pss.assists
    FROM player_season_stats pss
    JOIN team_rosters tr ON tr.player_id = pss.player_id AND tr.season_id = p_season_id
    JOIN teams t ON t.id = tr.team_id AND t.league_id = p_league_id
    WHERE pss.season_id = p_season_id
      AND pss.points > 0
    ORDER BY tr.team_id, pss.points DESC, pss.goals DESC
  ) mvp
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('team_mvp', v_count);

  -- 13. Shutout king
  INSERT INTO player_badges (player_id, league_id, season_id, team_id, badge_type, metadata)
  SELECT
    sub.player_id,
    p_league_id,
    p_season_id,
    sub.team_id,
    'shutout_king',
    jsonb_build_object('shutouts', sub.shutout_count, 'games_played', sub.gp)
  FROM (
    SELECT
      gs.player_id,
      COALESCE(
        (SELECT tr.team_id FROM team_rosters tr
         WHERE tr.player_id = gs.player_id AND tr.season_id = p_season_id
         LIMIT 1),
        gs.team_id
      ) AS team_id,
      COUNT(*) AS gp,
      SUM(CASE WHEN gs.goals_against = 0 THEN 1 ELSE 0 END) AS shutout_count
    FROM goalie_stats gs
    WHERE gs.season_id = p_season_id
      AND gs.league_id = p_league_id
    GROUP BY gs.player_id, gs.team_id
    HAVING SUM(CASE WHEN gs.goals_against = 0 THEN 1 ELSE 0 END) > 0
  ) sub
  WHERE sub.team_id IS NOT NULL
    AND sub.shutout_count = (
      SELECT MAX(s2.shutout_count)
      FROM (
        SELECT SUM(CASE WHEN gs2.goals_against = 0 THEN 1 ELSE 0 END) AS shutout_count
        FROM goalie_stats gs2
        WHERE gs2.season_id = p_season_id AND gs2.league_id = p_league_id
        GROUP BY gs2.player_id
      ) s2
    )
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('shutout_king', v_count);

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION trigger_award_season_badges()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM award_season_badges(NEW.league_id, NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to award season badges for season %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
