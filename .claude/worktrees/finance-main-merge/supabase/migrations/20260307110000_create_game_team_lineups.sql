CREATE TABLE IF NOT EXISTS public.game_team_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  formation TEXT,
  layout_json JSONB NOT NULL DEFAULT jsonb_build_object(
    'version', 1,
    'roster', jsonb_build_array(),
    'placedPlayers', jsonb_build_array()
  ),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT game_team_lineups_game_team_unique UNIQUE (game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_game_team_lineups_game
  ON public.game_team_lineups(game_id, status);

CREATE INDEX IF NOT EXISTS idx_game_team_lineups_team
  ON public.game_team_lineups(team_id, updated_at DESC);

DROP TRIGGER IF EXISTS trigger_game_team_lineups_updated_at ON public.game_team_lineups;
CREATE TRIGGER trigger_game_team_lineups_updated_at
  BEFORE UPDATE ON public.game_team_lineups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.game_team_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_team_lineups_select_published_or_managers"
  ON public.game_team_lineups
  FOR SELECT
  USING (
    (
      game_team_lineups.status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.leagues l
        WHERE l.id = game_team_lineups.league_id
          AND l.status = 'active'
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = game_team_lineups.team_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      WHERE tr.team_id = game_team_lineups.team_id
        AND tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.end_date IS NULL
        AND tr.leadership_role = 'alternate_captain'
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = game_team_lineups.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );

CREATE POLICY "game_team_lineups_insert_managers"
  ON public.game_team_lineups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_team_lineups.game_id
        AND g.league_id = game_team_lineups.league_id
        AND (g.home_team_id = game_team_lineups.team_id OR g.away_team_id = game_team_lineups.team_id)
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = game_team_lineups.team_id
          AND t.captain_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_rosters tr
        WHERE tr.team_id = game_team_lineups.team_id
          AND tr.player_id = auth.uid()
          AND tr.status = 'active'
          AND tr.end_date IS NULL
          AND tr.leadership_role = 'alternate_captain'
      )
      OR EXISTS (
        SELECT 1
        FROM public.league_memberships lm
        WHERE lm.league_id = game_team_lineups.league_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
          AND lm.role IN ('league_admin', 'commissioner')
      )
    )
  );

CREATE POLICY "game_team_lineups_update_managers"
  ON public.game_team_lineups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = game_team_lineups.team_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      WHERE tr.team_id = game_team_lineups.team_id
        AND tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.end_date IS NULL
        AND tr.leadership_role = 'alternate_captain'
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = game_team_lineups.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = game_team_lineups.game_id
        AND g.league_id = game_team_lineups.league_id
        AND (g.home_team_id = game_team_lineups.team_id OR g.away_team_id = game_team_lineups.team_id)
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.teams t
        WHERE t.id = game_team_lineups.team_id
          AND t.captain_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_rosters tr
        WHERE tr.team_id = game_team_lineups.team_id
          AND tr.player_id = auth.uid()
          AND tr.status = 'active'
          AND tr.end_date IS NULL
          AND tr.leadership_role = 'alternate_captain'
      )
      OR EXISTS (
        SELECT 1
        FROM public.league_memberships lm
        WHERE lm.league_id = game_team_lineups.league_id
          AND lm.user_id = auth.uid()
          AND lm.status = 'active'
          AND lm.role IN ('league_admin', 'commissioner')
      )
    )
  );

CREATE POLICY "game_team_lineups_delete_managers"
  ON public.game_team_lineups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = game_team_lineups.team_id
        AND t.captain_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.team_rosters tr
      WHERE tr.team_id = game_team_lineups.team_id
        AND tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.end_date IS NULL
        AND tr.leadership_role = 'alternate_captain'
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = game_team_lineups.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('league_admin', 'commissioner')
    )
  );
