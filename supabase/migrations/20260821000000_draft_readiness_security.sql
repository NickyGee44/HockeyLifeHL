BEGIN;

-- Captain/player invites are server-managed. Keep them inaccessible to browser roles.
ALTER TABLE public.captain_player_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.captain_player_invites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.captain_player_invites TO service_role;

-- Preserve the existing member SELECT policy and add pending-draft management for
-- active league owners/admins only.
DROP POLICY IF EXISTS "Active league admins can manage draft pool" ON public.draft_pool;
CREATE POLICY "Active league admins can manage draft pool"
  ON public.draft_pool
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_memberships AS lm
      JOIN public.drafts AS d
        ON d.id = draft_pool.draft_id
       AND d.league_id = draft_pool.league_id
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = draft_pool.league_id
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active'
        AND d.status::text = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.league_memberships AS lm
      JOIN public.drafts AS d
        ON d.id = draft_pool.draft_id
       AND d.league_id = draft_pool.league_id
      WHERE lm.user_id = auth.uid()
        AND lm.league_id = draft_pool.league_id
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active'
        AND d.status::text = 'pending'
    )
  );

-- Keep the deployed signature and response shape while validating tenant scope
-- and the configuration values accepted by the draft setup UI.
CREATE OR REPLACE FUNCTION public.setup_draft(
  p_league_id UUID,
  p_season_id UUID,
  p_name TEXT,
  p_draft_type TEXT DEFAULT 'snake',
  p_pick_time_seconds INTEGER DEFAULT 90,
  p_total_rounds INTEGER DEFAULT 10,
  p_auto_pick_enabled BOOLEAN DEFAULT TRUE,
  p_allow_trades BOOLEAN DEFAULT TRUE,
  p_require_roster_confirmation BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_draft_id UUID;
  v_team_count INTEGER;
  v_cycle_number INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = p_league_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only active league admins can create drafts');
  END IF;

  -- The row lock also serializes cycle-number allocation for this season.
  PERFORM 1
  FROM public.seasons AS s
  WHERE s.id = p_season_id
    AND s.league_id = p_league_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Season not found in this league');
  END IF;

  IF p_draft_type IS NULL OR p_draft_type NOT IN ('snake', 'linear') THEN
    RETURN json_build_object('success', false, 'error', 'Draft type must be snake or linear');
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Draft name is required');
  END IF;

  IF p_total_rounds IS NULL OR p_total_rounds < 1 OR p_total_rounds > 25 THEN
    RETURN json_build_object('success', false, 'error', 'Total rounds must be between 1 and 25');
  END IF;

  IF p_pick_time_seconds IS NULL OR p_pick_time_seconds < 30 OR p_pick_time_seconds > 300 THEN
    RETURN json_build_object('success', false, 'error', 'Pick time must be between 30 and 300 seconds');
  END IF;

  SELECT COALESCE(MAX(d.cycle_number), 0) + 1
  INTO v_cycle_number
  FROM public.drafts AS d
  WHERE d.season_id = p_season_id;

  INSERT INTO public.drafts (
    league_id,
    season_id,
    name,
    status,
    draft_type,
    snake_draft,
    pick_time_seconds,
    total_rounds,
    auto_pick_enabled,
    allow_trades,
    require_roster_confirmation,
    created_by,
    current_round,
    current_pick,
    cycle_number
  )
  VALUES (
    p_league_id,
    p_season_id,
    btrim(p_name),
    'pending',
    p_draft_type,
    p_draft_type = 'snake',
    p_pick_time_seconds,
    p_total_rounds,
    p_auto_pick_enabled,
    p_allow_trades,
    p_require_roster_confirmation,
    v_user_id,
    1,
    1,
    v_cycle_number
  )
  RETURNING id INTO v_draft_id;

  SELECT COUNT(*)
  INTO v_team_count
  FROM public.teams AS t
  WHERE t.league_id = p_league_id
    AND t.status = 'active';

  RETURN json_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'team_count', v_team_count,
    'cycle_number', v_cycle_number
  );
END;
$$;

COMMIT;
