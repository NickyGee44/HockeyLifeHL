-- Canonicalized from legacy short migration version 20260201.

-- Source of truth copied from supabase_migrations.schema_migrations so Supabase CLI can resolve an exact version.



/**
 * Draft Room Enhancements
 *
 * Purpose: Add trade picks, undo functionality, and draft setup configuration
 *
 * Features:
 * - Trade picks between teams (swap future picks)
 * - Undo last pick (commissioner only)
 * - Draft setup wizard support
 * - Post-draft roster confirmation tracking
 */

-- =====================================================
-- 1. DRAFT PICK TRADES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_pick_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Trade details
  from_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- The pick being traded
  round INTEGER NOT NULL,
  original_pick_position INTEGER NOT NULL,

  -- Trade metadata
  traded_at TIMESTAMPTZ DEFAULT NOW(),
  traded_by UUID REFERENCES profiles(id),
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_trade_teams CHECK (from_team_id != to_team_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_pick_trades_draft
  ON draft_pick_trades(draft_id);

CREATE INDEX IF NOT EXISTS idx_draft_pick_trades_teams
  ON draft_pick_trades(from_team_id, to_team_id);

ALTER TABLE draft_pick_trades ENABLE ROW LEVEL SECURITY;

-- League admins can view and manage trades
CREATE POLICY "League admins can view trades"
  ON draft_pick_trades FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "League admins can create trades"
  ON draft_pick_trades FOR INSERT
  WITH CHECK (
    traded_by = auth.uid()
    AND league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE draft_pick_trades IS 'Tracks traded draft picks between teams';

-- =====================================================
-- 2. DRAFT PICK HISTORY FOR UNDO
-- =====================================================

-- Add undo tracking to drafts
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS last_pick_id UUID REFERENCES draft_picks(id);

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS undo_available BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN drafts.last_pick_id IS 'Reference to last pick made for undo functionality';

COMMENT ON COLUMN drafts.undo_available IS 'Whether undo is available (only for most recent pick)';

-- =====================================================
-- 3. ROSTER CONFIRMATION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS draft_roster_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Confirmation details
  confirmed_by UUID NOT NULL REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Optional notes or issues
  notes TEXT,
  has_issues BOOLEAN DEFAULT FALSE,

  CONSTRAINT unique_roster_confirmation UNIQUE(draft_id, team_id)
);

ALTER TABLE draft_roster_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team captains can view roster confirmations"
  ON draft_roster_confirmations FOR SELECT
  USING (
    league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'captain')
    )
  );

CREATE POLICY "Team captains can confirm rosters"
  ON draft_roster_confirmations FOR INSERT
  WITH CHECK (
    confirmed_by = auth.uid()
    AND league_id IN (
      SELECT league_id FROM league_memberships
      WHERE user_id = auth.uid()
      AND (role IN ('owner', 'admin') OR (role = 'captain' AND team_id = draft_roster_confirmations.team_id))
    )
  );

COMMENT ON TABLE draft_roster_confirmations IS 'Tracks post-draft roster confirmations by team captains';

-- =====================================================
-- 4. DRAFT SETUP/CONFIGURATION TABLE
-- =====================================================

-- Add draft configuration fields
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS draft_type TEXT DEFAULT 'snake' CHECK (draft_type IN ('snake', 'linear'));

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS allow_trades BOOLEAN DEFAULT TRUE;

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN DEFAULT TRUE;

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS require_roster_confirmation BOOLEAN DEFAULT TRUE;

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS min_roster_size INTEGER DEFAULT 10;

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS max_roster_size INTEGER DEFAULT 20;

ALTER TABLE drafts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN drafts.draft_type IS 'Type of draft: snake (order reverses each round) or linear (same order each round)';

COMMENT ON COLUMN drafts.allow_trades IS 'Whether pick trading is allowed during this draft';

COMMENT ON COLUMN drafts.auto_advance IS 'Whether to automatically advance after auto-pick';

COMMENT ON COLUMN drafts.require_roster_confirmation IS 'Whether captains must confirm their roster after draft';

-- =====================================================
-- 5. TRADE PICKS FUNCTION
-- =====================================================

/**
 * Function: trade_draft_pick
 * Swaps a future draft pick between two teams
 */
CREATE OR REPLACE FUNCTION trade_draft_pick(
  p_draft_id UUID,
  p_from_team_id UUID,
  p_to_team_id UUID,
  p_round INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_from_order RECORD;
  v_user_id UUID;
  v_trade_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Lock draft
  SELECT * INTO v_draft
  FROM public.drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF NOT v_draft.allow_trades THEN
    RETURN json_build_object('success', false, 'error', 'Trading is not allowed in this draft');
  END IF;

  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user_id
      AND league_id = v_draft.league_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can trade picks');
  END IF;

  -- Can't trade picks from completed rounds
  IF p_round <= v_draft.current_round THEN
    RETURN json_build_object('success', false, 'error', 'Cannot trade picks from current or past rounds');
  END IF;

  -- Find the pick in draft_order
  SELECT * INTO v_from_order
  FROM public.draft_order
  WHERE draft_id = p_draft_id
    AND team_id = p_from_team_id
    AND round = p_round
  FOR UPDATE;

  IF v_from_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pick not found in draft order');
  END IF;

  -- Update draft_order to assign pick to new team
  UPDATE public.draft_order
  SET team_id = p_to_team_id
  WHERE id = v_from_order.id;

  -- Record the trade
  INSERT INTO public.draft_pick_trades (
    draft_id, league_id, from_team_id, to_team_id,
    round, original_pick_position, traded_by, notes
  )
  VALUES (
    p_draft_id, v_draft.league_id, p_from_team_id, p_to_team_id,
    p_round, v_from_order.pick_position, v_user_id, p_notes
  )
  RETURNING id INTO v_trade_id;

  -- Insert system message about trade
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  SELECT
    p_draft_id,
    v_draft.league_id,
    v_user_id,
    format(
      'Trade: %s traded Round %s pick to %s',
      (SELECT name FROM public.teams WHERE id = p_from_team_id),
      p_round,
      (SELECT name FROM public.teams WHERE id = p_to_team_id)
    ),
    'system';

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'message', 'Trade completed successfully'
  );
END;
$$;

-- =====================================================
-- 6. UNDO LAST PICK FUNCTION
-- =====================================================

/**
 * Function: undo_last_pick
 * Reverts the most recent draft pick (commissioner only)
 */
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
BEGIN
  v_user_id := auth.uid();

  -- Lock draft
  SELECT * INTO v_draft
  FROM public.drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status NOT IN ('active', 'paused') THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not active');
  END IF;

  IF NOT v_draft.undo_available OR v_draft.last_pick_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No pick available to undo');
  END IF;

  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user_id
      AND league_id = v_draft.league_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only commissioners can undo picks');
  END IF;

  -- Get the last pick
  SELECT * INTO v_last_pick
  FROM public.draft_picks
  WHERE id = v_draft.last_pick_id;

  IF v_last_pick IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Last pick not found');
  END IF;

  -- Mark player as available again
  UPDATE public.draft_pool
  SET is_drafted = FALSE,
      drafted_by_team_id = NULL,
      drafted_at = NULL
  WHERE draft_id = p_draft_id
    AND player_id = v_last_pick.player_id;

  -- Delete the pick
  DELETE FROM public.draft_picks WHERE id = v_last_pick.id;

  -- Revert draft state
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

  -- Update draft state
  UPDATE public.drafts
  SET current_round = v_prev_round,
      current_pick = v_prev_pick,
      current_team_id = v_prev_team_id,
      current_pick_started_at = NOW(),
      current_pick_expires_at = NOW() + (pick_time_seconds * INTERVAL '1 second'),
      last_pick_id = NULL,
      undo_available = FALSE
  WHERE id = p_draft_id;

  -- Insert system message
  INSERT INTO public.draft_messages (draft_id, league_id, user_id, message, message_type)
  VALUES (
    p_draft_id,
    v_draft.league_id,
    v_user_id,
    format('Undo: %s pick was undone by commissioner',
      (SELECT player_name FROM public.draft_pool WHERE draft_id = p_draft_id AND player_id = v_last_pick.player_id)
    ),
    'system'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Pick undone successfully',
    'restored_player', v_last_pick.player_id
  );
END;
$$;

-- =====================================================
-- 7. UPDATE MAKE_DRAFT_PICK FOR UNDO TRACKING
-- =====================================================

-- Drop and recreate make_draft_pick to include undo tracking
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
  v_pick_id UUID;
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
  )
  RETURNING id INTO v_pick_id;

  -- Mark player as drafted
  UPDATE public.draft_pool
  SET is_drafted = TRUE,
      drafted_by_team_id = v_current_order.team_id,
      drafted_at = NOW()
  WHERE id = v_player.id;

  -- Update draft with last pick for undo
  UPDATE public.drafts
  SET last_pick_id = v_pick_id,
      undo_available = TRUE
  WHERE id = p_draft_id;

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
    )
  );
END;
$$;

-- =====================================================
-- 8. CREATE/SETUP DRAFT FUNCTION
-- =====================================================

/**
 * Function: setup_draft
 * Creates and configures a new draft with settings
 */
CREATE OR REPLACE FUNCTION setup_draft(
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
BEGIN
  v_user_id := auth.uid();

  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user_id
      AND league_id = p_league_id
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can create drafts');
  END IF;

  -- Validate pick time (30 seconds to 5 minutes)
  IF p_pick_time_seconds < 30 OR p_pick_time_seconds > 300 THEN
    RETURN json_build_object('success', false, 'error', 'Pick time must be between 30 and 300 seconds');
  END IF;

  -- Create draft
  INSERT INTO public.drafts (
    league_id, season_id, name, status,
    draft_type, snake_draft,
    pick_time_seconds, total_rounds,
    auto_pick_enabled, allow_trades,
    require_roster_confirmation, created_by,
    current_round, current_pick
  )
  VALUES (
    p_league_id, p_season_id, p_name, 'pending',
    p_draft_type, p_draft_type = 'snake',
    p_pick_time_seconds, p_total_rounds,
    p_auto_pick_enabled, p_allow_trades,
    p_require_roster_confirmation, v_user_id,
    1, 1
  )
  RETURNING id INTO v_draft_id;

  -- Get team count for info
  SELECT COUNT(*) INTO v_team_count
  FROM public.teams
  WHERE league_id = p_league_id;

  RETURN json_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'team_count', v_team_count,
    'message', 'Draft created. Add teams to draft order and players to draft pool to begin.'
  );
END;
$$;

-- =====================================================
-- 9. CONFIRM ROSTER FUNCTION
-- =====================================================

/**
 * Function: confirm_draft_roster
 * Captain confirms their team's roster after draft
 */
CREATE OR REPLACE FUNCTION confirm_draft_roster(
  p_draft_id UUID,
  p_team_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_draft RECORD;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  IF v_draft.status != 'complete' THEN
    RETURN json_build_object('success', false, 'error', 'Draft is not complete');
  END IF;

  -- Verify user is captain of team or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.league_memberships
    WHERE user_id = v_user_id
      AND ((team_id = p_team_id AND role = 'captain') OR role IN ('owner', 'admin'))
      AND league_id = v_draft.league_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to confirm this roster');
  END IF;

  -- Check if already confirmed
  IF EXISTS (
    SELECT 1 FROM public.draft_roster_confirmations
    WHERE draft_id = p_draft_id AND team_id = p_team_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Roster already confirmed');
  END IF;

  -- Create confirmation
  INSERT INTO public.draft_roster_confirmations (
    draft_id, team_id, league_id, confirmed_by, notes
  )
  VALUES (
    p_draft_id, p_team_id, v_draft.league_id, v_user_id, p_notes
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Roster confirmed successfully'
  );
END;
$$;

-- =====================================================
-- 10. GET DRAFT RESULTS FUNCTION
-- =====================================================

/**
 * Function: get_draft_results
 * Returns complete draft results for export
 */
CREATE OR REPLACE FUNCTION get_draft_results(p_draft_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft RECORD;
  v_results JSON;
BEGIN
  SELECT * INTO v_draft FROM public.drafts WHERE id = p_draft_id;

  IF v_draft IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found');
  END IF;

  SELECT json_build_object(
    'success', true,
    'draft', json_build_object(
      'id', v_draft.id,
      'name', v_draft.name,
      'status', v_draft.status,
      'draft_type', v_draft.draft_type,
      'total_rounds', v_draft.total_rounds,
      'started_at', v_draft.started_at,
      'completed_at', v_draft.completed_at
    ),
    'picks', (
      SELECT json_agg(
        json_build_object(
          'pick_number', dp.pick_number,
          'round', dp.round,
          'team_name', t.name,
          'player_name', dp2.player_name,
          'position', dp2.position,
          'skill_level', dp2.skill_level,
          'auto_picked', dp.auto_picked,
          'pick_time_ms', dp.pick_time_ms
        ) ORDER BY dp.pick_number
      )
      FROM public.draft_picks dp
      INNER JOIN public.teams t ON t.id = dp.team_id
      LEFT JOIN public.draft_pool dp2 ON dp2.draft_id = dp.draft_id AND dp2.player_id = dp.player_id
      WHERE dp.draft_id = p_draft_id
    ),
    'teams', (
      SELECT json_agg(
        json_build_object(
          'team_id', t.id,
          'team_name', t.name,
          'total_picks', (SELECT COUNT(*) FROM public.draft_picks WHERE draft_id = p_draft_id AND team_id = t.id),
          'roster_confirmed', EXISTS(SELECT 1 FROM public.draft_roster_confirmations WHERE draft_id = p_draft_id AND team_id = t.id)
        )
      )
      FROM public.teams t
      WHERE t.id IN (SELECT DISTINCT team_id FROM public.draft_order WHERE draft_id = p_draft_id)
    ),
    'trades', (
      SELECT json_agg(
        json_build_object(
          'round', dpt.round,
          'from_team', ft.name,
          'to_team', tt.name,
          'traded_at', dpt.traded_at
        ) ORDER BY dpt.traded_at
      )
      FROM public.draft_pick_trades dpt
      INNER JOIN public.teams ft ON ft.id = dpt.from_team_id
      INNER JOIN public.teams tt ON tt.id = dpt.to_team_id
      WHERE dpt.draft_id = p_draft_id
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;

-- =====================================================
-- 11. REALTIME FOR NEW TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE draft_pick_trades;

ALTER PUBLICATION supabase_realtime ADD TABLE draft_roster_confirmations;

-- =====================================================
-- 12. GRANTS
-- =====================================================

GRANT SELECT ON draft_pick_trades TO authenticated;

GRANT SELECT ON draft_roster_confirmations TO authenticated;

GRANT INSERT ON draft_roster_confirmations TO authenticated;

GRANT EXECUTE ON FUNCTION trade_draft_pick TO authenticated;

GRANT EXECUTE ON FUNCTION undo_last_pick TO authenticated;

GRANT EXECUTE ON FUNCTION setup_draft TO authenticated;

GRANT EXECUTE ON FUNCTION confirm_draft_roster TO authenticated;

GRANT EXECUTE ON FUNCTION get_draft_results TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================;

