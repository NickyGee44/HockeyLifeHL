BEGIN;

-- Remove the obsolete overload whose default parameter collides with the newer
-- idempotent implementation for two-argument PostgREST calls.
DROP FUNCTION IF EXISTS public.make_draft_pick(UUID, UUID, UUID);

-- Rename the proven four-argument implementation so its default parameters can
-- no longer collide with the public two-argument PostgREST surface.
ALTER FUNCTION public.make_draft_pick(UUID, UUID, UUID, UUID)
  RENAME TO make_draft_pick_internal;

-- Replace the renamed implementation so it retains the deployed reliability
-- behavior while using the current membership and team ownership schema.
CREATE OR REPLACE FUNCTION public.make_draft_pick_internal(
  p_draft_id UUID,
  p_player_id UUID,
  p_user_id UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_current_order RECORD;
  v_player RECORD;
  v_pick_number INTEGER;
  v_pick_time_ms INTEGER;
  v_user UUID;
  v_pick_id UUID;
  v_expected_version INTEGER;
BEGIN
  v_user := p_user_id;

  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Preserve the deployed pre-lock idempotency fast path while authorizing the
  -- supplied caller against the draft's league and current active team.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT pick.id INTO v_pick_id
    FROM public.draft_picks AS pick
    INNER JOIN public.drafts AS draft ON draft.id = pick.draft_id
    WHERE pick.draft_id = p_draft_id
      AND pick.league_id = draft.league_id
      AND pick.idempotency_key = p_idempotency_key
      AND pick.undone_at IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.league_memberships AS lm
          WHERE lm.user_id = v_user
            AND lm.league_id = draft.league_id
            AND lm.status = 'active'
            AND lm.role IN ('owner', 'admin')
        )
        OR EXISTS (
          SELECT 1
          FROM public.teams AS team
          WHERE team.id = draft.current_team_id
            AND team.league_id = draft.league_id
            AND team.status = 'active'
            AND team.captain_id = v_user
        )
      );

    IF v_pick_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'idempotent', true,
        'pick_id', v_pick_id
      );
    END IF;
  END IF;

  -- Lock draft row for update with NOWAIT to fail fast on contention.
  BEGIN
    SELECT d.* INTO v_draft
    FROM public.drafts AS d
    WHERE d.id = p_draft_id
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Draft is busy, please retry');
  END;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status::text <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not active');
  END IF;

  -- Store expected version for optimistic lock check.
  v_expected_version := v_draft.version;

  -- The current order row and team must both belong to this draft's league,
  -- and the draft's current_team_id must agree with the order row.
  SELECT
    draft_order.team_id,
    team.name AS team_name,
    team.captain_id
  INTO v_current_order
  FROM public.draft_order AS draft_order
  INNER JOIN public.teams AS team
    ON team.id = draft_order.team_id
   AND team.league_id = v_draft.league_id
   AND team.status = 'active'
  WHERE draft_order.draft_id = p_draft_id
    AND draft_order.league_id = v_draft.league_id
    AND draft_order.round = v_draft.current_round
    AND draft_order.pick_position = v_draft.current_pick
    AND draft_order.team_id = v_draft.current_team_id
  LIMIT 1;

  IF v_current_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Current draft team is not valid');
  END IF;

  -- Active league owners/admins may pick for any team. Otherwise, the caller
  -- must be the captain recorded on the active current team.
  IF NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user
      AND lm.league_id = v_draft.league_id
      AND lm.status = 'active'
      AND lm.role IN ('owner', 'admin')
  ) AND v_current_order.captain_id IS DISTINCT FROM v_user THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to pick for this team');
  END IF;

  -- Verify the player is available in this draft and the same league.
  SELECT pool.* INTO v_player
  FROM public.draft_pool AS pool
  WHERE pool.draft_id = p_draft_id
    AND pool.league_id = v_draft.league_id
    AND pool.player_id = p_player_id
    AND pool.is_drafted = FALSE
  FOR UPDATE NOWAIT;

  IF v_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not available');
  END IF;

  -- Calculate pick number and time.
  v_pick_number := ((v_draft.current_round - 1) * (
    SELECT COUNT(DISTINCT draft_order.team_id)
    FROM public.draft_order AS draft_order
    WHERE draft_order.draft_id = p_draft_id
      AND draft_order.league_id = v_draft.league_id
  )) + v_draft.current_pick;

  v_pick_time_ms := EXTRACT(EPOCH FROM (NOW() - v_draft.current_pick_started_at)) * 1000;

  -- Record the pick (unique constraints will prevent duplicates).
  BEGIN
    INSERT INTO public.draft_picks (
      draft_id, team_id, player_id, pick_number, round,
      picked_by, pick_time_ms, auto_picked, league_id, idempotency_key
    ) VALUES (
      p_draft_id, v_current_order.team_id, p_player_id, v_pick_number, v_draft.current_round,
      v_user, v_pick_time_ms, FALSE, v_draft.league_id, p_idempotency_key
    )
    RETURNING id INTO v_pick_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN json_build_object('success', false, 'error', 'Pick already made, please refresh');
  END;

  -- Mark player as drafted.
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_current_order.team_id,
      drafted_at = NOW()
  WHERE id = v_player.id;

  -- Update draft with last pick for undo (with optimistic lock check).
  UPDATE public.drafts
  SET last_pick_id = v_pick_id,
      undo_available = TRUE
  WHERE id = p_draft_id
    AND version = v_expected_version;

  IF NOT FOUND THEN
    RAISE WARNING 'Optimistic lock failed on draft %, pick still recorded', p_draft_id;
  END IF;

  -- Advance to next pick.
  PERFORM public.advance_draft_pick(p_draft_id);

  -- Send notification to drafted player.
  INSERT INTO public.notifications (
    league_id, user_id, type, channel, template_id, template_data,
    related_entity_type, related_entity_id, priority
  )
  SELECT
    v_draft.league_id,
    p_player_id,
    'draft_pick',
    'email',
    'draft_pick_v1',
    jsonb_build_object(
      'player_name', v_player.player_name,
      'team_name', v_current_order.team_name,
      'draft_name', COALESCE(v_draft.name, 'Season Draft'),
      'round_number', v_draft.current_round,
      'pick_number', v_pick_number,
      'league_name', (SELECT league.name FROM public.leagues AS league WHERE league.id = v_draft.league_id)
    ),
    'draft_pick',
    p_draft_id,
    7
  WHERE EXISTS (SELECT 1 FROM public.profiles AS profile WHERE profile.id = p_player_id);

  RETURN json_build_object(
    'success', true,
    'pick', json_build_object(
      'id', v_pick_id,
      'pick_number', v_pick_number,
      'round', v_draft.current_round,
      'team_id', v_current_order.team_id,
      'player_id', p_player_id,
      'player_name', v_player.player_name
    ),
    'state_version', v_draft.state_version + 1
  );
END;
$$;

COMMENT ON FUNCTION public.make_draft_pick_internal(UUID, UUID, UUID, UUID) IS
  'Internal idempotent draft-pick implementation; callable only by trusted service paths.';

-- Browser roles must not be able to invoke the internal function and spoof
-- p_user_id. The public wrapper below is their only draft-pick surface.
REVOKE ALL ON FUNCTION public.make_draft_pick_internal(UUID, UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.make_draft_pick_internal(UUID, UUID, UUID, UUID)
  TO service_role;

-- Canonical browser/API surface: exactly two arguments, caller identity derived
-- from the JWT, and active tenant role checked before the internal function runs.
CREATE OR REPLACE FUNCTION public.make_draft_pick(
  p_draft_id UUID,
  p_player_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_draft public.drafts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT d.* INTO v_draft
  FROM public.drafts AS d
  WHERE d.id = p_draft_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status::text <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not active');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = v_draft.league_id
      AND lm.status = 'active'
      AND lm.role IN ('owner', 'admin')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.teams AS team
    WHERE team.id = v_draft.current_team_id
      AND team.league_id = v_draft.league_id
      AND team.status = 'active'
      AND team.captain_id = v_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to pick for this team');
  END IF;

  RETURN public.make_draft_pick_internal(
    p_draft_id,
    p_player_id,
    v_user_id,
    gen_random_uuid()
  );
END;
$$;

COMMENT ON FUNCTION public.make_draft_pick(UUID, UUID) IS
  'Canonical authenticated draft-pick RPC; delegates to the internal idempotent implementation.';

REVOKE ALL ON FUNCTION public.make_draft_pick(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.make_draft_pick(UUID, UUID) TO authenticated, service_role;

COMMIT;
