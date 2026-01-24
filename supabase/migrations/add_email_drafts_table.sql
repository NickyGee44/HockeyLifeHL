-- ============================================
-- Email Drafts Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  recipients JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  is_automated BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_created_by ON email_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_email_drafts_sent_at ON email_drafts(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_drafts_type ON email_drafts(type);

COMMENT ON TABLE email_drafts IS 'Stores email drafts for preview/edit before sending';
COMMENT ON COLUMN email_drafts.recipients IS 'Array of recipient objects with email and name';
COMMENT ON COLUMN email_drafts.context IS 'Additional context for the email (game details, season info, etc.)';
COMMENT ON COLUMN email_drafts.is_automated IS 'Whether this is an automated email (sent immediately) or manual (requires preview)';
