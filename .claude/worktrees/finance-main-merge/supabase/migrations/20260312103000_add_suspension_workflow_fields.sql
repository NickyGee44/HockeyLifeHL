-- Add richer suspension workflow fields for league discipline management.

ALTER TABLE public.suspensions
  ADD COLUMN IF NOT EXISTS suspension_type text NOT NULL DEFAULT 'games',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS behavior_category text,
  ADD COLUMN IF NOT EXISTS is_indefinite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appeal_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appeal_reason text;

UPDATE public.suspensions
SET status = COALESCE(status, 'active'),
    suspension_type = COALESCE(suspension_type, 'games'),
    severity = COALESCE(severity, 'standard'),
    is_indefinite = COALESCE(is_indefinite, false),
    appeal_eligible = COALESCE(appeal_eligible, false)
WHERE status IS NULL
   OR suspension_type IS NULL
   OR severity IS NULL
   OR is_indefinite IS NULL
   OR appeal_eligible IS NULL;

CREATE INDEX IF NOT EXISTS idx_suspensions_league_status
  ON public.suspensions (league_id, status);

CREATE INDEX IF NOT EXISTS idx_suspensions_team_status
  ON public.suspensions (team_id, status);
