-- ==============================================================================
-- MIGRATION: Player Badges System
-- ==============================================================================
-- Description: Adds player badges for season achievements (championship,
--              top scorer, points leader, top goalie, iron man)
-- Author: Claude Agent
-- Date: February 9, 2026
-- ==============================================================================

-- ==============================================================================
-- ENUM: badge_type
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_type') THEN
    CREATE TYPE badge_type AS ENUM (
      'championship',
      'top_scorer',
      'points_leader',
      'top_goalie',
      'iron_man'
    );
  END IF;
END $$;

-- ==============================================================================
-- TABLE: player_badges
-- ==============================================================================

CREATE TABLE IF NOT EXISTS player_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, season_id, badge_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_badges_player_id ON player_badges(player_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_league_season ON player_badges(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_badge_type ON player_badges(badge_type);

-- ==============================================================================
-- RLS POLICIES: player_badges
-- ==============================================================================

ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can read badges (public data)
CREATE POLICY "Public read access" ON player_badges
  FOR SELECT USING (true);

-- Only service role can write badges (awarded by system)
CREATE POLICY "Service role write access" ON player_badges
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- FUNCTION: award_season_badges
-- ==============================================================================
-- Awards badges to players when a season is completed.
-- Idempotent via ON CONFLICT DO NOTHING.
-- Returns JSONB summary of badges awarded per type.
-- ==============================================================================

CREATE OR REPLACE FUNCTION award_season_badges(
  p_league_id UUID,
  p_season_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_champion_team_id UUID;
  v_summary JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- =========================================================================
  -- 1. CHAMPIONSHIP badges - players on the champion team roster
  -- =========================================================================
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

  -- =========================================================================
  -- 2. TOP SCORER badges - player(s) with MAX goals
  -- =========================================================================
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

  -- =========================================================================
  -- 3. POINTS LEADER badges - player(s) with MAX points
  -- =========================================================================
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

  -- =========================================================================
  -- 4. TOP GOALIE badge - best save percentage (min 3 GP), fallback to GAA
  -- =========================================================================
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
    -- Primary: best save percentage (if available)
    CASE WHEN sub.save_pct IS NOT NULL THEN sub.save_pct ELSE -1 END DESC,
    -- Fallback: lowest GAA
    CASE WHEN sub.save_pct IS NULL AND sub.gaa IS NOT NULL THEN sub.gaa ELSE 999 END ASC
  LIMIT 1
  ON CONFLICT (player_id, season_id, badge_type) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_summary := v_summary || jsonb_build_object('top_goalie', v_count);

  -- =========================================================================
  -- 5. IRON MAN badges - players who played every team game
  -- =========================================================================
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

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ==============================================================================
-- TRIGGER: Auto-award badges when season is completed
-- ==============================================================================

CREATE OR REPLACE FUNCTION trigger_award_season_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM award_season_badges(NEW.league_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_season_completed_award_badges ON seasons;
CREATE TRIGGER trigger_season_completed_award_badges
  AFTER UPDATE ON seasons
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION trigger_award_season_badges();

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================
