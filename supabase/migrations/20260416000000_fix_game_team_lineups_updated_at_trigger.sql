-- Root cause: the trigger trigger_game_team_lineups_updated_at was wired to
-- public.set_updated_at(), which sets NEW._updated_at (a column that only
-- exists on Stripe FDW tables). public.game_team_lineups has updated_at, so
-- any UPDATE on the table (including upserts that conflict on game_id+team_id)
-- errored with "record \"new\" has no field \"_updated_at\"", surfacing as
-- "Failed to save lineup." in the captain UI on the second save onward.

CREATE OR REPLACE FUNCTION public.touch_game_team_lineups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_game_team_lineups_updated_at ON public.game_team_lineups;

CREATE TRIGGER trigger_game_team_lineups_updated_at
  BEFORE UPDATE ON public.game_team_lineups
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_game_team_lineups_updated_at();
