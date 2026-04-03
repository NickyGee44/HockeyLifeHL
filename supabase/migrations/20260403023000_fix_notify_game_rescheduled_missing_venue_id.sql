-- Fix broken reschedule notifications trigger.
-- public.games does not have a venue_id column; use the text location field instead.

CREATE OR REPLACE FUNCTION public.notify_game_rescheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_captain_ids uuid[];
  v_captain_id uuid;
  v_home_team record;
  v_away_team record;
  v_league record;
  v_venue_name text;
BEGIN
  -- Only trigger on schedule changes
  IF OLD.scheduled_at = NEW.scheduled_at THEN
    RETURN NEW;
  END IF;

  -- Get team details
  SELECT name, id INTO v_home_team FROM public.teams WHERE id = NEW.home_team_id;
  SELECT name, id INTO v_away_team FROM public.teams WHERE id = NEW.away_team_id;

  -- Get league name
  SELECT name INTO v_league FROM public.leagues WHERE id = NEW.league_id;

  -- games has location text, not venue_id
  v_venue_name := COALESCE(NULLIF(BTRIM(NEW.location), ''), 'TBD');

  -- Get captain user IDs
  v_captain_ids := public.get_captain_user_ids_for_game(NEW.id);

  -- Create notification for each captain
  FOREACH v_captain_id IN ARRAY v_captain_ids
  LOOP
    INSERT INTO public.notifications (
      league_id,
      user_id,
      type,
      channel,
      subject,
      body,
      template_id,
      template_data,
      related_entity_type,
      related_entity_id,
      priority
    ) VALUES (
      NEW.league_id,
      v_captain_id,
      'game_rescheduled',
      'email',
      format('Game Rescheduled: %s vs %s', v_home_team.name, v_away_team.name),
      '',
      'game_rescheduled_v1',
      jsonb_build_object(
        'home_team', v_home_team.name,
        'away_team', v_away_team.name,
        'old_date', to_char(OLD.scheduled_at AT TIME ZONE 'America/Toronto', 'Day, Month DD, YYYY at HH:MI AM'),
        'new_date', to_char(NEW.scheduled_at AT TIME ZONE 'America/Toronto', 'Day, Month DD, YYYY at HH:MI AM'),
        'venue_name', v_venue_name,
        'league_name', v_league.name,
        'game_id', NEW.id
      ),
      'game',
      NEW.id,
      8
    );
  END LOOP;

  RETURN NEW;
END;
$$;
