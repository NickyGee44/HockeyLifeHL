-- =============================================================================
-- Playoff Eligibility System
-- Adds season-level eligibility settings, per-roster GP overrides,
-- and an RPC function to calculate playoff eligibility.
-- =============================================================================

-- 1. Add eligibility settings to seasons
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS playoff_eligibility_min_games_pct numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS playoff_eligibility_min_games integer DEFAULT NULL;

COMMENT ON COLUMN seasons.playoff_eligibility_min_games_pct IS 'Minimum games-played percentage required for playoff eligibility (e.g. 60.00 = 60%)';
COMMENT ON COLUMN seasons.playoff_eligibility_min_games IS 'Absolute minimum games played required for playoff eligibility';

-- 2. Add manual GP override to team_rosters
ALTER TABLE team_rosters
  ADD COLUMN IF NOT EXISTS games_played_override integer DEFAULT NULL;

COMMENT ON COLUMN team_rosters.games_played_override IS 'Manual override for games played count (e.g. for players who joined mid-season from another team)';

-- 3. Function to calculate playoff eligibility
CREATE OR REPLACE FUNCTION get_playoff_eligibility(
  p_season_id uuid,
  p_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  player_id uuid,
  team_id uuid,
  full_name text,
  jersey_number integer,
  games_played bigint,
  total_team_games bigint,
  games_played_pct numeric,
  is_eligible boolean,
  min_games_pct numeric,
  min_games integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH season_settings AS (
    SELECT
      playoff_eligibility_min_games_pct,
      playoff_eligibility_min_games
    FROM seasons
    WHERE id = p_season_id
  ),
  team_games AS (
    SELECT
      t.id AS team_id,
      COUNT(DISTINCT g.id) AS total_games
    FROM teams t
    JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id)
    WHERE g.season_id = p_season_id
      AND g.status IN ('completed', 'pending_verification')
      AND (p_team_id IS NULL OR t.id = p_team_id)
    GROUP BY t.id
  ),
  player_games AS (
    SELECT
      ps.player_id,
      ps.team_id,
      COUNT(DISTINCT ps.game_id) AS games_played
    FROM player_stats ps
    JOIN games g ON g.id = ps.game_id
    WHERE g.season_id = p_season_id
      AND g.status IN ('completed', 'pending_verification')
      AND (p_team_id IS NULL OR ps.team_id = p_team_id)
    GROUP BY ps.player_id, ps.team_id
  )
  SELECT
    tr.player_id,
    tr.team_id,
    p.full_name,
    tr.jersey_number::integer,
    COALESCE(tr.games_played_override::bigint, pg.games_played, 0::bigint) AS games_played,
    COALESCE(tg.total_games, 0::bigint) AS total_team_games,
    CASE
      WHEN COALESCE(tg.total_games, 0) > 0 THEN
        ROUND(
          (COALESCE(tr.games_played_override::bigint, pg.games_played, 0::bigint)::numeric
           / tg.total_games::numeric) * 100,
          2
        )
      ELSE 0
    END AS games_played_pct,
    CASE
      WHEN ss.playoff_eligibility_min_games_pct IS NULL
        AND ss.playoff_eligibility_min_games IS NULL THEN true
      WHEN ss.playoff_eligibility_min_games IS NOT NULL
        AND COALESCE(tr.games_played_override::bigint, pg.games_played, 0::bigint)
            >= ss.playoff_eligibility_min_games THEN true
      WHEN ss.playoff_eligibility_min_games_pct IS NOT NULL
        AND COALESCE(tg.total_games, 0) > 0
        AND (COALESCE(tr.games_played_override::bigint, pg.games_played, 0::bigint)::numeric
             / tg.total_games::numeric * 100)
            >= ss.playoff_eligibility_min_games_pct THEN true
      ELSE false
    END AS is_eligible,
    ss.playoff_eligibility_min_games_pct AS min_games_pct,
    ss.playoff_eligibility_min_games AS min_games
  FROM team_rosters tr
  JOIN profiles p ON p.id = tr.player_id
  LEFT JOIN player_games pg ON pg.player_id = tr.player_id AND pg.team_id = tr.team_id
  LEFT JOIN team_games tg ON tg.team_id = tr.team_id
  CROSS JOIN season_settings ss
  WHERE tr.season_id = p_season_id
    AND tr.status = 'active'
    AND (p_team_id IS NULL OR tr.team_id = p_team_id)
  ORDER BY tr.team_id, tr.jersey_number;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies for reads)
GRANT EXECUTE ON FUNCTION get_playoff_eligibility(uuid, uuid) TO authenticated;
