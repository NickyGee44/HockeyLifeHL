BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_legacy_import BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legacy_player_id UUID;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pending_legacy_match_ids UUID[] DEFAULT '{}';
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legacy_merge_completed_at TIMESTAMPTZ;


CREATE OR REPLACE FUNCTION public._claim_update_uuid_column_if_exists(
  p_table TEXT,
  p_column TEXT,
  p_target_profile_id UUID,
  p_claim_profile_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    RETURN 0;
  END IF;

  EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', p_table, p_column, p_column)
  USING p_target_profile_id, p_claim_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public._claim_update_uuid_column_if_exists(TEXT, TEXT, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._claim_update_uuid_column_if_exists(TEXT, TEXT, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public._claim_update_uuid_column_if_exists(TEXT, TEXT, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public._claim_update_uuid_column_if_exists(TEXT, TEXT, UUID, UUID) TO service_role;

-- Generalized, guarded player-profile claim for signup-time account inheritance.
-- Only rostered, unclaimed player profiles can be merged into the newly-created auth profile.
CREATE OR REPLACE FUNCTION public.claim_rostered_player_profile(
  p_target_profile_id UUID,
  p_claim_profile_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_reassigned INTEGER := 0;
  v_count INTEGER;
  v_claim_profile RECORD;
  v_target_profile RECORD;
BEGIN
  IF p_target_profile_id IS NULL OR p_claim_profile_id IS NULL THEN
    RAISE EXCEPTION 'Both target and claim profile IDs are required';
  END IF;

  IF p_target_profile_id = p_claim_profile_id THEN
    RAISE EXCEPTION 'Cannot claim a profile into itself';
  END IF;

  SELECT id, email, full_name, is_legacy_import, legacy_player_id
  INTO v_target_profile
  FROM profiles
  WHERE id = p_target_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile % not found', p_target_profile_id;
  END IF;

  IF COALESCE(v_target_profile.is_legacy_import, FALSE) = TRUE THEN
    RAISE EXCEPTION 'Target profile % is a legacy import and cannot claim another player', p_target_profile_id;
  END IF;

  SELECT id, email, full_name, phone, position, jersey_number, is_legacy_import, legacy_player_id, legacy_merge_completed_at
  INTO v_claim_profile
  FROM profiles
  WHERE id = p_claim_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim profile % not found', p_claim_profile_id;
  END IF;

  -- Hard safety guard: never allow claiming a profile that already has an auth user.
  -- This covers current real accounts; unclaimed imported/current player stubs have no auth.users row.
  IF EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p_claim_profile_id) THEN
    RAISE EXCEPTION 'Claim profile % is already attached to a user account', p_claim_profile_id;
  END IF;

  -- Hard safety guard: only rostered player profiles are claimable.
  IF NOT EXISTS (SELECT 1 FROM team_rosters tr WHERE tr.player_id = p_claim_profile_id) THEN
    RAISE EXCEPTION 'Claim profile % is not rostered and cannot be claimed', p_claim_profile_id;
  END IF;

  IF v_claim_profile.legacy_merge_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Claim profile % has already been merged', p_claim_profile_id;
  END IF;

  UPDATE teams SET captain_id = p_target_profile_id
  WHERE captain_id = p_claim_profile_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE team_rosters SET player_id = p_target_profile_id
  WHERE player_id = p_claim_profile_id
    AND NOT EXISTS (
      SELECT 1 FROM team_rosters tr2
      WHERE tr2.player_id = p_target_profile_id
        AND tr2.team_id = team_rosters.team_id
        AND tr2.season_id = team_rosters.season_id
        AND COALESCE(tr2.end_date, DATE '9999-12-31') = COALESCE(team_rosters.end_date, DATE '9999-12-31')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;
  DELETE FROM team_rosters WHERE player_id = p_claim_profile_id;

  UPDATE player_stats SET player_id = p_target_profile_id
  WHERE player_id = p_claim_profile_id
    AND NOT EXISTS (
      SELECT 1 FROM player_stats ps2
      WHERE ps2.player_id = p_target_profile_id
        AND ps2.game_id = player_stats.game_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_total_reassigned := v_total_reassigned + v_count;
  DELETE FROM player_stats WHERE player_id = p_claim_profile_id;

  v_count := public._claim_update_uuid_column_if_exists('game_stats', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('goalie_stats', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_events', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_events', 'assist1_player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_events', 'assist2_player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_checkins', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_duties', 'assigned_player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('game_stat_entry_log', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('league_awards', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('suspensions', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_payments', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('payments', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_approvals', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_availability', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_badges', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_goalie_matchups', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_goalie_matchups', 'goalie_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_ratings', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('player_waivers', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('registration_submissions', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('season_opt_ins', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('sub_invitations', 'invited_player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('team_join_requests', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('trade_players', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('draft_picks', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('draft_pool', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  v_count := public._claim_update_uuid_column_if_exists('article_player_tags', 'player_id', p_target_profile_id, p_claim_profile_id);
  v_total_reassigned := v_total_reassigned + v_count;

  UPDATE profiles SET
    full_name = COALESCE(NULLIF(trim(profiles.full_name), ''), v_claim_profile.full_name),
    phone = COALESCE(profiles.phone, v_claim_profile.phone),
    position = COALESCE(profiles.position, v_claim_profile.position),
    jersey_number = COALESCE(profiles.jersey_number, v_claim_profile.jersey_number),
    legacy_player_id = COALESCE(profiles.legacy_player_id, v_claim_profile.legacy_player_id),
    legacy_merge_completed_at = NOW(),
    pending_legacy_match_ids = '{}',
    updated_at = NOW()
  WHERE id = p_target_profile_id;

  UPDATE legacy_players
  SET matched_to_profile_id = p_target_profile_id,
      matched_at = NOW(),
      updated_at = NOW()
  WHERE matched_to_profile_id = p_claim_profile_id
     OR id = v_claim_profile.legacy_player_id;

  DELETE FROM profiles WHERE id = p_claim_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_reassigned', v_total_reassigned,
    'claimed_profile_deleted', p_claim_profile_id,
    'merged_into', p_target_profile_id
  );
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'claim_rostered_player_profile failed: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_rostered_player_profile(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_rostered_player_profile(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.claim_rostered_player_profile(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rostered_player_profile(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.claim_rostered_player_profile(UUID, UUID) IS
  'Signup-time player claiming. Merges a rostered, unclaimed player stub/legacy profile into a real auth-backed profile while preserving stats and team history. Execute is restricted to service_role.';

COMMIT;
