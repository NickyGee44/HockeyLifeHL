-- ==============================================================================
-- SETUP REALTIME AND STORAGE BUCKETS
-- ==============================================================================
-- Description: Enable Realtime on stat tables and create storage buckets
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- ==============================================================================
-- ENABLE REALTIME ON TABLES
-- ==============================================================================

-- Enable Realtime for games table (for live score updates)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS games;

-- Enable Realtime for player_stats table (for live stat entry)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS player_stats;

-- Enable Realtime for goalie_stats table (for live goalie stats)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS goalie_stats;

-- ==============================================================================
-- CREATE STORAGE BUCKETS
-- ==============================================================================

-- Create league-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'league-logos',
  'league-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create team-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create player-avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-avatars',
  'player-avatars',
  true,
  1048576, -- 1 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STORAGE RLS POLICIES
-- ==============================================================================

-- League logos policies
CREATE POLICY "Anyone can view league logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'league-logos');

CREATE POLICY "Authenticated users can upload league logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'league-logos');

CREATE POLICY "Users can update their league logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'league-logos');

CREATE POLICY "Users can delete their league logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'league-logos');

-- Team logos policies
CREATE POLICY "Anyone can view team logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'team-logos');

CREATE POLICY "Authenticated users can upload team logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Users can update their team logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos');

CREATE POLICY "Users can delete their team logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos');

-- Player avatars policies
CREATE POLICY "Anyone can view player avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'player-avatars');

CREATE POLICY "Authenticated users can upload player avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-avatars');

CREATE POLICY "Users can update their player avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'player-avatars');

CREATE POLICY "Users can delete their player avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'player-avatars');

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify Realtime is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('games', 'player_stats', 'goalie_stats');

-- Verify buckets were created
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('league-logos', 'team-logos', 'player-avatars');

-- ==============================================================================
-- COMPLETE
-- ==============================================================================
