BEGIN;

CREATE OR REPLACE FUNCTION public.finalize_draft_rosters(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_draft public.drafts%ROWTYPE;
  v_season_start_date DATE;
  v_total_picks INTEGER;
  v_inserted_count INTEGER := 0;
  v_existing_count INTEGER := 0;
  v_inserted_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT d.*
  INTO v_draft
  FROM public.drafts AS d
  WHERE d.id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = v_draft.league_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only active league admins can finalize draft rosters');
  END IF;

  IF v_draft.status::text NOT IN ('complete', 'completed') THEN
    RETURN json_build_object('success', false, 'error', 'Draft must be complete before rosters are finalized');
  END IF;

  SELECT s.start_date
  INTO v_season_start_date
  FROM public.seasons AS s
  WHERE s.id = v_draft.season_id
    AND s.league_id = v_draft.league_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft season does not belong to the draft league');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.draft_pool AS dp
    WHERE dp.draft_id = p_draft_id
      AND (dp.is_drafted IS DISTINCT FROM TRUE)
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft pool still contains undrafted players');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.draft_pool AS dp
    WHERE dp.draft_id = p_draft_id
      AND dp.league_id <> v_draft.league_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft pool contains players from another league');
  END IF;

  -- Historical undone rows are audit records, not active picks. A corrected
  -- draft remains finalizable as long as its current non-undone picks are complete.
  SELECT COUNT(*)
  INTO v_total_picks
  FROM public.draft_picks AS p
  WHERE p.draft_id = p_draft_id
    AND p.undone_at IS NULL;

  IF v_total_picks = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Draft has no picks to finalize');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
    GROUP BY p.player_id
    HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
    GROUP BY p.pick_number
    HAVING COUNT(*) > 1
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft contains duplicate picks');
  END IF;

  IF (
    SELECT MIN(p.pick_number) <> 1
        OR MAX(p.pick_number) <> COUNT(*)
    FROM public.draft_picks AS p
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.draft_pool AS dp
        WHERE dp.draft_id = p_draft_id
          AND dp.player_id = p.player_id
          AND dp.is_drafted IS TRUE
          AND dp.drafted_by_team_id = p.team_id
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.draft_pool AS dp
    WHERE dp.draft_id = p_draft_id
      AND dp.is_drafted IS TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM public.draft_picks AS p
        WHERE p.draft_id = p_draft_id
          AND p.undone_at IS NULL
          AND p.player_id = dp.player_id
          AND p.team_id = dp.drafted_by_team_id
      )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft contains missing or inconsistent picks');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    LEFT JOIN public.teams AS t ON t.id = p.team_id
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
      AND (
        p.league_id <> v_draft.league_id
        OR t.id IS NULL
        OR t.league_id <> v_draft.league_id
      )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft contains a team from another league');
  END IF;

  -- Serialize target-season roster validation and insertion with other writers.
  LOCK TABLE public.team_rosters IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    JOIN public.team_rosters AS tr
      ON tr.player_id = p.player_id
     AND tr.season_id = v_draft.season_id
     AND tr.team_id <> p.team_id
     AND tr.status::text = 'active'
     AND tr.end_date IS NULL
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'A drafted player already has an active roster on a different team for this season'
    );
  END IF;

  WITH inserted AS (
    INSERT INTO public.team_rosters (
      team_id,
      player_id,
      season_id,
      league_id,
      division_id,
      position,
      is_goalie,
      start_date,
      player_type,
      status,
      notes
    )
    SELECT
      p.team_id,
      p.player_id,
      v_draft.season_id,
      v_draft.league_id,
      t.division_id,
      CASE
        WHEN UPPER(COALESCE(dp.position, '')) = 'G' THEN 'Goalie'::public.player_position
        WHEN UPPER(COALESCE(dp.position, '')) = 'D' THEN 'Defense'::public.player_position
        ELSE 'Forward'::public.player_position
      END,
      UPPER(COALESCE(dp.position, '')) = 'G',
      v_season_start_date,
      'regular',
      'active',
      format('Finalized from draft %s', p_draft_id)
    FROM public.draft_picks AS p
    JOIN public.draft_pool AS dp
      ON dp.draft_id = p.draft_id
     AND dp.player_id = p.player_id
    JOIN public.teams AS t ON t.id = p.team_id
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.team_rosters AS tr
        WHERE tr.player_id = p.player_id
          AND tr.team_id = p.team_id
          AND tr.season_id = v_draft.season_id
          AND tr.status::text = 'active'
          AND tr.end_date IS NULL
      )
    ON CONFLICT DO NOTHING
    RETURNING id
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(ARRAY_AGG(id ORDER BY id), ARRAY[]::UUID[])
  INTO v_inserted_count, v_inserted_ids
  FROM inserted;

  -- A conflict unrelated to an already-existing matching roster must not produce
  -- a partial success. Raising rolls back every insert made by this invocation.
  IF EXISTS (
    SELECT 1
    FROM public.draft_picks AS p
    WHERE p.draft_id = p_draft_id
      AND p.undone_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.team_rosters AS tr
        WHERE tr.player_id = p.player_id
          AND tr.team_id = p.team_id
          AND tr.season_id = v_draft.season_id
          AND tr.status::text = 'active'
          AND tr.end_date IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'A roster constraint prevented all draft picks from being finalized';
  END IF;

  v_existing_count := v_total_picks - v_inserted_count;

  RETURN json_build_object(
    'success', true,
    'inserted_count', v_inserted_count,
    'existing_count', v_existing_count,
    'total_picks', v_total_picks,
    'inserted_ids', v_inserted_ids
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_draft_rosters(UUID) IS
  'Idempotently materializes a completed draft into its season team rosters.';

REVOKE ALL ON FUNCTION public.finalize_draft_rosters(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_draft_rosters(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.finalize_draft_rosters(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_draft_rosters(UUID) TO service_role;

COMMIT;
