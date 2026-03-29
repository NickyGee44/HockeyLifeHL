-- =============================================================================
-- Player Career Baselines
-- =============================================================================
-- Purpose: Store imported pre-platform career totals separately from native BLH
-- stats so league-scoped all-time totals can be computed as:
--   imported baseline + BLH-native stats
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.player_career_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL,
  source_batch_id TEXT NOT NULL DEFAULT 'default',
  source_record_id TEXT NOT NULL,
  source_label TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  is_goalie BOOLEAN NOT NULL DEFAULT FALSE,
  games_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  moosehead_cup_wins INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  shutouts INTEGER NOT NULL DEFAULT 0,
  points_per_game NUMERIC(10,4) NOT NULL DEFAULT 0,
  win_percentage NUMERIC(10,4) NOT NULL DEFAULT 0,
  goals_against_average NUMERIC(10,4) NOT NULL DEFAULT 0,
  save_percentage NUMERIC(10,4) NOT NULL DEFAULT 0,
  source_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT player_career_baselines_source_system_check CHECK (btrim(source_system) <> ''),
  CONSTRAINT player_career_baselines_source_batch_id_check CHECK (btrim(source_batch_id) <> ''),
  CONSTRAINT player_career_baselines_source_record_id_check CHECK (btrim(source_record_id) <> ''),
  CONSTRAINT player_career_baselines_source_metadata_object_check CHECK (jsonb_typeof(source_metadata) = 'object'),
  CONSTRAINT player_career_baselines_games_played_check CHECK (games_played >= 0),
  CONSTRAINT player_career_baselines_goals_check CHECK (goals >= 0),
  CONSTRAINT player_career_baselines_assists_check CHECK (assists >= 0),
  CONSTRAINT player_career_baselines_points_check CHECK (points >= 0),
  CONSTRAINT player_career_baselines_wins_check CHECK (wins >= 0),
  CONSTRAINT player_career_baselines_ties_check CHECK (ties >= 0),
  CONSTRAINT player_career_baselines_moosehead_cup_wins_check CHECK (moosehead_cup_wins >= 0),
  CONSTRAINT player_career_baselines_saves_check CHECK (saves >= 0),
  CONSTRAINT player_career_baselines_goals_against_check CHECK (goals_against >= 0),
  CONSTRAINT player_career_baselines_shutouts_check CHECK (shutouts >= 0),
  CONSTRAINT player_career_baselines_points_per_game_check CHECK (points_per_game >= 0),
  CONSTRAINT player_career_baselines_win_percentage_check CHECK (win_percentage >= 0),
  CONSTRAINT player_career_baselines_goals_against_average_check CHECK (goals_against_average >= 0),
  CONSTRAINT player_career_baselines_save_percentage_check CHECK (save_percentage >= 0)
);

COMMENT ON TABLE public.player_career_baselines IS
  'League-scoped imported career stat baselines that augment BLH-native all-time totals without replacing native stats.';

COMMENT ON COLUMN public.player_career_baselines.player_id IS
  'Nullable profile linkage for the imported player. Null rows are preserved until a BLH profile match exists.';

COMMENT ON COLUMN public.player_career_baselines.source_batch_id IS
  'Importer-controlled batch key used for idempotent reruns against the same external source snapshot.';

COMMENT ON COLUMN public.player_career_baselines.source_record_id IS
  'Stable identifier of the source record within the external dataset.';

COMMENT ON COLUMN public.player_career_baselines.source_metadata IS
  'Raw source provenance for debugging, reconciliation, and future remapping.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_career_baselines_source_identity
  ON public.player_career_baselines(league_id, source_system, source_batch_id, source_record_id);

CREATE INDEX IF NOT EXISTS idx_player_career_baselines_league_player
  ON public.player_career_baselines(league_id, player_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_player_career_baselines_league_source
  ON public.player_career_baselines(league_id, source_system);

DROP TRIGGER IF EXISTS player_career_baselines_updated_at
  ON public.player_career_baselines;
CREATE TRIGGER player_career_baselines_updated_at
  BEFORE UPDATE ON public.player_career_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.player_career_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "League admins can view player career baselines" ON public.player_career_baselines;
CREATE POLICY "League admins can view player career baselines"
  ON public.player_career_baselines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = player_career_baselines.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_career_baselines.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "League admins can insert player career baselines" ON public.player_career_baselines;
CREATE POLICY "League admins can insert player career baselines"
  ON public.player_career_baselines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = player_career_baselines.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_career_baselines.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "League admins can update player career baselines" ON public.player_career_baselines;
CREATE POLICY "League admins can update player career baselines"
  ON public.player_career_baselines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = player_career_baselines.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_career_baselines.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
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
      FROM public.leagues l
      LEFT JOIN public.organizations o ON o.id = l.organization_id
      WHERE l.id = player_career_baselines.league_id
        AND (
          l.owner_id = auth.uid()
          OR l.created_by = auth.uid()
          OR o.owner_user_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.league_memberships lm
      WHERE lm.league_id = player_career_baselines.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
        AND lm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_platform_admin = TRUE
    )
  );

COMMIT;
