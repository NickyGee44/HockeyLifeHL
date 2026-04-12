BEGIN;

CREATE TABLE IF NOT EXISTS public.player_rating_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  rating public.player_rating NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(6,4),
  points_per_game NUMERIC(8,4),
  raw_percentile NUMERIC(5,2),
  overall_percentile NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  trust_score NUMERIC(8,2),
  position TEXT,
  snapshot_kind TEXT NOT NULL DEFAULT 'season_latest',
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_rating_contexts_snapshot_kind_check CHECK (snapshot_kind IN ('season_latest')),
  CONSTRAINT player_rating_contexts_stats_json_object_check CHECK (jsonb_typeof(stats_json) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_player_rating_contexts_league_season_player
  ON public.player_rating_contexts(league_id, season_id, player_id);

CREATE INDEX IF NOT EXISTS idx_player_rating_contexts_league_season_team
  ON public.player_rating_contexts(league_id, season_id, team_id);

CREATE INDEX IF NOT EXISTS idx_player_rating_contexts_league_season_division
  ON public.player_rating_contexts(league_id, season_id, division_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_rating_contexts_scope_unique
  ON public.player_rating_contexts(
    league_id,
    season_id,
    player_id,
    COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid),
    snapshot_kind,
    COALESCE(position, '')
  );

COMMENT ON TABLE public.player_rating_contexts IS
  'Season-scoped player rating contexts that preserve per-team and per-division stints before any blended overall player season rating is shown.';

COMMENT ON COLUMN public.player_rating_contexts.snapshot_kind IS
  'Currently only season_latest is persisted. Weekly trends should not be inferred unless a dedicated time-series snapshot model is added.';

ALTER TABLE public.player_rating_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League admins can view player rating contexts" ON public.player_rating_contexts;
CREATE POLICY "League admins can view player rating contexts"
  ON public.player_rating_contexts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_rating_contexts.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = player_rating_contexts.league_id
        AND l.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "League admins can manage player rating contexts" ON public.player_rating_contexts;
CREATE POLICY "League admins can manage player rating contexts"
  ON public.player_rating_contexts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_rating_contexts.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = player_rating_contexts.league_id
        AND l.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_rating_contexts.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = player_rating_contexts.league_id
        AND l.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

COMMIT;
