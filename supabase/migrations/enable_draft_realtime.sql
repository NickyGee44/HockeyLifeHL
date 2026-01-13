-- ============================================
-- Enable Supabase Realtime for Draft Tables
-- ============================================

-- Enable realtime for drafts table
ALTER PUBLICATION supabase_realtime ADD TABLE drafts;

-- Enable realtime for draft_picks table
ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;

-- Note: RLS policies must allow SELECT for authenticated users
-- The existing RLS policies should already allow this, but verify:
-- - drafts: should be viewable by all authenticated users
-- - draft_picks: should be viewable by all authenticated users

COMMENT ON TABLE drafts IS 'Draft sessions - realtime enabled for live draft board';
COMMENT ON TABLE draft_picks IS 'Individual draft picks - realtime enabled for live updates';
