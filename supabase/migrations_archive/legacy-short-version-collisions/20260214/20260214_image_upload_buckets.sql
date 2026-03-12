-- ==============================================================================
-- IMAGE UPLOAD BUCKETS
-- Adds storage buckets for sponsor logos, news images, gallery covers, and
-- staff photos to replace URL-based image inputs with file uploads.
-- ==============================================================================

-- Create sponsor-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-logos',
  'sponsor-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create news-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create gallery-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create staff-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-photos',
  'staff-photos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STORAGE RLS POLICIES
-- ==============================================================================

-- Sponsor logos policies
CREATE POLICY "Anyone can view sponsor logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Authenticated users can upload sponsor logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sponsor-logos');

CREATE POLICY "Users can update their sponsor logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Users can delete their sponsor logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sponsor-logos');

-- News images policies
CREATE POLICY "Anyone can view news images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can upload news images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-images');

CREATE POLICY "Users can update their news images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'news-images');

CREATE POLICY "Users can delete their news images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'news-images');

-- Gallery images policies
CREATE POLICY "Anyone can view gallery images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Authenticated users can upload gallery images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Users can update their gallery images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Users can delete their gallery images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-images');

-- Staff photos policies
CREATE POLICY "Anyone can view staff photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'staff-photos');

CREATE POLICY "Authenticated users can upload staff photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'staff-photos');

CREATE POLICY "Users can update their staff photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'staff-photos');

CREATE POLICY "Users can delete their staff photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'staff-photos');
