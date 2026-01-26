-- Set up Supabase Storage for team logos and other uploads
-- Run this in the Supabase SQL Editor

-- Create the 'public' storage bucket if it doesn't exist
-- This bucket will be publicly accessible for reading
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies to allow authenticated users to upload team logos

-- Policy: Anyone can view files in the public bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public');

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'public');

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public');

-- Alternative simpler policies if the above doesn't work:
-- Uncomment these and comment out the above if you get permission errors

-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- CREATE POLICY "Allow public read"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'public');

-- CREATE POLICY "Allow authenticated write"
-- ON storage.objects FOR ALL
-- TO authenticated
-- USING (bucket_id = 'public')
-- WITH CHECK (bucket_id = 'public');
