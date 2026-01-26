-- ============================================
-- Add Draft Order System
-- ============================================

-- Create draft_order table to store randomized team positions
CREATE TABLE IF NOT EXISTS draft_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pick_position INTEGER NOT NULL CHECK (pick_position > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (draft_id, team_id),
  UNIQUE (draft_id, pick_position)
);

CREATE INDEX IF NOT EXISTS idx_draft_order_draft ON draft_order(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_order_position ON draft_order(draft_id, pick_position);

-- Add draft_order_assigned field to drafts table
ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS draft_order_assigned BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE draft_order IS 'Stores the randomized draft order for each draft';
COMMENT ON COLUMN drafts.draft_order_assigned IS 'Whether the draft order has been randomly assigned';
