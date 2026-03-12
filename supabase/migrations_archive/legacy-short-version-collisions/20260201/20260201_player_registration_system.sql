-- ==============================================================================
-- PLAYER REGISTRATION SYSTEM MIGRATION
-- ==============================================================================
-- Purpose: Complete player registration flow with waivers, photo uploads,
--          skill assessment, and admin approval workflow
-- Date: February 1, 2026
-- ==============================================================================

-- ==============================================================================
-- ENUMS
-- ==============================================================================

-- Registration type enum
DO $$ BEGIN
  CREATE TYPE registration_type_enum AS ENUM ('team_registration', 'free_agent', 'individual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Registration status enum
DO $$ BEGIN
  CREATE TYPE registration_status_enum AS ENUM ('pending', 'approved', 'rejected', 'waitlisted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Signature type enum
DO $$ BEGIN
  CREATE TYPE signature_type_enum AS ENUM ('drawn', 'typed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Skill level enum
DO $$ BEGIN
  CREATE TYPE skill_level_enum AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Player position enum
DO $$ BEGIN
  CREATE TYPE player_position_enum AS ENUM ('Forward', 'Defense', 'Goalie');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Emergency contact relationship enum
DO $$ BEGIN
  CREATE TYPE emergency_contact_relationship_enum AS ENUM ('parent', 'spouse', 'sibling', 'friend', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- TABLE 1: player_waivers - Digital signature storage
-- ==============================================================================
CREATE TABLE IF NOT EXISTS player_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,

  -- Signature Data
  signature_data TEXT NOT NULL, -- Base64 encoded PNG
  signature_type signature_type_enum NOT NULL DEFAULT 'drawn',
  signed_name TEXT NOT NULL,

  -- Waiver Version Control
  waiver_version TEXT NOT NULL DEFAULT 'v1',
  waiver_content_hash TEXT NOT NULL, -- SHA-256 of waiver content at time of signing

  -- Legal Tracking
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(player_id, league_id, season_id)
);

-- Indexes for player_waivers
CREATE INDEX IF NOT EXISTS idx_player_waivers_player_id ON player_waivers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_waivers_league_id ON player_waivers(league_id);
CREATE INDEX IF NOT EXISTS idx_player_waivers_season_id ON player_waivers(season_id);
CREATE INDEX IF NOT EXISTS idx_player_waivers_league_season ON player_waivers(league_id, season_id);

-- Comments
COMMENT ON TABLE player_waivers IS 'Stores digital waiver signatures for player registrations';
COMMENT ON COLUMN player_waivers.signature_data IS 'Base64 encoded PNG of drawn signature or typed name';
COMMENT ON COLUMN player_waivers.waiver_content_hash IS 'SHA-256 hash of waiver content to verify what was agreed to';

-- ==============================================================================
-- TABLE 2: registration_submissions - Approval queue
-- ==============================================================================
CREATE TABLE IF NOT EXISTS registration_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  waiver_id UUID REFERENCES player_waivers(id) ON DELETE SET NULL,

  -- Registration Type
  registration_type registration_type_enum NOT NULL,

  -- Status
  status registration_status_enum NOT NULL DEFAULT 'pending',

  -- Player Preferences
  preferred_position player_position_enum,
  secondary_position player_position_enum,
  preferred_jersey_number INTEGER CHECK (preferred_jersey_number >= 1 AND preferred_jersey_number <= 99),

  -- Skill Assessment
  self_assessed_skill skill_level_enum,
  years_experience INTEGER CHECK (years_experience >= 0),
  previous_leagues TEXT,

  -- Photo
  photo_url TEXT,

  -- Payment (if required)
  payment_status TEXT DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER DEFAULT 0,

  -- Admin Review
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Assigned Data (set on approval)
  assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  assigned_jersey_number INTEGER CHECK (assigned_jersey_number >= 1 AND assigned_jersey_number <= 99),

  -- Draft Storage (for incomplete registrations)
  draft_data JSONB,
  draft_step INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(player_id, league_id, season_id)
);

-- Indexes for registration_submissions
CREATE INDEX IF NOT EXISTS idx_reg_submissions_player_id ON registration_submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_league_id ON registration_submissions(league_id);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_season_id ON registration_submissions(season_id);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_team_id ON registration_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_status ON registration_submissions(status);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_type ON registration_submissions(registration_type);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_league_status ON registration_submissions(league_id, status);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_league_season ON registration_submissions(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_reg_submissions_pending ON registration_submissions(league_id, status) WHERE status = 'pending';

-- Comments
COMMENT ON TABLE registration_submissions IS 'Player registration submissions pending admin approval';
COMMENT ON COLUMN registration_submissions.draft_data IS 'JSONB storage for incomplete registration wizard data';
COMMENT ON COLUMN registration_submissions.draft_step IS 'Current step in the registration wizard';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_registration_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registration_submissions_updated_at ON registration_submissions;
CREATE TRIGGER trigger_registration_submissions_updated_at
  BEFORE UPDATE ON registration_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_submissions_updated_at();

-- ==============================================================================
-- TABLE 3: league_waiver_templates - Waiver content per league
-- ==============================================================================
CREATE TABLE IF NOT EXISTS league_waiver_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL DEFAULT 'Liability Waiver',
  content TEXT NOT NULL, -- Markdown or HTML content
  version TEXT NOT NULL DEFAULT 'v1',
  content_hash TEXT NOT NULL, -- SHA-256 for tracking what players agreed to

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  UNIQUE(league_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_waivers_league_id ON league_waiver_templates(league_id);
CREATE INDEX IF NOT EXISTS idx_league_waivers_active ON league_waiver_templates(league_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE league_waiver_templates IS 'Waiver templates that leagues can customize';

-- ==============================================================================
-- PROFILE COLUMNS - Emergency Contact Information
-- ==============================================================================

-- Add emergency contact columns to profiles if they don't exist
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN emergency_contact_name TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN emergency_contact_phone TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN emergency_contact_relationship emergency_contact_relationship_enum;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN medical_notes TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Also ensure photo_url column exists on profiles
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN photo_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN profiles.emergency_contact_relationship IS 'Relationship to emergency contact';
COMMENT ON COLUMN profiles.medical_notes IS 'Any medical conditions or allergies (encrypted at rest)';

-- ==============================================================================
-- STORAGE BUCKET: player-photos
-- ==============================================================================

-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- ROW LEVEL SECURITY - player_waivers
-- ==============================================================================
ALTER TABLE player_waivers ENABLE ROW LEVEL SECURITY;

-- Players can view their own waivers
CREATE POLICY "Players can view own waivers"
  ON player_waivers FOR SELECT
  USING (player_id = auth.uid());

-- Players can insert their own waivers
CREATE POLICY "Players can sign waivers"
  ON player_waivers FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- League admins can view waivers for their league
CREATE POLICY "League admins can view waivers"
  ON player_waivers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = player_waivers.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ==============================================================================
-- ROW LEVEL SECURITY - registration_submissions
-- ==============================================================================
ALTER TABLE registration_submissions ENABLE ROW LEVEL SECURITY;

-- Players can view their own registrations
CREATE POLICY "Players can view own registrations"
  ON registration_submissions FOR SELECT
  USING (player_id = auth.uid());

-- Players can insert their own registrations
CREATE POLICY "Players can submit registrations"
  ON registration_submissions FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Players can update their own pending registrations
CREATE POLICY "Players can update own pending registrations"
  ON registration_submissions FOR UPDATE
  USING (
    player_id = auth.uid()
    AND status IN ('pending', 'waitlisted')
  );

-- Players can cancel their own pending registrations
CREATE POLICY "Players can cancel own registrations"
  ON registration_submissions FOR DELETE
  USING (
    player_id = auth.uid()
    AND status = 'pending'
  );

-- League admins can view all registrations for their league
CREATE POLICY "League admins can view registrations"
  ON registration_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = registration_submissions.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- League admins can update registrations (approve/reject)
CREATE POLICY "League admins can update registrations"
  ON registration_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = registration_submissions.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ==============================================================================
-- ROW LEVEL SECURITY - league_waiver_templates
-- ==============================================================================
ALTER TABLE league_waiver_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active waiver templates (for registration)
CREATE POLICY "Anyone can view active waiver templates"
  ON league_waiver_templates FOR SELECT
  USING (is_active = TRUE);

-- League admins can manage waiver templates
CREATE POLICY "League admins can manage waiver templates"
  ON league_waiver_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE user_id = auth.uid()
        AND league_id = league_waiver_templates.league_id
        AND status = 'active'
        AND role IN ('owner', 'admin')
    )
  );

-- ==============================================================================
-- STORAGE POLICIES - player-photos
-- ==============================================================================

-- Players can upload their own photos
CREATE POLICY "Users can upload own player photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Players can update their own photos
CREATE POLICY "Users can update own player photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Players can delete their own photos
CREATE POLICY "Users can delete own player photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view player photos (public bucket)
CREATE POLICY "Anyone can view player photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-photos');

-- ==============================================================================
-- HELPER FUNCTIONS
-- ==============================================================================

-- Function to get pending registration count for a league
CREATE OR REPLACE FUNCTION get_pending_registration_count(check_league_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM registration_submissions
    WHERE league_id = check_league_id
      AND status = 'pending'
  );
END;
$$;

-- Function to check if player is already registered for a season
CREATE OR REPLACE FUNCTION is_player_registered(
  check_player_id UUID,
  check_league_id UUID,
  check_season_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM registration_submissions
    WHERE player_id = check_player_id
      AND league_id = check_league_id
      AND season_id = check_season_id
      AND status IN ('pending', 'approved', 'waitlisted')
  );
END;
$$;

-- Function to get registration summary for admin dashboard
CREATE OR REPLACE FUNCTION get_registration_summary(check_league_id UUID)
RETURNS TABLE(
  total_submissions BIGINT,
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  waitlisted_count BIGINT,
  team_registrations BIGINT,
  free_agents BIGINT,
  individual_registrations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'waitlisted') as waitlisted_count,
    COUNT(*) FILTER (WHERE registration_type = 'team_registration') as team_registrations,
    COUNT(*) FILTER (WHERE registration_type = 'free_agent') as free_agents,
    COUNT(*) FILTER (WHERE registration_type = 'individual') as individual_registrations
  FROM registration_submissions
  WHERE league_id = check_league_id;
END;
$$;

-- Function to hash waiver content for version control
CREATE OR REPLACE FUNCTION hash_waiver_content(content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(sha256(content::bytea), 'hex');
END;
$$;

-- ==============================================================================
-- NOTIFICATION TRIGGERS
-- ==============================================================================

-- Function to queue notification on registration submission
CREATE OR REPLACE FUNCTION notify_on_registration_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_email TEXT;
  player_name TEXT;
  league_name TEXT;
BEGIN
  -- Only trigger when status changes to pending and submitted_at is set
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL OR OLD.status != NEW.status) THEN
    -- Get player info
    SELECT email, full_name INTO player_email, player_name
    FROM profiles WHERE id = NEW.player_id;

    -- Get league name
    SELECT name INTO league_name
    FROM leagues WHERE id = NEW.league_id;

    -- Queue notification for player confirmation
    IF NEW.status = 'pending' THEN
      INSERT INTO notifications_queue (
        recipient_id,
        template_id,
        template_data,
        channels
      ) VALUES (
        NEW.player_id,
        'registration_submitted_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'registration_type', NEW.registration_type,
          'submitted_at', NEW.submitted_at
        ),
        ARRAY['email', 'in_app']
      );

      -- Also notify league admins
      INSERT INTO notifications_queue (
        recipient_id,
        template_id,
        template_data,
        channels
      )
      SELECT
        lm.user_id,
        'new_registration_admin_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'registration_type', NEW.registration_type,
          'registration_id', NEW.id
        ),
        ARRAY['email', 'in_app']
      FROM league_memberships lm
      WHERE lm.league_id = NEW.league_id
        AND lm.role IN ('owner', 'admin')
        AND lm.status = 'active';
    END IF;

    -- Queue notification for approval
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
      INSERT INTO notifications_queue (
        recipient_id,
        template_id,
        template_data,
        channels
      ) VALUES (
        NEW.player_id,
        'registration_approved_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'team_id', NEW.assigned_team_id,
          'jersey_number', NEW.assigned_jersey_number
        ),
        ARRAY['email', 'in_app']
      );
    END IF;

    -- Queue notification for rejection
    IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
      INSERT INTO notifications_queue (
        recipient_id,
        template_id,
        template_data,
        channels
      ) VALUES (
        NEW.player_id,
        'registration_rejected_v1',
        jsonb_build_object(
          'player_name', player_name,
          'league_name', league_name,
          'reason', COALESCE(NEW.rejection_reason, 'No reason provided')
        ),
        ARRAY['email', 'in_app']
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS trigger_registration_notification ON registration_submissions;
CREATE TRIGGER trigger_registration_notification
  AFTER INSERT OR UPDATE ON registration_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_registration_submission();

-- ==============================================================================
-- DEFAULT WAIVER TEMPLATE
-- ==============================================================================

-- Insert a default waiver template function that leagues can customize
CREATE OR REPLACE FUNCTION create_default_waiver_for_league(target_league_id UUID, creator_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_content TEXT;
  new_waiver_id UUID;
BEGIN
  default_content := E'# Participant Waiver and Release of Liability

## PLEASE READ CAREFULLY BEFORE SIGNING

By signing this waiver, I acknowledge and agree to the following:

### Assumption of Risk
I understand that participating in recreational hockey involves inherent risks, including but not limited to:
- Physical contact and collisions with other players, equipment, or structures
- Falls on ice surfaces
- Injuries from pucks, sticks, and other equipment
- Muscle strains, sprains, fractures, and other physical injuries

### Release of Liability
I voluntarily assume all risks associated with participation and hereby release and hold harmless the league, its officers, directors, employees, volunteers, and affiliated organizations from any claims, damages, or injuries arising from my participation.

### Medical Authorization
In case of emergency, I authorize league officials to obtain medical treatment on my behalf if I am unable to provide consent.

### Rules and Conduct
I agree to:
- Follow all league rules and regulations
- Demonstrate good sportsmanship at all times
- Respect officials, opponents, and teammates
- Wear appropriate protective equipment as required

### Media Release
I grant permission for my likeness to be used in league promotional materials, photos, and videos.

### Acknowledgment
I have read this waiver, understand its contents, and sign it voluntarily.';

  INSERT INTO league_waiver_templates (
    league_id,
    title,
    content,
    version,
    content_hash,
    is_active,
    created_by
  ) VALUES (
    target_league_id,
    'Participant Waiver and Release of Liability',
    default_content,
    'v1',
    hash_waiver_content(default_content),
    TRUE,
    creator_id
  )
  RETURNING id INTO new_waiver_id;

  RETURN new_waiver_id;
END;
$$;

-- ==============================================================================
-- SUCCESS MESSAGE
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Player Registration System Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - player_waivers';
  RAISE NOTICE '  - registration_submissions';
  RAISE NOTICE '  - league_waiver_templates';
  RAISE NOTICE '';
  RAISE NOTICE 'Profile Columns Added:';
  RAISE NOTICE '  - emergency_contact_name';
  RAISE NOTICE '  - emergency_contact_phone';
  RAISE NOTICE '  - emergency_contact_relationship';
  RAISE NOTICE '  - medical_notes';
  RAISE NOTICE '  - photo_url';
  RAISE NOTICE '';
  RAISE NOTICE 'Storage Bucket:';
  RAISE NOTICE '  - player-photos (5MB limit, PNG/JPEG/WebP)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies: Enabled';
  RAISE NOTICE 'Notification Triggers: Active';
  RAISE NOTICE '==============================================';
END $$;
