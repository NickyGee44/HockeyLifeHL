/**
 * Draft Room Reliability Fixes
 *
 * Addresses critical issues identified in SRE review:
 * - P0: Race condition protection (unique constraints, optimistic locking)
 * - P1: State versioning for drift detection
 * - P2: Undo operation hardening (soft deletes, locking)
 * - Auto-pick monitoring support
 */

-- =====================================================
-- 1. RACE CONDITION PROTECTION
-- =====================================================

-- Prevent duplicate pick numbers within a draft
ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS unique_draft_pick_number;
ALTER TABLE draft_picks
  ADD CONSTRAINT unique_draft_pick_number UNIQUE(draft_id, pick_number);

-- Prevent same player being drafted twice in same draft
ALTER TABLE draft_picks
  DROP CONSTRAINT IF EXISTS unique_draft_player;
ALTER TABLE draft_picks
  ADD CONSTRAINT unique_draft_player UNIQUE(draft_id, player_id);

-- Add idempotency key for pick deduplication
ALTER TABLE draft_picks
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_picks_idempotency
  ON draft_picks(draft_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN draft_picks.idempotency_key IS 'Client-provided key to prevent duplicate picks on retry';

-- =====================================================
-- 2. OPTIMISTIC LOCKING
-- =====================================================

-- Add version column for optimistic locking
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

COMMENT ON COLUMN drafts.version IS 'Optimistic lock version - incremented on every state change';

-- =====================================================
-- 3. STATE VERSIONING FOR DRIFT DETECTION
-- =====================================================

-- Add state version for client synchronization
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS state_version BIGINT DEFAULT 1;

COMMENT ON COLUMN drafts.state_version IS 'State version for client drift detection - incremented on every mutation';

-- Function to increment state version
CREATE OR REPLACE FUNCTION increment_draft_state_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.state_version := COALESCE(OLD.state_version, 0) + 1;
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment on any update
DROP TRIGGER IF EXISTS draft_state_version_trigger ON drafts;
CREATE TRIGGER draft_state_version_trigger
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION increment_draft_state_version();

-- =====================================================
-- 4. UNDO OPERATION HARDENING
-- =====================================================

-- Add undo lock flag to prevent race conditions
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS undo_in_progress BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN drafts.undo_in_progress IS 'Lock flag to prevent concurrent undo operations';

-- Soft delete support for picks (instead of hard delete)
ALTER TABLE draft_picks
  ADD COLUMN IF NOT EXISTS undone_at TIMESTAMPTZ;
ALTER TABLE draft_picks
  ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN draft_picks.undone_at IS 'Timestamp when pick was undone (soft delete)';
COMMENT ON COLUMN draft_picks.undone_by IS 'User who undid the pick';

-- Index for excluding undone picks
CREATE INDEX IF NOT EXISTS idx_draft_picks_active
  ON draft_picks(draft_id, pick_number)
  WHERE undone_at IS NULL;

-- Undo audit log
CREATE TABLE IF NOT EXISTS draft_undo_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  pick_id UUID NOT NULL,
  undone_by UUID NOT NULL REFERENCES profiles(id),
  undone_at TIMESTAMPTZ DEFAULT NOW(),

  -- State snapshots
  state_before JSONB NOT NULL,
  state_after JSONB NOT NULL,

  -- Pick details for audit
  player_id UUID,
  team_id UUID,
  pick_number INTEGER,
  round INTEGER
);

CREATE INDEX IF NOT EXISTS idx_draft_undo_log_draft
  ON draft_undo_log(draft_id, undone_at DESC);

ALTER TABLE draft_undo_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League admins can view undo log"
  ON draft_undo_log FOR SELECT
  USING (
    draft_id IN (
      SELECT d.id FROM drafts d
      INNER JOIN league_memberships lm ON lm.league_id = d.league_id
      WHERE lm.user_id = auth.uid() AND lm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. AUTO-PICK MONITORING
-- =====================================================

-- Track auto-pick attempts for monitoring
CREATE TABLE IF NOT EXISTS draft_auto_pick_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  pick_number INTEGER NOT NULL,
  round INTEGER NOT NULL,
  team_id UUID,

  -- Result
  success BOOLEAN NOT NULL,
  player_id UUID,
  error_message TEXT,

  -- Timing
  expires_at TIMESTAMPTZ,
  latency_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_auto_pick_log_draft
  ON draft_auto_pick_log(draft_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_auto_pick_log_failures
  ON draft_auto_pick_log(draft_id, success)
  WHERE success = FALSE;

COMMENT ON TABLE draft_auto_pick_log IS 'Audit log for auto-pick operations for monitoring and debugging';

-- =====================================================
-- 6. UPDATED MAKE_DRAFT_PICK WITH RELIABILITY FIXES
-- =====================================================

CREATE OR REPLACE FUNCTION make_draft_pick(
  p_draft_id UUID,
  p_player_id UUID,
  p_user_id UUID DEFAULT NULL,
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
  v_user := COALESCE(p_user_id, auth.uid());

  -- Check idempotency key first (fast path for retries)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_pick_id
    FROM public.draft_picks
    WHERE draft_id = p_draft_id
      AND idempotency_key = p_idempotency_key
      AND undone_at IS NULL;

    IF v_pick_id IS NOT NULL THEN
      -- Already processed, return success
      RETURN json_build_object(
        'success', true,
        'idempotent', true,
        'pick_id', v_pick_id
      );
    END IF;
  END IF;

  -- Lock draft row for update with NOWAIT to fail fast on contention
  BEGIN
    SELECT * INTO v_draft
    FROM public.drafts
    WHERE id = p_draft_id
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Draft is busy, please retry');
  END;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not active');
  END IF;

  -- Store expected version for optimistic lock check
  v_expected_version := v_draft.version;

  -- Get current pick order
  SELECT do.*, t.id as team_id
  INTO v_current_order
  FROM public.draft_order do
  INNER JOIN public.teams t ON t.id = do.team_id
  WHERE do.draft_id = p_draft_id
    AND do.round = v_draft.current_round
    AND do.pick_position = v_draft.current_pick
  LIMIT 1;

  -- Verify user is captain of current team or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user
      AND team_id = v_current_order.team_id
      AND role = 'captain'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user
      AND league_id = v_draft.league_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to pick for this team');
  END IF;

  -- Verify player is available (with lock)
  SELECT * INTO v_player
  FROM public.draft_pool
  WHERE draft_id = p_draft_id
    AND player_id = p_player_id
    AND is_drafted = FALSE
  FOR UPDATE NOWAIT;

  IF v_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not available');
  END IF;

  -- Calculate pick number and time
  v_pick_number := ((v_draft.current_round - 1) * (
    SELECT COUNT(DISTINCT team_id) FROM public.draft_order WHERE draft_id = p_draft_id
  )) + v_draft.current_pick;

  v_pick_time_ms := EXTRACT(EPOCH FROM (NOW() - v_draft.current_pick_started_at)) * 1000;

  -- Record the pick (unique constraints will prevent duplicates)
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
      -- Race condition: another pick was made first
      RETURN json_build_object('success', false, 'error', 'Pick already made, please refresh');
  END;

  -- Mark player as drafted
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_current_order.team_id,
      drafted_at = NOW()
  WHERE id = v_player.id;

  -- Update draft with last pick for undo (with optimistic lock check)
  UPDATE public.drafts
  SET last_pick_id = v_pick_id,
      undo_available = TRUE
  WHERE id = p_draft_id
    AND version = v_expected_version;

  IF NOT FOUND THEN
    -- Optimistic lock failed - concurrent modification
    -- The pick is already recorded, so this is just a warning
    RAISE WARNING 'Optimistic lock failed on draft %, pick still recorded', p_draft_id;
  END IF;

  -- Advance to next pick
  PERFORM public.advance_draft_pick(p_draft_id);

  -- Send notification to drafted player
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
      'team_name', (SELECT name FROM public.teams WHERE id = v_current_order.team_id),
      'draft_name', COALESCE(v_draft.name, 'Season Draft'),
      'round_number', v_draft.current_round,
      'pick_number', v_pick_number,
      'league_name', (SELECT name FROM public.leagues WHERE id = v_draft.league_id)
    ),
    'draft_pick',
    p_draft_id,
    7
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id);

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

-- =====================================================
-- 7. UPDATED UNDO_LAST_PICK WITH HARDENING
-- =====================================================

CREATE OR REPLACE FUNCTION undo_last_pick(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_last_pick RECORD;
  v_user_id UUID;
  v_prev_team_id UUID;
  v_prev_round INTEGER;
  v_prev_pick INTEGER;
  v_state_before JSONB;
  v_state_after JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Acquire exclusive lock and check undo_in_progress atomically
  UPDATE public.drafts
  SET undo_in_progress = TRUE
  WHERE id = p_draft_id
    AND undo_in_progress = FALSE
    AND status IN ('active', 'paused')
  RETURNING * INTO v_draft;

  IF v_draft IS NULL THEN
    -- Check why we couldn't acquire lock
    SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id;

    IF v_draft IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Draft not found');
    ELSIF v_draft.undo_in_progress THEN
      RETURN json_build_object('success', false, 'error', 'Another undo operation is in progress');
    ELSIF v_draft.status NOT IN ('active', 'paused') THEN
      RETURN json_build_object('success', false, 'error', 'Draft is not active');
    END IF;

    RETURN json_build_object('success', false, 'error', 'Cannot undo at this time');
  END IF;

  -- Capture state before
  v_state_before := jsonb_build_object(
    'current_round', v_draft.current_round,
    'current_pick', v_draft.current_pick,
    'current_team_id', v_draft.current_team_id,
    'last_pick_id', v_draft.last_pick_id,
    'state_version', v_draft.state_version
  );

  IF NOT v_draft.undo_available OR v_draft.last_pick_id IS NULL THEN
    -- Release lock
    UPDATE public.drafts SET undo_in_progress = FALSE WHERE id = p_draft_id;
    RETURN json_build_object('success', false, 'error', 'No pick available to undo');
  END IF;

  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user_id
      AND league_id = v_draft.league_id
      AND role IN ('owner', 'admin')
  ) THEN
    -- Release lock
    UPDATE public.drafts SET undo_in_progress = FALSE WHERE id = p_draft_id;
    RETURN json_build_object('success', false, 'error', 'Only commissioners can undo picks');
  END IF;

  -- Get the last pick
  SELECT * INTO v_last_pick
  FROM public.draft_picks
  WHERE id = v_draft.last_pick_id
    AND undone_at IS NULL;

  IF v_last_pick IS NULL THEN
    -- Release lock
    UPDATE public.drafts SET undo_in_progress = FALSE WHERE id = p_draft_id;
    RETURN json_build_object('success', false, 'error', 'Last pick not found or already undone');
  END IF;

  -- Soft delete the pick (instead of hard delete)
  UPDATE public.draft_picks
  SET undone_at = NOW(),
      undone_by = v_user_id
  WHERE id = v_last_pick.id;

  -- Mark player as available again
  UPDATE public.draft_pool
  SET is_drafted = FALSE,
      drafted_by_team_id = NULL,
      drafted_at = NULL
  WHERE draft_id = p_draft_id
    AND player_id = v_last_pick.player_id;

  -- Calculate previous position
  v_prev_round := v_last_pick.round;
  v_prev_pick := v_last_pick.pick_number - ((v_last_pick.round - 1) * (
    SELECT COUNT(DISTINCT team_id) FROM public.draft_order WHERE draft_id = p_draft_id
  ));

  -- Adjust if we're at the start of a round
  IF v_prev_pick < 1 THEN
    v_prev_round := v_prev_round - 1;
    v_prev_pick := (SELECT COUNT(DISTINCT team_id) FROM public.draft_order WHERE draft_id = p_draft_id);
  END IF;

  -- Get the team for this position
  SELECT team_id INTO v_prev_team_id
  FROM public.draft_order
  WHERE draft_id = p_draft_id
    AND round = v_prev_round
    AND pick_position = v_prev_pick;

  -- Find the previous pick for new last_pick_id
  DECLARE
    v_new_last_pick_id UUID;
  BEGIN
    SELECT id INTO v_new_last_pick_id
    FROM public.draft_picks
    WHERE draft_id = p_draft_id
      AND undone_at IS NULL
      AND pick_number < v_last_pick.pick_number
    ORDER BY pick_number DESC
    LIMIT 1;

    -- Update draft state (releases undo_in_progress lock)
    UPDATE public.drafts
    SET current_round = v_prev_round,
        current_pick = v_prev_pick,
        current_team_id = v_prev_team_id,
        current_pick_started_at = NOW(),
        current_pick_expires_at = NOW() + (pick_time_seconds * INTERVAL '1 second'),
        last_pick_id = v_new_last_pick_id,
        undo_available = (v_new_last_pick_id IS NOT NULL),
        undo_in_progress = FALSE
    WHERE id = p_draft_id;
  END;

  -- Capture state after
  SELECT jsonb_build_object(
    'current_round', current_round,
    'current_pick', current_pick,
    'current_team_id', current_team_id,
    'last_pick_id', last_pick_id,
    'state_version', state_version
  ) INTO v_state_after
  FROM public.drafts WHERE id = p_draft_id;

  -- Log the undo operation
  INSERT INTO public.draft_undo_log (
    draft_id, pick_id, undone_by,
    state_before, state_after,
    player_id, team_id, pick_number, round
  ) VALUES (
    p_draft_id, v_last_pick.id, v_user_id,
    v_state_before, v_state_after,
    v_last_pick.player_id, v_last_pick.team_id,
    v_last_pick.pick_number, v_last_pick.round
  );

  -- Insert system message
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  VALUES (
    p_draft_id,
    v_draft.league_id,
    v_user_id,
    format('Undo: Pick #%s (%s) was undone by commissioner',
      v_last_pick.pick_number,
      (SELECT player_name FROM public.draft_pool WHERE draft_id = p_draft_id AND player_id = v_last_pick.player_id)
    ),
    'system'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Pick undone successfully',
    'restored_player', v_last_pick.player_id,
    'state_version', (SELECT state_version FROM public.drafts WHERE id = p_draft_id)
  );

EXCEPTION WHEN OTHERS THEN
  -- Ensure lock is released on any error
  UPDATE public.drafts SET undo_in_progress = FALSE WHERE id = p_draft_id;
  RAISE;
END;
$$;

-- =====================================================
-- 8. AUTO-PICK WITH LOGGING
-- =====================================================

CREATE OR REPLACE FUNCTION auto_pick_player(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_best_player RECORD;
  v_result JSON;
  v_start_time TIMESTAMPTZ := NOW();
  v_pick_id UUID;
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id FOR UPDATE NOWAIT;

  IF v_draft.status != 'active' THEN
    -- Log failed attempt
    INSERT INTO public.draft_auto_pick_log (
      draft_id, pick_number, round, team_id, success, error_message, expires_at
    ) VALUES (
      p_draft_id, v_draft.current_pick, v_draft.current_round,
      v_draft.current_team_id, FALSE, 'Draft not active', v_draft.current_pick_expires_at
    );
    RETURN json_build_object('success', false, 'error', 'Draft not active');
  END IF;

  -- Get best available player
  SELECT * INTO v_best_player
  FROM public.draft_pool
  WHERE draft_id = p_draft_id
    AND is_drafted = FALSE
  ORDER BY auto_pick_rank NULLS LAST, player_name
  LIMIT 1;

  IF v_best_player IS NULL THEN
    -- No players left, complete draft
    UPDATE public.drafts SET status = 'complete', completed_at = NOW() WHERE id = p_draft_id;

    INSERT INTO public.draft_auto_pick_log (
      draft_id, pick_number, round, team_id, success, error_message, expires_at
    ) VALUES (
      p_draft_id, v_draft.current_pick, v_draft.current_round,
      v_draft.current_team_id, FALSE, 'No players available', v_draft.current_pick_expires_at
    );

    RETURN json_build_object('success', false, 'error', 'No players available');
  END IF;

  -- Make the pick (with auto_picked flag)
  BEGIN
    INSERT INTO public.draft_picks (
      draft_id, team_id, player_id, pick_number, round,
      auto_picked, league_id
    ) VALUES (
      p_draft_id,
      v_draft.current_team_id,
      v_best_player.player_id,
      ((v_draft.current_round - 1) * (
        SELECT COUNT(DISTINCT team_id) FROM public.draft_order WHERE draft_id = p_draft_id
      )) + v_draft.current_pick,
      v_draft.current_round,
      TRUE,
      v_draft.league_id
    )
    RETURNING id INTO v_pick_id;
  EXCEPTION WHEN unique_violation THEN
    -- Pick already made by someone else
    INSERT INTO public.draft_auto_pick_log (
      draft_id, pick_number, round, team_id, success, error_message, expires_at,
      latency_ms
    ) VALUES (
      p_draft_id, v_draft.current_pick, v_draft.current_round,
      v_draft.current_team_id, FALSE, 'Pick already made',
      v_draft.current_pick_expires_at,
      EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
    );
    RETURN json_build_object('success', false, 'error', 'Pick already made');
  END;

  -- Mark player as drafted
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_draft.current_team_id,
      drafted_at = NOW()
  WHERE id = v_best_player.id;

  -- Update last pick for undo
  UPDATE public.drafts
  SET last_pick_id = v_pick_id,
      undo_available = TRUE
  WHERE id = p_draft_id;

  -- Advance draft
  PERFORM public.advance_draft_pick(p_draft_id);

  -- Log successful auto-pick
  INSERT INTO public.draft_auto_pick_log (
    draft_id, pick_number, round, team_id, success,
    player_id, expires_at, latency_ms
  ) VALUES (
    p_draft_id, v_draft.current_pick, v_draft.current_round,
    v_draft.current_team_id, TRUE,
    v_best_player.player_id, v_draft.current_pick_expires_at,
    EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000
  );

  -- Insert system message about auto-pick
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  SELECT
    p_draft_id,
    v_draft.league_id,
    v_draft.current_team_id,
    format('Auto-picked: %s (timeout)', v_best_player.player_name),
    'system'
  WHERE v_draft.league_id IS NOT NULL;

  RETURN json_build_object(
    'success', true,
    'auto_picked', true,
    'player_id', v_best_player.player_id,
    'player_name', v_best_player.player_name,
    'pick_id', v_pick_id
  );

EXCEPTION WHEN lock_not_available THEN
  -- Another process is handling this draft
  RETURN json_build_object('success', false, 'error', 'Draft is busy');
END;
$$;

-- =====================================================
-- 9. FUNCTION TO GET EXPIRED DRAFTS FOR CRON
-- =====================================================

CREATE OR REPLACE FUNCTION get_expired_draft_picks()
RETURNS TABLE(draft_id UUID, expires_at TIMESTAMPTZ, team_id UUID, round INTEGER, pick INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as draft_id,
    d.current_pick_expires_at as expires_at,
    d.current_team_id as team_id,
    d.current_round as round,
    d.current_pick as pick
  FROM public.drafts d
  WHERE d.status = 'active'
    AND d.auto_pick_enabled = TRUE
    AND d.current_pick_expires_at IS NOT NULL
    AND d.current_pick_expires_at < NOW();
END;
$$;

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT SELECT ON draft_auto_pick_log TO authenticated;
GRANT SELECT ON draft_undo_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_expired_draft_picks TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
