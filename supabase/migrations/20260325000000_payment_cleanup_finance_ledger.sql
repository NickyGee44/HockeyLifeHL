-- =============================================================================
-- Payment cleanup support for archive + permanent delete flows
-- =============================================================================

ALTER TABLE public.player_payments
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_player_payments_league_season_archived
  ON public.player_payments(league_id, season_id, archived_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_payments_player_fee_archived
  ON public.player_payments(player_id, season_fee_id, archived_at);

CREATE TABLE IF NOT EXISTS public.player_payment_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_payment_id uuid NOT NULL,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  player_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  delete_reason text NOT NULL,
  payment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_payment_deletion_log_league
  ON public.player_payment_deletion_log(league_id, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_payment_deletion_log_payment
  ON public.player_payment_deletion_log(player_payment_id);

ALTER TABLE public.player_payment_deletion_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.player_payment_audit_log
  DROP CONSTRAINT IF EXISTS player_payment_audit_log_player_payment_id_fkey;

ALTER TABLE public.player_payment_audit_log
  ADD CONSTRAINT player_payment_audit_log_player_payment_id_fkey
  FOREIGN KEY (player_payment_id)
  REFERENCES public.player_payments(id)
  ON DELETE SET NULL;

GRANT SELECT, INSERT
  ON public.player_payment_deletion_log
  TO service_role;
