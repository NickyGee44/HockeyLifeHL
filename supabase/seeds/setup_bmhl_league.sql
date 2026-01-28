-- ==============================================================================
-- SETUP: Barrie Mens Hockey League (BMHL)
-- ==============================================================================
-- Description: Creates the BMHL league with full branding and configuration
-- Date: January 28, 2026
-- Purpose: First customer/test league setup
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- STEP 1: Create the BMHL League
-- ==============================================================================

INSERT INTO leagues (
  id,
  name,
  slug,
  description,
  location,
  city,
  province,
  country,
  timezone,
  is_public,
  allow_public_signup,
  logo,
  banner,
  primary_color,
  secondary_color,
  accent_color,
  theme_mode,
  custom_domain,
  subdomain,
  status,
  created_at
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Barrie Mens Hockey League',
  'bmhl',
  'Premier recreational mens hockey league serving the Barrie, Ontario area. Join us for competitive games, great camaraderie, and unforgettable hockey memories.',
  'Barrie, Ontario',
  'Barrie',
  'ON',
  'Canada',
  'America/Toronto',
  true, -- Public league
  true, -- Allow public signup/join requests
  '/bmhl-logo.png',
  '/banner2.png', -- Using existing banner
  '#0B1220', -- Dark blue (professional hockey look)
  '#1E3A5F', -- Medium blue
  '#D4AF37', -- Gold accent (classic hockey gold)
  'dark',
  NULL, -- No custom domain yet
  'bmhl', -- Subdomain: bmhl.yourdomain.com
  'active',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  logo = EXCLUDED.logo,
  updated_at = NOW();

-- ==============================================================================
-- STEP 2: Add League Owner
-- ==============================================================================
-- NOTE: Replace 'your-email@example.com' with the actual admin email
-- This user must already exist in the profiles table

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for the league owner
  -- TODO: Replace this email with the actual BMHL admin email
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE email = 'your-email@example.com' -- CHANGE THIS
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Add them as league owner
    INSERT INTO league_memberships (league_id, user_id, role, status, created_at)
    VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
      admin_user_id,
      'owner',
      'active',
      NOW()
    ) ON CONFLICT (league_id, user_id) DO UPDATE SET
      role = 'owner',
      status = 'active';

    RAISE NOTICE 'Added league owner successfully';
  ELSE
    RAISE WARNING 'Admin user not found - please update the email in the script';
  END IF;
END $$;

-- ==============================================================================
-- STEP 3: Create Default Season (Optional)
-- ==============================================================================
-- Uncomment this section if you want to create a test season

/*
INSERT INTO seasons (
  id,
  league_id,
  name,
  season_year,
  start_date,
  end_date,
  registration_open_date,
  registration_close_date,
  registration_type,
  max_teams,
  min_players_per_team,
  max_players_per_team,
  games_per_team,
  playoff_teams,
  status,
  current_phase,
  created_at
) VALUES (
  gen_random_uuid(),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Winter 2026',
  2026,
  '2026-02-01',
  '2026-04-30',
  '2026-01-15',
  '2026-01-31',
  'team_signup',
  8, -- 8 teams
  10, -- Min 10 players per team
  15, -- Max 15 players per team
  12, -- 12 games per team
  4, -- Top 4 teams make playoffs
  'registration', -- Current status
  'registration', -- Current phase
  NOW()
);
*/

-- ==============================================================================
-- STEP 4: Verify the Setup
-- ==============================================================================

SELECT
  'BMHL League Created' AS status,
  l.id,
  l.name,
  l.slug,
  l.subdomain,
  l.status,
  COUNT(lm.id) AS member_count,
  COUNT(lm.id) FILTER (WHERE lm.role = 'owner') AS owners
FROM leagues l
LEFT JOIN league_memberships lm ON l.id = lm.league_id
WHERE l.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID
GROUP BY l.id, l.name, l.slug, l.subdomain, l.status;

-- ==============================================================================
-- STEP 5: Next Steps
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'BMHL League Setup Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update the admin email in this script (line 64)';
  RAISE NOTICE '2. Access the league at: /bmhl or bmhl.yourdomain.com';
  RAISE NOTICE '3. Login as the owner to configure settings';
  RAISE NOTICE '4. Go to Settings > General to add custom domain';
  RAISE NOTICE '5. Go to Settings > Branding to customize colors';
  RAISE NOTICE '6. Create teams and a season';
  RAISE NOTICE '7. Invite players to join';
  RAISE NOTICE '';
  RAISE NOTICE 'Logo location: /bmhl-logo.png';
  RAISE NOTICE 'League ID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  RAISE NOTICE 'Slug: bmhl';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ==============================================================================
-- ROLLBACK (if needed)
-- ==============================================================================
-- To remove the BMHL league, run:
--
-- DELETE FROM league_memberships WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
-- DELETE FROM leagues WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
--
-- ==============================================================================
