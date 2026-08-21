BEGIN;

-- SECURITY DEFINER draft-control functions must authorize the caller explicitly.
-- Browser roles keep EXECUTE only on the authenticated surface.
CREATE OR REPLACE FUNCTION public.start_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_draft public.drafts%ROWTYPE;
  v_first_team_id UUID;
BEGIN
  SELECT d.* INTO v_draft
  FROM public.drafts AS d
  WHERE d.id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = v_draft.league_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only active league admins can start drafts');
  END IF;

  IF v_draft.status::text <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Draft already started');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.draft_order AS draft_order
    JOIN public.teams AS team ON team.id = draft_order.team_id
    WHERE draft_order.draft_id = p_draft_id
      AND draft_order.round = 1
      AND draft_order.league_id = v_draft.league_id
      AND team.league_id = v_draft.league_id
      AND team.status = 'active'
  ) OR EXISTS (
    SELECT 1
    FROM public.draft_order AS draft_order
    LEFT JOIN public.teams AS team ON team.id = draft_order.team_id
    WHERE draft_order.draft_id = p_draft_id
      AND (
        draft_order.league_id <> v_draft.league_id
        OR team.id IS NULL
        OR team.league_id <> v_draft.league_id
        OR team.status <> 'active'
      )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Draft order is missing or contains an invalid team');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.draft_pool AS pool
    WHERE pool.draft_id = p_draft_id
      AND pool.league_id = v_draft.league_id
      AND pool.is_drafted IS FALSE
  ) OR EXISTS (
    SELECT 1
    FROM public.draft_pool AS pool
    WHERE pool.draft_id = p_draft_id
      AND pool.league_id <> v_draft.league_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'No valid players in draft pool');
  END IF;

  SELECT draft_order.team_id INTO v_first_team_id
  FROM public.draft_order AS draft_order
  WHERE draft_order.draft_id = p_draft_id
    AND draft_order.round = 1
  ORDER BY draft_order.pick_position
  LIMIT 1;

  UPDATE public.drafts
  SET status = 'active',
      started_at = now(),
      current_round = 1,
      current_pick = 1,
      current_team_id = v_first_team_id,
      current_pick_started_at = now(),
      current_pick_expires_at = now() + (pick_time_seconds * interval '1 second')
  WHERE id = p_draft_id;

  RETURN json_build_object('success', true, 'message', 'Draft started');
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_draft public.drafts%ROWTYPE;
BEGIN
  SELECT d.* INTO v_draft
  FROM public.drafts AS d
  WHERE d.id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = v_draft.league_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only active league admins can pause drafts');
  END IF;

  IF v_draft.status::text <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Draft not active');
  END IF;

  UPDATE public.drafts
  SET status = 'paused',
      paused_at = now(),
      current_pick_expires_at = NULL
  WHERE id = p_draft_id;

  RETURN json_build_object('success', true, 'message', 'Draft paused');
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_draft public.drafts%ROWTYPE;
BEGIN
  SELECT d.* INTO v_draft
  FROM public.drafts AS d
  WHERE d.id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.league_memberships AS lm
    WHERE lm.user_id = v_user_id
      AND lm.league_id = v_draft.league_id
      AND lm.role IN ('owner', 'admin')
      AND lm.status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only active league admins can resume drafts');
  END IF;

  IF v_draft.status::text <> 'paused' THEN
    RETURN json_build_object('success', false, 'error', 'Draft not paused');
  END IF;

  UPDATE public.drafts
  SET status = 'active',
      paused_at = NULL,
      current_pick_started_at = now(),
      current_pick_expires_at = now() + (pick_time_seconds * interval '1 second')
  WHERE id = p_draft_id;

  RETURN json_build_object('success', true, 'message', 'Draft resumed');
END;
$$;

REVOKE ALL ON FUNCTION public.start_draft(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pause_draft(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resume_draft(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_draft(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pause_draft(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resume_draft(UUID) TO authenticated, service_role;

COMMIT;
