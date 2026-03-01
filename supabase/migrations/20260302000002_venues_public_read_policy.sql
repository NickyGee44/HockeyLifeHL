-- Allow anonymous/public read access to the venues table so league-sites
-- can display venue addresses and Google Maps links without auth.
-- The previous public_read_venues policy in 20260131 may not have been applied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'venues'
      AND policyname = 'public_read_venues'
  ) THEN
    EXECUTE 'CREATE POLICY "public_read_venues"
      ON public.venues
      FOR SELECT
      TO anon, authenticated
      USING (true)';
  END IF;
END $$;
