-- Check Storage Bucket Status
-- Run this in Supabase SQL Editor to verify storage is set up correctly

-- 1. Check if the bucket exists
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets;

-- 2. Check storage policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. List any files in the public bucket
SELECT id, bucket_id, name, created_at, updated_at
FROM storage.objects
WHERE bucket_id = 'public'
LIMIT 10;

-- If no bucket exists, create it:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('public', 'public', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'])
-- ON CONFLICT (id) DO UPDATE SET public = true;

