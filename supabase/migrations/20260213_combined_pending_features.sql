-- Combined migration: GWG tracking, playoff eligibility, roster player types, scorekeeper multi-game
-- These were individual 20260211 files combined to avoid Supabase CLI version collision

-- ==============================================================================
-- PART 1: GWG Tracking and Goalie Pull State
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_events' AND column_name = 'is_gwg'
  ) THEN
    ALTER TABLE game_events ADD COLUMN is_gwg BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'home_goalie_pulled'
  ) THEN
    ALTER TABLE games ADD COLUMN home_goalie_pulled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'away_goalie_pulled'
  ) THEN
    ALTER TABLE games ADD COLUMN away_goalie_pulled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ==============================================================================
-- PART 2: Playoff Eligibility System
-- ==============================================================================

ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS playoff_eligibility_min_games_pct numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS playoff_eligibility_min_games integer DEFAULT NULL;

COMMENT ON COLUMN seasons.playoff_eligibility_min_games_pct IS 'Minimum games-played percentage required for playoff eligibility (e.g. 60.00 = 60%)';
COMMENT ON COLUMN seasons.playoff_eligibility_min_games IS 'Absolute minimum games played required for playoff eligibility';

ALTER TABLE team_rosters
  ADD COLUMN IF NOT EXISTS games_played_override integer DEFAULT NULL;

COMMENT ON COLUMN team_rosters.games_played_override IS 'Manual override for games played count (e.g. for players who joined mid-season from another team)';

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

GRANT EXECUTE ON FUNCTION get_playoff_eligibility(uuid, uuid) TO authenticated;

-- ==============================================================================
-- PART 3: Roster Player Type and Sub Invitations
-- ==============================================================================

ALTER TABLE team_rosters ADD COLUMN IF NOT EXISTS player_type text NOT NULL DEFAULT 'regular'
  CHECK (player_type IN ('regular', 'sub', 'part_time'));

CREATE TABLE IF NOT EXISTS sub_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invited_player_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message text,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (game_id, invited_player_id)
);

ALTER TABLE sub_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "captains_manage_invites" ON sub_invitations;
CREATE POLICY "captains_manage_invites" ON sub_invitations FOR ALL USING (
  team_id IN (
    SELECT team_id FROM team_rosters
    WHERE player_id = auth.uid()
    AND leadership_role IN ('captain', 'alternate_captain')
    AND status = 'active'
  )
);

DROP POLICY IF EXISTS "players_view_own_invites" ON sub_invitations;
CREATE POLICY "players_view_own_invites" ON sub_invitations FOR SELECT
  USING (invited_player_id = auth.uid());

DROP POLICY IF EXISTS "players_respond_own_invites" ON sub_invitations;
CREATE POLICY "players_respond_own_invites" ON sub_invitations FOR UPDATE
  USING (invited_player_id = auth.uid())
  WITH CHECK (invited_player_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sub_invitations_game_team ON sub_invitations(game_id, team_id);
CREATE INDEX IF NOT EXISTS idx_sub_invitations_player ON sub_invitations(invited_player_id, status);
CREATE INDEX IF NOT EXISTS idx_team_rosters_player_type ON team_rosters(team_id, player_type) WHERE status = 'active';

-- ==============================================================================
-- PART 4: Multi-Game Scorekeeper Sessions + Timer Support
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scorekeeper_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE scorekeeper_sessions ADD COLUMN session_type text NOT NULL DEFAULT 'single'
      CHECK (session_type IN ('single', 'multi'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS scorekeeper_session_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scorekeeper_sessions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  game_order INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, game_id)
);

ALTER TABLE scorekeeper_session_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_access" ON scorekeeper_session_games;
CREATE POLICY "service_role_access" ON scorekeeper_session_games
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "League admins can view session games" ON scorekeeper_session_games;
CREATE POLICY "League admins can view session games" ON scorekeeper_session_games
  FOR SELECT USING (
    session_id IN (
      SELECT ss.id FROM scorekeeper_sessions ss
      WHERE ss.league_id IN (
        SELECT league_id FROM league_memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
          AND status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Scorekeepers can manage own session games" ON scorekeeper_session_games;
CREATE POLICY "Scorekeepers can manage own session games" ON scorekeeper_session_games
  FOR ALL USING (
    session_id IN (
      SELECT ss.id FROM scorekeeper_sessions ss
      WHERE ss.scorekeeper_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_sk_session_games_session ON scorekeeper_session_games(session_id);
CREATE INDEX IF NOT EXISTS idx_sk_session_games_game ON scorekeeper_session_games(game_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_running'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_running BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_started_at'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_started_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'timer_elapsed_seconds'
  ) THEN
    ALTER TABLE games ADD COLUMN timer_elapsed_seconds INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'current_period'
  ) THEN
    ALTER TABLE games ADD COLUMN current_period INTEGER DEFAULT 1;
  END IF;
END $$;
