-- Fix recipient lookup for game notifications.
-- league_memberships no longer has team_id; team ownership lives on teams.captain_id.

CREATE OR REPLACE FUNCTION public.get_captain_user_ids_for_game(p_game_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_captain_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT t.captain_id)
    INTO v_captain_ids
  FROM public.games g
  INNER JOIN public.teams t ON t.id IN (g.home_team_id, g.away_team_id)
  WHERE g.id = p_game_id
    AND t.captain_id IS NOT NULL;

  RETURN COALESCE(v_captain_ids, ARRAY[]::uuid[]);
END;
$$;
