-- ==============================================================================
-- Waiver document support
-- Adds optional uploaded document metadata to league waiver templates and
-- provisions a public storage bucket for PDF/image waiver documents.
-- ==============================================================================

DO $$
BEGIN
  ALTER TABLE league_waiver_templates
    ADD COLUMN IF NOT EXISTS document_url TEXT,
    ADD COLUMN IF NOT EXISTS document_name TEXT,
    ADD COLUMN IF NOT EXISTS document_mime_type TEXT;
END $$;

COMMENT ON COLUMN league_waiver_templates.document_url IS 'Optional uploaded waiver document URL (PDF/image)';
COMMENT ON COLUMN league_waiver_templates.document_name IS 'Original uploaded waiver document filename';
COMMENT ON COLUMN league_waiver_templates.document_mime_type IS 'Uploaded waiver document MIME type';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'league-waivers',
  'league-waivers',
  TRUE,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view league waivers" ON storage.objects;
CREATE POLICY "Anyone can view league waivers" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'league-waivers');

DROP POLICY IF EXISTS "Authenticated users can upload league waivers" ON storage.objects;
CREATE POLICY "Authenticated users can upload league waivers" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'league-waivers');

DROP POLICY IF EXISTS "Users can update their league waivers" ON storage.objects;
CREATE POLICY "Users can update their league waivers" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'league-waivers' AND owner_id::uuid = auth.uid());

DROP POLICY IF EXISTS "Users can delete their league waivers" ON storage.objects;
CREATE POLICY "Users can delete their league waivers" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'league-waivers' AND owner_id::uuid = auth.uid());
