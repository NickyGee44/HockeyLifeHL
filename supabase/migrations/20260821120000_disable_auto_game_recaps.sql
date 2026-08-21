-- Game recaps are generated manually by league owners/admins after stats are final.
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP TRIGGER IF EXISTS trigger_auto_generate_game_recap ON public.games;
DROP FUNCTION IF EXISTS public.auto_generate_game_recap();

COMMIT;
