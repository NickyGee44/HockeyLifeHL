BEGIN;

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
  v_legacy_avatar_url TEXT;
  v_legacy_photo_url TEXT;
BEGIN
  SELECT legacy_player_id, avatar_url, photo_url
  INTO v_legacy_player_id, v_legacy_avatar_url, v_legacy_photo_url
  FROM profiles
  WHERE id = p_legacy_profile_id
    AND is_legacy_import = TRUE
    AND legacy_merge_completed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legacy profile % not found or already merged', p_legacy_profile_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_new_profile_id
      AND (is_legacy_import IS NULL OR is_legacy_import = FALSE)
  ) THEN
    RAISE EXCEPTION 'Target profile % not found or is itself a legacy profile', p_new_profile_id;
  END IF;

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
  DELETE FROM team_rosters WHERE player_id = p_legacy_profile_id;

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

  UPDATE game_stats SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE goalie_stats SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_events SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_events SET assist1_player_id = p_new_profile_id WHERE assist1_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_events SET assist2_player_id = p_new_profile_id WHERE assist2_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_checkins SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_duties SET assigned_player_id = p_new_profile_id WHERE assigned_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE game_stat_entry_log SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE league_awards SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE suspensions SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_payments SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE payments SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_approvals SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_availability SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_badges SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_goalie_matchups SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_ratings SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE player_waivers SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE registration_submissions SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE season_opt_ins SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE sub_invitations SET invited_player_id = p_new_profile_id WHERE invited_player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE team_join_requests SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE trade_players SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE draft_picks SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE draft_pool SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE article_player_tags SET player_id = p_new_profile_id WHERE player_id = p_legacy_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE profiles SET
    legacy_player_id = v_legacy_player_id,
    avatar_url = COALESCE(NULLIF(avatar_url, ''), NULLIF(v_legacy_avatar_url, ''), NULLIF(v_legacy_photo_url, '')),
    photo_url = COALESCE(NULLIF(photo_url, ''), NULLIF(v_legacy_photo_url, ''), NULLIF(v_legacy_avatar_url, '')),
    legacy_merge_completed_at = NOW(),
    pending_legacy_match_ids = '{}',
    updated_at = NOW()
  WHERE id = p_new_profile_id;

  UPDATE legacy_players
  SET matched_to_profile_id = p_new_profile_id,
      matched_at = NOW(),
      updated_at = NOW()
  WHERE matched_to_profile_id = p_legacy_profile_id;

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
  'Merges an imported legacy player into a real profile while preserving roster/history and carrying profile photos forward when the destination profile has no photo.';

COMMIT;
