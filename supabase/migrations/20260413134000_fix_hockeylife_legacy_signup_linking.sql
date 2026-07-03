BEGIN;

-- Ensure the account-inheritance columns exist on prod before the trigger/RPC use them.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pending_legacy_match_ids UUID[] DEFAULT '{}';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legacy_merge_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_legacy_name_match
  ON public.profiles (lower(trim(full_name)))
  WHERE is_legacy_import = TRUE AND legacy_merge_completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_pending_legacy_match
  ON public.profiles USING GIN (pending_legacy_match_ids)
  WHERE array_length(pending_legacy_match_ids, 1) > 0;

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
  SELECT legacy_player_id INTO v_legacy_player_id
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

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_invite RECORD;
  v_legacy_ids UUID[];
  v_legacy_count INTEGER;
  v_single_legacy_id UUID;
  v_merge_result jsonb;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  FOR v_invite IN
    SELECT ti.id, ti.team_id, ti.season_id, t.league_id
    FROM team_invites ti
    JOIN teams t ON t.id = ti.team_id
    WHERE ti.email = NEW.email
      AND ti.status = 'pending'
      AND ti.expires_at > NOW()
  LOOP
    UPDATE team_invites
    SET status = 'accepted', accepted_by = NEW.id, updated_at = NOW()
    WHERE id = v_invite.id;

    INSERT INTO team_rosters (team_id, player_id, league_id, season_id, status, start_date)
    VALUES (v_invite.team_id, NEW.id, v_invite.league_id, v_invite.season_id, 'active', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF v_full_name IS NOT NULL AND v_full_name != NEW.email AND trim(v_full_name) != '' THEN
    SELECT array_agg(id), count(*)
    INTO v_legacy_ids, v_legacy_count
    FROM profiles
    WHERE is_legacy_import = TRUE
      AND legacy_merge_completed_at IS NULL
      AND lower(trim(full_name)) = lower(trim(v_full_name))
      AND (
        email IS NULL
        OR lower(trim(email)) = lower(trim(NEW.email))
        OR lower(trim(email)) ~ '^legacy_[0-9a-f-]+@hockeylifehl\\.com$'
      );

    IF v_legacy_count = 1 THEN
      v_single_legacy_id := v_legacy_ids[1];
      v_merge_result := merge_legacy_profile(NEW.id, v_single_legacy_id);

      IF (v_merge_result->>'success')::boolean THEN
        RAISE NOTICE 'Auto-merged legacy profile % into % (% records reassigned)',
          v_single_legacy_id, NEW.id, v_merge_result->>'total_reassigned';
      ELSE
        UPDATE profiles
        SET pending_legacy_match_ids = ARRAY[v_single_legacy_id]
        WHERE id = NEW.id;
        RAISE WARNING 'Auto-merge failed for %: %', NEW.id, v_merge_result->>'error';
      END IF;

    ELSIF v_legacy_count > 1 THEN
      UPDATE profiles
      SET pending_legacy_match_ids = v_legacy_ids
      WHERE id = NEW.id;
      RAISE NOTICE 'Multiple legacy matches (%) for user % — disambiguation needed',
        v_legacy_count, NEW.id;

    ELSE
      SELECT array_agg(id), count(*)
      INTO v_legacy_ids, v_legacy_count
      FROM profiles
      WHERE is_legacy_import = TRUE
        AND legacy_merge_completed_at IS NULL
        AND lower(trim(full_name)) = lower(trim(v_full_name))
        AND email IS NOT NULL
        AND lower(trim(email)) != lower(trim(NEW.email))
        AND lower(trim(email)) !~ '^legacy_[0-9a-f-]+@hockeylifehl\\.com$';

      IF v_legacy_count > 0 THEN
        UPDATE profiles
        SET pending_legacy_match_ids = v_legacy_ids
        WHERE id = NEW.id;
        RAISE NOTICE 'Legacy name match for % but email conflict on % profile(s) — needs manual review',
          NEW.id, v_legacy_count;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates profile on signup, auto-accepts team invites by email, and matches legacy profiles by name. Treats Hockey Life placeholder legacy emails as safe-to-merge placeholders.';

COMMIT;
