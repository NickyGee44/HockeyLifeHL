-- ============================================
-- 🍁🏒 HockeyLifeHL - Apply All Migrations 🏒🍁
-- ============================================
-- Run this script ONLY if DATABASE_VERIFICATION.sql showed missing tables
-- This script is SAFE to run multiple times (uses IF NOT EXISTS)

-- ============================================
-- MIGRATION 1: Payments Table
-- ============================================

-- Create payment enums
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'e_transfer', 'stripe', 'check', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'completed',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  entered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_player ON payments(player_id);
CREATE INDEX IF NOT EXISTS idx_payments_season ON payments(season_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Owners can view all payments" ON payments;
DROP POLICY IF EXISTS "Owners can insert payments" ON payments;
DROP POLICY IF EXISTS "Owners can update payments" ON payments;
DROP POLICY IF EXISTS "Owners can delete payments" ON payments;
DROP POLICY IF EXISTS "Players can view own payments" ON payments;

-- Create RLS policies
CREATE POLICY "Owners can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Owners can insert payments"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Owners can update payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Owners can delete payments"
  ON payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Players can view own payments"
  ON payments FOR SELECT
  USING (player_id = auth.uid());

-- ============================================
-- MIGRATION 2: Email Drafts Table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_drafts_created_by ON email_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_email_drafts_sent_at ON email_drafts(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_drafts_type ON email_drafts(type);

-- Add comments
COMMENT ON TABLE email_drafts IS 'Stores email drafts for preview/edit before sending';
COMMENT ON COLUMN email_drafts.recipients IS 'Array of recipient objects with email and name';
COMMENT ON COLUMN email_drafts.context IS 'Additional context for the email (game details, season info, etc.)';
COMMENT ON COLUMN email_drafts.is_automated IS 'Whether this is an automated email (sent immediately) or manual (requires preview)';

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Owners can manage email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Owners can view email drafts" ON email_drafts;

-- Create RLS policies
CREATE POLICY "Owners can manage email drafts"
  ON email_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'owner'
    )
  );

-- ============================================
-- MIGRATION 3: Add archived status to season_status enum (if not exists)
-- ============================================

DO $$ BEGIN
  -- Check if 'archived' value exists in season_status enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'season_status'::regtype
    AND enumlabel = 'archived'
  ) THEN
    ALTER TYPE season_status ADD VALUE 'archived';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify migrations were applied

SELECT
  'payments' as table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payments')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT
  'email_drafts' as table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'email_drafts')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT
  'payment_method enum' as table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
UNION ALL
SELECT
  'payment_status enum' as table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see ✅ for all items above, migrations were successful!
-- You can now use the payments and email_drafts features in your app.
