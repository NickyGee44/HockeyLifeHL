-- Fix storage bucket policies: restrict UPDATE/DELETE to file owner
-- Previously any authenticated user could delete/update any file in these buckets

-- ============================================================================
-- LEAGUE LOGOS
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their league logos" ON storage.objects;
CREATE POLICY "Users can update their league logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'league-logos' AND owner_id::uuid = auth.uid());

DROP POLICY IF EXISTS "Users can delete their league logos" ON storage.objects;
CREATE POLICY "Users can delete their league logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'league-logos' AND owner_id::uuid = auth.uid());

-- ============================================================================
-- TEAM LOGOS
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their team logos" ON storage.objects;
CREATE POLICY "Users can update their team logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos' AND owner_id::uuid = auth.uid());

DROP POLICY IF EXISTS "Users can delete their team logos" ON storage.objects;
CREATE POLICY "Users can delete their team logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos' AND owner_id::uuid = auth.uid());

-- ============================================================================
-- PLAYER AVATARS
-- ============================================================================
DROP POLICY IF EXISTS "Users can update their player avatars" ON storage.objects;
CREATE POLICY "Users can update their player avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'player-avatars' AND owner_id::uuid = auth.uid());

DROP POLICY IF EXISTS "Users can delete their player avatars" ON storage.objects;
CREATE POLICY "Users can delete their player avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'player-avatars' AND owner_id::uuid = auth.uid());
