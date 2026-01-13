-- ============================================
-- Add Unique Draft Link to Drafts Table
-- ============================================

ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS draft_link TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_drafts_draft_link ON drafts(draft_link);

COMMENT ON COLUMN drafts.draft_link IS 'Unique link/token for this specific draft - used to separate and track drafts';
