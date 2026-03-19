/**
 * Fix: Add default value for cycle_number in drafts table
 *
 * The setup_draft RPC was missing cycle_number in its INSERT,
 * causing a NOT NULL constraint violation. This migration:
 * 1. Adds a DEFAULT 1 to cycle_number so new drafts work
 * 2. Updates setup_draft to auto-calculate cycle_number per season
 */

-- Add default so simple inserts don't fail
ALTER TABLE drafts ALTER COLUMN cycle_number SET DEFAULT 1;

-- Update setup_draft to auto-calculate cycle_number for the season
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
  v_cycle_number INTEGER;
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

  -- Auto-calculate next cycle number for this season
  SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO v_cycle_number
  FROM public.drafts
  WHERE season_id = p_season_id;

  -- Create draft
  INSERT INTO public.drafts (
    league_id, season_id, name, status,
    draft_type, snake_draft,
    pick_time_seconds, total_rounds,
    auto_pick_enabled, allow_trades,
    require_roster_confirmation, created_by,
    current_round, current_pick, cycle_number
  )
  VALUES (
    p_league_id, p_season_id, p_name, 'pending',
    p_draft_type, p_draft_type = 'snake',
    p_pick_time_seconds, p_total_rounds,
    p_auto_pick_enabled, p_allow_trades,
    p_require_roster_confirmation, v_user_id,
    1, 1, v_cycle_number
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
    'cycle_number', v_cycle_number
  );
END;
$$;
