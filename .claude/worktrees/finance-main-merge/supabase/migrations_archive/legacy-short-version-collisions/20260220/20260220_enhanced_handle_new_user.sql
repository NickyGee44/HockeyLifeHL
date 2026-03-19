-- ==============================================================================
-- TRIGGER: Enhanced handle_new_user() — Account Inheritance
-- ==============================================================================
-- Description: Extends the signup trigger to auto-link new users to:
--   1. Pending team_invites (by email match)
--   2. Legacy imported profiles (by name match)
-- Date: February 20, 2026
-- ==============================================================================

-- Drop and recreate the function
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
  -- Step 1: Create/update the profile record (original behavior)
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
    -- Mark invite as accepted
    UPDATE team_invites
    SET status = 'accepted', accepted_by = NEW.id, updated_at = NOW()
    WHERE id = v_invite.id;

    -- Add player to team roster (skip if already exists)
    INSERT INTO team_rosters (team_id, player_id, league_id, season_id, status, start_date)
    VALUES (v_invite.team_id, NEW.id, v_invite.league_id, v_invite.season_id, 'active', CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ============================================================================
  -- Step 3: Match against legacy imported profiles by name
  -- ============================================================================
  -- Only match if we have a real name (not just the email fallback)
  IF v_full_name IS NOT NULL AND v_full_name != NEW.email AND trim(v_full_name) != '' THEN
    -- Find all unmerged legacy profiles with matching name
    SELECT array_agg(id), count(*)
    INTO v_legacy_ids, v_legacy_count
    FROM profiles
    WHERE is_legacy_import = TRUE
      AND legacy_merge_completed_at IS NULL
      AND lower(trim(full_name)) = lower(trim(v_full_name));

    IF v_legacy_count = 1 THEN
      -- Single match: safe to auto-merge
      v_single_legacy_id := v_legacy_ids[1];

      -- Attempt the merge directly
      v_merge_result := merge_legacy_profile(NEW.id, v_single_legacy_id);

      IF (v_merge_result->>'success')::boolean THEN
        RAISE NOTICE 'Auto-merged legacy profile % into % (% records reassigned)',
          v_single_legacy_id, NEW.id, v_merge_result->>'total_reassigned';
      ELSE
        -- Merge failed — flag for app-layer retry
        UPDATE profiles
        SET pending_legacy_match_ids = ARRAY[v_single_legacy_id]
        WHERE id = NEW.id;
        RAISE WARNING 'Auto-merge failed for %: %', NEW.id, v_merge_result->>'error';
      END IF;

    ELSIF v_legacy_count > 1 THEN
      -- Multiple matches: flag for disambiguation UI
      UPDATE profiles
      SET pending_legacy_match_ids = v_legacy_ids
      WHERE id = NEW.id;

      RAISE NOTICE 'Multiple legacy matches (%) for user % — disambiguation needed',
        v_legacy_count, NEW.id;
    END IF;
    -- v_legacy_count = 0: no matches, nothing to do
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN others THEN
    -- Never fail user creation — log and continue
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

-- Ensure service role policies still exist
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates profile on signup, auto-accepts team invites by email, and matches legacy profiles by name';
