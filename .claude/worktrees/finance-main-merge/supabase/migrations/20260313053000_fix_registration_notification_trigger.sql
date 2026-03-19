-- Fix stale registration notification trigger that still writes into the
-- removed notifications_queue table. Registration submission should queue into
-- the current notifications table and should never block the registration write.

CREATE OR REPLACE FUNCTION public.notify_on_registration_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_name TEXT;
  league_name TEXT;
BEGIN
  IF NEW.submitted_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT'
    AND OLD.submitted_at IS NOT NULL
    AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO player_name
  FROM profiles
  WHERE id = NEW.player_id;

  SELECT name INTO league_name
  FROM leagues
  WHERE id = NEW.league_id;

  BEGIN
    IF NEW.status = 'pending' THEN
      INSERT INTO public.notifications (
        league_id,
        user_id,
        type,
        channel,
        subject,
        body,
        status,
        template_id,
        template_data,
        related_entity_type,
        related_entity_id,
        created_by
      ) VALUES (
        NEW.league_id,
        NEW.player_id,
        'registration_submitted',
        'email',
        'Registration received',
        format(
          'Hi %s, your %s registration for %s has been received and is pending review.',
          COALESCE(player_name, 'player'),
          NEW.registration_type,
          COALESCE(league_name, 'the league')
        ),
        'pending',
        'registration_submitted_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'registration_type', NEW.registration_type,
          'submitted_at', NEW.submitted_at
        ),
        'registration_submission',
        NEW.id,
        NEW.player_id
      );

      INSERT INTO public.notifications (
        league_id,
        user_id,
        type,
        channel,
        subject,
        body,
        status,
        template_id,
        template_data,
        related_entity_type,
        related_entity_id,
        created_by
      )
      SELECT
        NEW.league_id,
        lm.user_id,
        'registration_admin_alert',
        'email',
        'New registration submitted',
        format(
          '%s submitted a %s registration for %s.',
          COALESCE(player_name, 'A player'),
          NEW.registration_type,
          COALESCE(league_name, 'the league')
        ),
        'pending',
        'new_registration_admin_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'registration_type', NEW.registration_type,
          'registration_id', NEW.id
        ),
        'registration_submission',
        NEW.id,
        NEW.player_id
      FROM public.league_memberships lm
      WHERE lm.league_id = NEW.league_id
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active';
    ELSIF NEW.status = 'approved'
      AND (TG_OP = 'INSERT' OR OLD.status = 'pending') THEN
      INSERT INTO public.notifications (
        league_id,
        user_id,
        type,
        channel,
        subject,
        body,
        status,
        template_id,
        template_data,
        related_entity_type,
        related_entity_id,
        created_by
      ) VALUES (
        NEW.league_id,
        NEW.player_id,
        'registration_approved',
        'email',
        'Registration approved',
        format(
          'Hi %s, your registration for %s has been approved.',
          COALESCE(player_name, 'player'),
          COALESCE(league_name, 'the league')
        ),
        'pending',
        'registration_approved_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'team_id', NEW.assigned_team_id,
          'jersey_number', NEW.assigned_jersey_number
        ),
        'registration_submission',
        NEW.id,
        COALESCE(NEW.reviewed_by, NEW.player_id)
      );
    ELSIF NEW.status = 'rejected'
      AND (TG_OP = 'INSERT' OR OLD.status = 'pending') THEN
      INSERT INTO public.notifications (
        league_id,
        user_id,
        type,
        channel,
        subject,
        body,
        status,
        template_id,
        template_data,
        related_entity_type,
        related_entity_id,
        created_by
      ) VALUES (
        NEW.league_id,
        NEW.player_id,
        'registration_rejected',
        'email',
        'Registration update',
        format(
          'Hi %s, your registration for %s was not approved.',
          COALESCE(player_name, 'player'),
          COALESCE(league_name, 'the league')
        ),
        'pending',
        'registration_rejected_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'reason', COALESCE(NEW.rejection_reason, 'No reason provided')
        ),
        'registration_submission',
        NEW.id,
        COALESCE(NEW.reviewed_by, NEW.player_id)
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'notify_on_registration_submission failed for registration %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_registration_notification ON public.registration_submissions;

CREATE TRIGGER trigger_registration_notification
  AFTER INSERT OR UPDATE ON public.registration_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_registration_submission();
