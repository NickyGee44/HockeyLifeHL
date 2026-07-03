-- Active league spare pool + per-game replacement tracking.
-- League owners control league-wide spare availability; captains can still keep
-- private team spares on their own roster.

CREATE TABLE IF NOT EXISTS public.league_spare_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  position TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_league_spare_pool_league_active
  ON public.league_spare_pool(league_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_league_spare_pool_player
  ON public.league_spare_pool(player_id);

ALTER TABLE public.sub_invitations
  ADD COLUMN IF NOT EXISTS replaced_player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'league'
    CHECK (source_type IN ('team', 'league'));

CREATE INDEX IF NOT EXISTS idx_sub_invitations_replaced_player
  ON public.sub_invitations(game_id, team_id, replaced_player_id);

ALTER TABLE public.league_spare_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "league_spares_admin_manage" ON public.league_spare_pool;
CREATE POLICY "league_spares_admin_manage"
  ON public.league_spare_pool
  FOR ALL
  USING (
    league_id IN (
      SELECT lm.league_id
      FROM public.league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin', 'league_admin', 'commissioner')
    )
  )
  WITH CHECK (
    league_id IN (
      SELECT lm.league_id
      FROM public.league_memberships lm
      WHERE lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin', 'league_admin', 'commissioner')
    )
  );

DROP POLICY IF EXISTS "league_spares_captains_read_active" ON public.league_spare_pool;
CREATE POLICY "league_spares_captains_read_active"
  ON public.league_spare_pool
  FOR SELECT
  USING (
    active = TRUE
    AND league_id IN (
      SELECT tr.league_id
      FROM public.team_rosters tr
      WHERE tr.player_id = auth.uid()
        AND tr.status = 'active'
        AND tr.end_date IS NULL
        AND tr.leadership_role IN ('captain', 'alternate_captain')
    )
  );

CREATE OR REPLACE FUNCTION public.touch_league_spare_pool_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_league_spare_pool_updated_at ON public.league_spare_pool;
CREATE TRIGGER trigger_league_spare_pool_updated_at
  BEFORE UPDATE ON public.league_spare_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_league_spare_pool_updated_at();

COMMENT ON TABLE public.league_spare_pool IS 'League-owner curated list of players currently available as league-wide spares.';
COMMENT ON COLUMN public.sub_invitations.replaced_player_id IS 'Regular roster player this spare is covering for in this game.';
COMMENT ON COLUMN public.sub_invitations.source_type IS 'Whether the spare came from the captain team list or league active-spare pool.';
