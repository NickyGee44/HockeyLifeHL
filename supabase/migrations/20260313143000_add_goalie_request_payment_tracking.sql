-- Track captain-side payout settlement for filled sub goalie requests.

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid'));

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS paid_amount_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

ALTER TABLE public.goalie_requests
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_goalie_requests_team_payment_status
  ON public.goalie_requests(team_id, payment_status);
