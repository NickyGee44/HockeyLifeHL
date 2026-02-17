-- ==============================================================================
-- RPC: merge_legacy_profile — Atomic Legacy Profile Merge
-- ==============================================================================
-- Description: Reassigns all player_id foreign keys from an orphaned legacy
-- profile to a real authenticated profile, then deletes the orphan.
-- Runs as a single atomic transaction to prevent partial merges.
-- Date: February 20, 2026
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.merge_legacy_profile(
  p_new_profile_id UUID,
  p_legacy_profile_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_reassigned INTEGER := 0;
  v_count INTEGER;
  v_legacy_player_id UUID;
BEGIN
  -- Guard: verify the legacy profile exists and hasn't been merged already
  SELECT legacy_player_id INTO v_legacy_player_id
  FROM profiles
  WHERE id = p_legacy_profile_id
    AND is_legacy_import = TRUE
    AND legacy_merge_completed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legacy profile % not found or already merged', p_legacy_profile_id;
  END IF;

  -- Guard: verify the new profile exists and is a real auth-backed profile
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_new_profile_id AND (is_legacy_import IS NULL OR is_legacy_import = FALSE)) THEN
    RAISE EXCEPTION 'Target profile % not found or is itself a legacy profile', p_new_profile_id;
  END IF;

  -- ============================================================================
  -- Reassign player_id in all referencing tables
  -- Uses WHERE NOT EXISTS to skip rows that would create duplicates
  -- ============================================================================

  -- team_rosters (has unique constraints on team+player+season)
  UPDATE team_rosters SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id
    AND NOT EXISTS (
      SELECT 1 FROM team_rosters tr2
      WHERE tr2.player_id = p_new_profile_id
        AND tr2.team_id = team_rosters.team_id
        AND tr2.season_id = team_rosters.season_id
        AND tr2.end_date IS NULL
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- Delete any remaining duplicate legacy roster entries that couldn't be reassigned
  DELETE FROM team_rosters WHERE player_id = p_legacy_profile_id;

  -- player_stats
  UPDATE player_stats SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id
    AND NOT EXISTS (
      SELECT 1 FROM player_stats ps2
      WHERE ps2.player_id = p_new_profile_id
        AND ps2.season_id = player_stats.season_id
        AND ps2.team_id = player_stats.team_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;
  DELETE FROM player_stats WHERE player_id = p_legacy_profile_id;

  -- game_stats
  UPDATE game_stats SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- goalie_stats
  UPDATE goalie_stats SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- game_events (3 FK columns)
  UPDATE game_events SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_events SET assist1_player_id = p_new_profile_id
  WHERE assist1_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_events SET assist2_player_id = p_new_profile_id
  WHERE assist2_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- game_checkins
  UPDATE game_checkins SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- game_duties
  UPDATE game_duties SET assigned_player_id = p_new_profile_id
  WHERE assigned_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- game_stat_entry_log
  UPDATE game_stat_entry_log SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- league_awards
  UPDATE league_awards SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- suspensions
  UPDATE suspensions SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_payments
  UPDATE player_payments SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- payments
  UPDATE payments SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_approvals
  UPDATE player_approvals SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_availability
  UPDATE player_availability SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_badges
  UPDATE player_badges SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_goalie_matchups
  UPDATE player_goalie_matchups SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_ratings
  UPDATE player_ratings SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- player_waivers
  UPDATE player_waivers SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- registration_submissions
  UPDATE registration_submissions SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- season_opt_ins
  UPDATE season_opt_ins SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- sub_invitations
  UPDATE sub_invitations SET invited_player_id = p_new_profile_id
  WHERE invited_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- team_join_requests
  UPDATE team_join_requests SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- trade_players
  UPDATE trade_players SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- draft_picks
  UPDATE draft_picks SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- draft_pool
  UPDATE draft_pool SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- article_player_tags
  UPDATE article_player_tags SET player_id = p_new_profile_id
  WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  -- ============================================================================
  -- Transfer legacy metadata to the new profile
  -- ============================================================================

  UPDATE profiles SET
    legacy_player_id = v_legacy_player_id,
    legacy_merge_completed_at = NOW(),
    pending_legacy_match_ids = '{}',
    updated_at = NOW()
  WHERE id = p_new_profile_id;

  -- Update legacy_players to point to the new real profile
  UPDATE legacy_players
  SET matched_to_profile_id = p_new_profile_id,
      matched_at = NOW(),
      updated_at = NOW()
  WHERE matched_to_profile_id = p_legacy_profile_id;

  -- Delete the orphaned legacy profile
  DELETE FROM profiles WHERE id = p_legacy_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_reassigned', v_total_reassigned,
    'legacy_profile_deleted', p_legacy_profile_id,
    'merged_into', p_new_profile_id
  );

EXCEPTION
  WHEN others THEN
    RAISE WARNING 'merge_legacy_profile failed: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.merge_legacy_profile IS
  'Atomically merges a legacy (orphaned) player profile into a real authenticated profile by reassigning all FK references';
