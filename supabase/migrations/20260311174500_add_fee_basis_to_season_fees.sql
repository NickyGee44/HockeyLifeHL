-- Add explicit fee basis to season fees and team invoices.
-- player = amount_cents is a per-player registration fee
-- team   = amount_cents is a flat team invoice amount

ALTER TABLE public.season_fees
  ADD COLUMN IF NOT EXISTS fee_basis text NOT NULL DEFAULT 'player';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'season_fees_fee_basis_check'
      AND conrelid = 'public.season_fees'::regclass
  ) THEN
    ALTER TABLE public.season_fees
      ADD CONSTRAINT season_fees_fee_basis_check
      CHECK (fee_basis IN ('player', 'team'));
  END IF;
END $$;

UPDATE public.season_fees
SET fee_basis = 'player'
WHERE fee_basis IS NULL;

ALTER TABLE public.team_invoices
  ADD COLUMN IF NOT EXISTS fee_basis text NOT NULL DEFAULT 'player';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_invoices_fee_basis_check'
      AND conrelid = 'public.team_invoices'::regclass
  ) THEN
    ALTER TABLE public.team_invoices
      ADD CONSTRAINT team_invoices_fee_basis_check
      CHECK (fee_basis IN ('player', 'team'));
  END IF;
END $$;

UPDATE public.team_invoices
SET fee_basis = 'player'
WHERE fee_basis IS NULL;
