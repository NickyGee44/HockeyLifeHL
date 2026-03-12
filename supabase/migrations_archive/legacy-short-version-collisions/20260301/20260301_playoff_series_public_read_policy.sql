-- Allow public (unauthenticated) read access to playoff_series for fan-facing pages
CREATE POLICY "Public can view playoff series"
  ON playoff_series FOR SELECT
  USING (true);
