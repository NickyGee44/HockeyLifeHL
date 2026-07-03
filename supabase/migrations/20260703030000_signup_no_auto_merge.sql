-- ============================================================================
-- Security: stop handle_new_user from silently auto-merging a legacy profile
-- into a new account on a NAME match.
--
-- The previous trigger auto-called merge_legacy_profile() whenever exactly one
-- legacy-import profile shared the new user's (case-insensitive) full name and
-- had a null / same / placeholder email. Because legacy imports frequently have
-- a null or placeholder email, a matching name was effectively the sole signal —
-- so a brand-new user could silently inherit a *different* same-named person's
-- roster, stats, payments and suspensions (and that person's stub was deleted).
--
-- This redefinition removes the auto-merge path entirely. All name matches are
-- now recorded in profiles.pending_legacy_match_ids for the user to confirm
-- ("This is me") through the claim UI, which performs identity verification
-- before merging. Nothing is merged automatically.
--
-- Function body is the current definition verbatim, with only the single-match
-- auto-merge branch replaced by a flag-for-confirmation branch.
--
-- ⚠️  UNTESTED IN CI (project migrations do not replay on a throwaway DB).
--     Validate on staging: sign up a user whose name matches a legacy import and
--     confirm the account is NOT auto-merged and pending_legacy_match_ids is set.
-- ============================================================================

BEGIN;

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

    IF v_legacy_count >= 1 THEN
      -- SECURITY: never auto-merge on a name match. A matching name with a
      -- null/placeholder legacy email is not proof of identity — two different
      -- people named e.g. "John Smith" would silently merge, reassigning one
      -- person's roster/stats/payments into the other's account. Only flag the
      -- candidate(s); the user confirms "This is me" via the claim UI, which
      -- verifies identity before any merge is performed.
      UPDATE profiles
      SET pending_legacy_match_ids = v_legacy_ids
      WHERE id = NEW.id;
      RAISE NOTICE 'Legacy name match(es) (%) for user % — flagged for confirmation (no auto-merge)',
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

COMMIT;
