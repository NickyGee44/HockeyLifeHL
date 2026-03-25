/**
 * Live Draft Room System
 *
 * Purpose: Fantasy-style player draft with real-time updates
 *
 * Features:
 * - Real-time draft board via Supabase Realtime
 * - Pick timer with auto-pick on timeout
 * - Snake draft format (1-2-3...3-2-1)
 * - Captain chat during draft
 * - Draft order with current pick highlight
 *
 * Tables:
 * - drafts: Enhanced with timer and real-time settings
 * - draft_picks: Enhanced with auto_picked flag
 * - draft_order: Pre-computed pick sequence
 * - draft_messages: Captain chat during draft
 * - draft_pool: Available players for draft
 */

-- =====================================================
-- 1. ENHANCE DRAFTS TABLE
-- =====================================================

-- Add timer and real-time fields to drafts
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS pick_time_seconds INTEGER DEFAULT 90;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS auto_pick_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS snake_draft BOOLEAN DEFAULT TRUE;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS total_rounds INTEGER;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS current_pick_started_at TIMESTAMPTZ;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS current_pick_expires_at TIMESTAMPTZ;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS current_team_id UUID REFERENCES teams(id);
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Update status enum to include all states
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
DO $$
BEGIN
  -- Drop the enum type if it exists and recreate
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_status') THEN
    -- Create new status check constraint instead of modifying enum
    NULL;
  END IF;
END $$;

-- Add constraint for valid status values
ALTER TABLE drafts ADD CONSTRAINT valid_draft_status
  CHECK (status::text IN ('pending', 'active', 'paused', 'complete', 'cancelled'));

-- Index for active drafts
CREATE INDEX IF NOT EXISTS idx_drafts_active
  ON drafts(league_id, status)
  WHERE status IN ('active', 'paused');

CREATE INDEX IF NOT EXISTS idx_drafts_current_team
  ON drafts(current_team_id)
  WHERE status = 'active';

COMMENT ON COLUMN drafts.pick_time_seconds IS 'Time allowed per pick in seconds (30-300)';
COMMENT ON COLUMN drafts.snake_draft IS 'If true, draft order reverses each round';
COMMENT ON COLUMN drafts.current_pick_expires_at IS 'When current pick times out for auto-pick';

-- =====================================================
-- 2. ENHANCE DRAFT_PICKS TABLE
-- =====================================================

-- Add fields for enhanced pick tracking
ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS auto_picked BOOLEAN DEFAULT FALSE;
ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS picked_by UUID REFERENCES profiles(id);
ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS pick_time_ms INTEGER; -- How long captain took

-- Index for finding picks by draft and order
CREATE INDEX IF NOT EXISTS idx_draft_picks_order
  ON draft_picks(draft_id, pick_number);

CREATE INDEX IF NOT EXISTS idx_draft_picks_player
  ON draft_picks(player_id);

COMMENT ON COLUMN draft_picks.auto_picked IS 'True if system auto-picked due to timeout';
COMMENT ON COLUMN draft_picks.picked_by IS 'User who made the pick (captain)';
COMMENT ON COLUMN draft_picks.pick_time_ms IS 'Milliseconds taken to make this pick';

-- =====================================================
-- 3. ENHANCE DRAFT_ORDER TABLE
-- =====================================================

-- Add round tracking for snake draft
ALTER TABLE draft_order ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;

-- Create unique constraint for pick order
ALTER TABLE draft_order DROP CONSTRAINT IF EXISTS unique_draft_pick_position;
ALTER TABLE draft_order ADD CONSTRAINT unique_draft_pick_position
  UNIQUE(draft_id, round, pick_position);

CREATE INDEX IF NOT EXISTS idx_draft_order_sequence
  ON draft_order(draft_id, round, pick_position);

-- =====================================================
-- 4. CREATE DRAFT_POOL TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Player info cached for performance
  player_name TEXT NOT NULL,
  position TEXT, -- C, LW, RW, D, G
  skill_level TEXT, -- A, B, C, D

  -- Draft status
  is_drafted BOOLEAN DEFAULT FALSE,
  drafted_by_team_id UUID REFERENCES teams(id),
  drafted_at TIMESTAMPTZ,

  -- Ranking for auto-pick
  auto_pick_rank INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_player_per_draft UNIQUE(draft_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_pool_available
  ON draft_pool(draft_id, is_drafted)
  WHERE is_drafted = FALSE;

CREATE INDEX IF NOT EXISTS idx_draft_pool_rank
  ON draft_pool(draft_id, auto_pick_rank)
  WHERE is_drafted = FALSE;

ALTER TABLE draft_pool ENABLE ROW LEVEL SECURITY;

-- Anyone in league can view draft pool during draft
CREATE POLICY "League members can view draft pool"
  ON draft_pool FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE draft_pool IS 'Players available for selection in a draft';

-- =====================================================
-- 5. CREATE DRAFT_MESSAGES TABLE (Captain Chat)
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),

  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat', -- chat, system, pick_announcement

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT message_not_empty CHECK (length(trim(message)) > 0),
  CONSTRAINT message_max_length CHECK (length(message) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_draft_messages_draft
  ON draft_messages(draft_id, created_at DESC);

ALTER TABLE draft_messages ENABLE ROW LEVEL SECURITY;

-- Captains and admins can view messages
CREATE POLICY "Draft participants can view messages"
  ON draft_messages FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'captain')
    )
  );

-- Captains can send messages
CREATE POLICY "Captains can send messages"
  ON draft_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'captain')
    )
  );

COMMENT ON TABLE draft_messages IS 'Real-time chat messages during live draft';

-- =====================================================
-- 6. DRAFT RPC FUNCTIONS
-- =====================================================

/**
 * Function: get_draft_state
 * Returns complete current state of a draft for UI rendering
 */
CREATE OR REPLACE FUNCTION get_draft_state(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_current_order RECORD;
  v_result JSON;
BEGIN
  -- Get draft info
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id;

  IF v_draft IS NULL THEN
    RETURN json_build_object('error', 'Draft not found');
  END IF;

  -- Get current pick order info
  SELECT do.*, t.name as team_name
  INTO v_current_order
  FROM public.draft_order do
  INNER JOIN public.teams t ON t.id = do.team_id
  WHERE do.draft_id = p_draft_id
    AND do.round = v_draft.current_round
    AND do.pick_position = v_draft.current_pick
  LIMIT 1;

  RETURN json_build_object(
    'draft', row_to_json(v_draft),
    'current_pick', json_build_object(
      'round', v_draft.current_round,
      'pick', v_draft.current_pick,
      'team_id', v_current_order.team_id,
      'team_name', v_current_order.team_name,
      'expires_at', v_draft.current_pick_expires_at
    ),
    'picks_made', (
      SELECT COUNT(*) FROM public.draft_picks WHERE draft_id = p_draft_id
    ),
    'players_remaining', (
      SELECT COUNT(*) FROM public.draft_pool
      WHERE draft_id = p_draft_id AND is_drafted = FALSE
    )
  );
END;
$$;

/**
 * Function: get_available_players
 * Returns players available for draft with optional filtering
 */
CREATE OR REPLACE FUNCTION get_available_players(
  p_draft_id UUID,
  p_position TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  position TEXT,
  skill_level TEXT,
  auto_pick_rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.player_id,
    dp.player_name,
    dp.position,
    dp.skill_level,
    dp.auto_pick_rank
  FROM public.draft_pool dp
  WHERE dp.draft_id = p_draft_id
    AND dp.is_drafted = FALSE
    AND (p_position IS NULL OR dp.position = p_position)
    AND (p_search IS NULL OR dp.player_name ILIKE '%' || p_search || '%')
  ORDER BY dp.auto_pick_rank NULLS LAST, dp.player_name
  LIMIT p_limit;
END;
$$;

/**
 * Function: make_draft_pick
 * Validates and records a draft pick
 */
CREATE OR REPLACE FUNCTION make_draft_pick(
  p_draft_id UUID,
  p_player_id UUID,
  p_user_id UUID DEFAULT NULL
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
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());

  -- Lock draft row for update
  SELECT * INTO v_draft
  FROM public.drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not active');
  END IF;

  -- Get current pick order
  SELECT do.*, t.id as team_id
  INTO v_current_order
  FROM public.draft_order do
  INNER JOIN public.teams t ON t.id = do.team_id
  WHERE do.draft_id = p_draft_id
    AND do.round = v_draft.current_round
    AND do.pick_position = v_draft.current_pick
  LIMIT 1;

  -- Verify user is captain of current team
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

  -- Verify player is available
  SELECT * INTO v_player
  FROM public.draft_pool
  WHERE draft_id = p_draft_id
    AND player_id = p_player_id
    AND is_drafted = FALSE
  FOR UPDATE;

  IF v_player IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Player not available');
  END IF;

  -- Calculate pick number and time
  v_pick_number := ((v_draft.current_round - 1) * (
    SELECT COUNT(DISTINCT team_id) FROM public.draft_order WHERE draft_id = p_draft_id
  )) + v_draft.current_pick;

  v_pick_time_ms := EXTRACT(EPOCH FROM (NOW() - v_draft.current_pick_started_at)) * 1000;

  -- Record the pick
  INSERT INTO public.draft_picks (
    draft_id, team_id, player_id, pick_number, round,
    picked_by, pick_time_ms, auto_picked, league_id
  ) VALUES (
    p_draft_id, v_current_order.team_id, p_player_id, v_pick_number, v_draft.current_round,
    v_user, v_pick_time_ms, FALSE, v_draft.league_id
  );

  -- Mark player as drafted
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_current_order.team_id,
      drafted_at = NOW()
  WHERE id = v_player.id;

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
      'pick_number', v_pick_number,
      'round', v_draft.current_round,
      'team_id', v_current_order.team_id,
      'player_id', p_player_id,
      'player_name', v_player.player_name
    )
  );
END;
$$;

/**
 * Function: advance_draft_pick
 * Moves to the next pick in the draft
 */
CREATE OR REPLACE FUNCTION advance_draft_pick(p_draft_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_team_count INTEGER;
  v_next_pick INTEGER;
  v_next_round INTEGER;
  v_next_team_id UUID;
  v_is_complete BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id FOR UPDATE;

  -- Count teams in draft
  SELECT COUNT(DISTINCT team_id) INTO v_team_count
  FROM public.draft_order WHERE draft_id = p_draft_id;

  -- Calculate next pick position
  IF v_draft.current_pick >= v_team_count THEN
    -- Move to next round
    v_next_round := v_draft.current_round + 1;
    v_next_pick := 1;

    -- Check if draft is complete
    IF v_draft.total_rounds IS NOT NULL AND v_next_round > v_draft.total_rounds THEN
      v_is_complete := TRUE;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.draft_pool
      WHERE draft_id = p_draft_id AND is_drafted = FALSE
    ) THEN
      v_is_complete := TRUE;
    END IF;
  ELSE
    v_next_round := v_draft.current_round;
    v_next_pick := v_draft.current_pick + 1;
  END IF;

  IF v_is_complete THEN
    UPDATE public.drafts
    SET status = 'complete',
        completed_at = NOW(),
        current_pick_expires_at = NULL
    WHERE id = p_draft_id;

    RETURN TRUE;
  END IF;

  -- Get next team (respecting snake draft)
  SELECT team_id INTO v_next_team_id
  FROM public.draft_order
  WHERE draft_id = p_draft_id
    AND round = v_next_round
    AND pick_position = v_next_pick;

  -- If no order for this round yet, generate it (snake)
  IF v_next_team_id IS NULL AND v_draft.snake_draft THEN
    -- Snake: reverse order on odd rounds after first
    INSERT INTO public.draft_order (draft_id, team_id, pick_position, round, league_id)
    SELECT
      p_draft_id,
      team_id,
      CASE
        WHEN v_next_round % 2 = 0 THEN v_team_count - pick_position + 1
        ELSE pick_position
      END,
      v_next_round,
      v_draft.league_id
    FROM public.draft_order
    WHERE draft_id = p_draft_id AND round = 1;

    SELECT team_id INTO v_next_team_id
    FROM public.draft_order
    WHERE draft_id = p_draft_id
      AND round = v_next_round
      AND pick_position = v_next_pick;
  END IF;

  -- Update draft state
  UPDATE public.drafts
  SET current_pick = v_next_pick,
      current_round = v_next_round,
      current_team_id = v_next_team_id,
      current_pick_started_at = NOW(),
      current_pick_expires_at = NOW() + (pick_time_seconds * INTERVAL '1 second')
  WHERE id = p_draft_id;

  RETURN TRUE;
END;
$$;

/**
 * Function: auto_pick_player
 * Automatically picks best available player for current team
 */
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
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id;

  IF v_draft.status != 'active' THEN
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
    RETURN json_build_object('success', false, 'error', 'No players available');
  END IF;

  -- Make the pick (with auto_picked flag)
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
  );

  -- Mark player as drafted
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_draft.current_team_id,
      drafted_at = NOW()
  WHERE id = v_best_player.id;

  -- Advance draft
  PERFORM public.advance_draft_pick(p_draft_id);

  -- Insert system message about auto-pick
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  SELECT
    p_draft_id,
    v_draft.league_id,
    v_draft.current_team_id, -- Using team_id as placeholder
    format('Auto-picked: %s', v_best_player.player_name),
    'system'
  WHERE v_draft.league_id IS NOT NULL;

  RETURN json_build_object(
    'success', true,
    'auto_picked', true,
    'player_id', v_best_player.player_id,
    'player_name', v_best_player.player_name
  );
END;
$$;

/**
 * Function: start_draft
 * Initializes and starts a draft
 */
CREATE OR REPLACE FUNCTION start_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_first_team_id UUID;
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Draft already started');
  END IF;

  -- Verify draft order exists
  IF NOT EXISTS (SELECT 1 FROM public.draft_order WHERE draft_id = p_draft_id) THEN
    RETURN json_build_object('success', false, 'error', 'Draft order not set');
  END IF;

  -- Verify players in pool
  IF NOT EXISTS (SELECT 1 FROM public.draft_pool WHERE draft_id = p_draft_id AND is_drafted = FALSE) THEN
    RETURN json_build_object('success', false, 'error', 'No players in draft pool');
  END IF;

  -- Get first team
  SELECT team_id INTO v_first_team_id
  FROM public.draft_order
  WHERE draft_id = p_draft_id AND round = 1
  ORDER BY pick_position
  LIMIT 1;

  -- Start the draft
  UPDATE public.drafts
  SET status = 'active',
      started_at = NOW(),
      current_round = 1,
      current_pick = 1,
      current_team_id = v_first_team_id,
      current_pick_started_at = NOW(),
      current_pick_expires_at = NOW() + (pick_time_seconds * INTERVAL '1 second')
  WHERE id = p_draft_id;

  -- Insert system message
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  VALUES (p_draft_id, v_draft.league_id, v_first_team_id, 'Draft has started!', 'system');

  RETURN json_build_object('success', true, 'message', 'Draft started');
END;
$$;

/**
 * Function: pause_draft
 * Pauses an active draft
 */
CREATE OR REPLACE FUNCTION pause_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.drafts
  SET status = 'paused',
      paused_at = NOW(),
      current_pick_expires_at = NULL
  WHERE id = p_draft_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not active');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Draft paused');
END;
$$;

/**
 * Function: resume_draft
 * Resumes a paused draft
 */
CREATE OR REPLACE FUNCTION resume_draft(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id FOR UPDATE;

  IF v_draft.status != 'paused' THEN
    RETURN json_build_object('success', false, 'error', 'Draft not paused');
  END IF;

  UPDATE public.drafts
  SET status = 'active',
      paused_at = NULL,
      current_pick_started_at = NOW(),
      current_pick_expires_at = NOW() + (pick_time_seconds * INTERVAL '1 second')
  WHERE id = p_draft_id;

  RETURN json_build_object('success', true, 'message', 'Draft resumed');
END;
$$;

-- =====================================================
-- 7. REALTIME CONFIGURATION
-- =====================================================

-- Enable realtime for draft tables
ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;

-- =====================================================
-- 8. GRANTS
-- =====================================================

GRANT SELECT ON draft_pool TO authenticated;
GRANT SELECT, INSERT ON draft_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_draft_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_players TO authenticated;
GRANT EXECUTE ON FUNCTION make_draft_pick TO authenticated;
GRANT EXECUTE ON FUNCTION start_draft TO authenticated;
GRANT EXECUTE ON FUNCTION pause_draft TO authenticated;
GRANT EXECUTE ON FUNCTION resume_draft TO authenticated;

-- Service role for auto-pick cron
GRANT EXECUTE ON FUNCTION auto_pick_player TO service_role;
GRANT EXECUTE ON FUNCTION advance_draft_pick TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
