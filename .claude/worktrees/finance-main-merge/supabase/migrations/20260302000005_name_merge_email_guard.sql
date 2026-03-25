-- ==============================================================================
-- TRIGGER: handle_new_user — add email guard to legacy name-merge
-- ==============================================================================
-- When a new user signs up with a name that matches a legacy imported profile,
-- only auto-merge if the legacy profile has NO email on record (was imported
-- without a real email, the typical case for BMHL legacy players).
--
-- If the legacy profile already has a non-null email that differs from the new
-- signup's email, the profiles are likely different people with the same name
-- (or the player already has/had an account). Flag for disambiguation instead
-- of blindly merging.
--
-- Rule:
--   Auto-merge  → legacy profile email IS NULL
--                 OR legacy profile email = new user email (same person confirmed)
--   Disambiguate → legacy profile email IS NOT NULL AND != new user email
-- ==============================================================================

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

  -- ============================================================================
  -- Step 1: Create/update the profile record
  -- ============================================================================
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- ============================================================================
  -- Step 2: Auto-accept pending team_invites matched by email
  -- ============================================================================
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

  -- ============================================================================
  -- Step 3: Match against legacy imported profiles by name
  -- ============================================================================
  -- Only match if we have a real name (not just the email fallback).
  IF v_full_name IS NOT NULL AND v_full_name != NEW.email AND trim(v_full_name) != '' THEN

    -- Find legacy profiles that:
    --   (a) have a matching name (case-insensitive), AND
    --   (b) are safe to merge: no email on record, OR email matches the new user
    --       (if the legacy profile has a DIFFERENT non-null email, it means either
    --       the player already has/had an account, or it's a different person with
    --       the same name — flag for disambiguation instead)
    SELECT array_agg(id), count(*)
    INTO v_legacy_ids, v_legacy_count
    FROM profiles
    WHERE is_legacy_import = TRUE
      AND legacy_merge_completed_at IS NULL
      AND lower(trim(full_name)) = lower(trim(v_full_name))
      AND (email IS NULL OR lower(trim(email)) = lower(trim(NEW.email)));

    IF v_legacy_count = 1 THEN
      -- Single safe match: auto-merge
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
      -- Multiple safe matches: flag for disambiguation UI
      UPDATE profiles
      SET pending_legacy_match_ids = v_legacy_ids
      WHERE id = NEW.id;
      RAISE NOTICE 'Multiple legacy matches (%) for user % — disambiguation needed',
        v_legacy_count, NEW.id;

    ELSE
      -- No safe matches. Check if there are name matches with conflicting emails
      -- (different real email on the legacy profile). Flag those for manual review.
      SELECT array_agg(id), count(*)
      INTO v_legacy_ids, v_legacy_count
      FROM profiles
      WHERE is_legacy_import = TRUE
        AND legacy_merge_completed_at IS NULL
        AND lower(trim(full_name)) = lower(trim(v_full_name))
        AND email IS NOT NULL
        AND lower(trim(email)) != lower(trim(NEW.email));

      IF v_legacy_count > 0 THEN
        -- Name match but email conflict — flag for disambiguation (do NOT auto-merge)
        UPDATE profiles
        SET pending_legacy_match_ids = v_legacy_ids
        WHERE id = NEW.id;
        RAISE NOTICE 'Legacy name match for % but email conflict on % profile(s) — needs manual review',
          NEW.id, v_legacy_count;
      END IF;
      -- v_legacy_count = 0: truly no matches
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates profile on signup, auto-accepts team invites by email, and matches '
  'legacy profiles by name. Only auto-merges when the legacy profile has no '
  'email (imported without one) or the email matches. Conflicting emails are '
  'flagged for disambiguation.';
