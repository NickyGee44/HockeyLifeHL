-- Migration: auto-trigger game recap generation when any game transitions to 'completed'
--
-- Covers ALL completion paths (scorekeeper, admin panel, direct DB update, captain submit, etc.)
-- Uses pg_net to call the generate-ai-article edge function asynchronously.
-- The edge function itself deduplicates via ai_generation_log, so double-calls are safe.
--
-- Checks:
--   1. Game must have transitioned TO 'completed' (not already completed)
--   2. The league's organization must have an active 'ai_news' addon
--   3. A recap must not already be completed for this game

CREATE OR REPLACE FUNCTION auto_generate_game_recap()
RETURNS TRIGGER AS $$
DECLARE
  v_league_id uuid;
  v_org_id uuid;
  v_addon_active boolean;
  v_recap_exists boolean;
  v_service_role_key text;
BEGIN
  -- Only fire when status transitions to 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Skip if already was completed (no re-trigger on other column updates)
  IF OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get league_id from the game
  v_league_id := NEW.league_id;
  IF v_league_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if organization has active ai_news addon
  SELECT l.organization_id INTO v_org_id
  FROM leagues l
  WHERE l.id = v_league_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM organization_addons
    WHERE organization_id = v_org_id
      AND addon_type = 'ai_news'
      AND status IN ('active', 'trialing')
  ) INTO v_addon_active;

  IF NOT v_addon_active THEN
    RETURN NEW;
  END IF;

  -- Check dedup: skip if recap already completed
  SELECT EXISTS(
    SELECT 1 FROM ai_generation_log
    WHERE game_id = NEW.id
      AND article_type = 'game_recap'
      AND status = 'completed'
  ) INTO v_recap_exists;

  IF v_recap_exists THEN
    RETURN NEW;
  END IF;

  -- Get service role key from vault
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'auto_generate_game_recap: service_role_key not found in vault';
    RETURN NEW;
  END IF;

  -- Fire async HTTP call to edge function
  PERFORM net.http_post(
    url := 'https://ntplczcmhvfkijjxavdl.supabase.co/functions/v1/generate-ai-article',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'action', 'game_recap',
      'game_id', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if re-running
DROP TRIGGER IF EXISTS trigger_auto_generate_game_recap ON games;

CREATE TRIGGER trigger_auto_generate_game_recap
  AFTER UPDATE OF status ON games
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_game_recap();
