-- ==============================================================================
-- SETUP: Barrie Mens Hockey League (BMHL) - ENTERPRISE EDITION
-- ==============================================================================
-- Description: Full enterprise setup for BMHL with 8 divisions, 20+ teams
-- Date: January 28, 2026
-- Budget: High-value customer (burned $10k with previous agency)
-- Requirements: Multi-division, advanced stats, real-time standings
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- STEP 1: Create the BMHL League with Proper Branding
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
  text_color,
  background_color,
  theme_mode,
  custom_domain,
  subdomain,
  status,
  created_at
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Barrie Mens Hockey League',
  'bmhl',
  'Barrie''s Home of Adult Hockey. Premier recreational mens hockey league serving Barrie, Ontario with multiple skill divisions from A to Rec. Where Skills Meet Community Ice.',
  'Barrie, Ontario',
  'Barrie',
  'ON',
  'Canada',
  'America/Toronto',
  true,
  true,
  '/bmhl-logo.png',
  '/banner2.png',
  '#0A1E3F', -- Deep Navy (Primary)
  '#3CA6DB', -- Ice Blue (Secondary)
  '#E63946', -- Action Red (Accent)
  '#FFFFFF', -- White text
  '#0A1E3F', -- Navy background
  'dark',
  NULL, -- Will add custom domain after DNS setup
  'bmhl',
  'active',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  logo = EXCLUDED.logo,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  updated_at = NOW();

-- ==============================================================================
-- STEP 2: Create 8 Divisions (A, B, C1, C2, D1, D2, D3, Rec)
-- ==============================================================================

INSERT INTO divisions (id, league_id, name, slug, skill_level, sort_order, description, created_at) VALUES
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division A', 'a', 'advanced', 1, 'Elite level competitive hockey', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division B', 'b', 'intermediate', 2, 'High level competitive play', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division C1', 'c1', 'intermediate', 3, 'Intermediate level - Tier 1', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division C2', 'c2', 'intermediate', 4, 'Intermediate level - Tier 2', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D1', 'd1', 'beginner', 5, 'Recreational level - Tier 1', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D2', 'd2', 'beginner', 6, 'Recreational level - Tier 2', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D3', 'd3', 'beginner', 7, 'Recreational level - Tier 3', NOW()),
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Rec Division', 'rec', 'beginner', 8, 'Pure recreational play', NOW())
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- STEP 3: Create Current Season (Winter 2026)
-- ==============================================================================

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
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
  'Winter 2026',
  2026,
  '2026-02-01',
  '2026-05-31',
  '2026-01-15',
  '2026-01-31',
  'team_signup',
  32, -- 32 teams total across divisions
  10,
  15,
  12,
  8, -- Top teams from each division
  'active', -- Season is active
  'regular_season',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STEP 4: Create 25 Teams Across Divisions
-- ==============================================================================

-- Helper function to get division IDs
DO $$
DECLARE
  div_a_id UUID;
  div_b_id UUID;
  div_c1_id UUID;
  div_c2_id UUID;
  div_d1_id UUID;
  div_d2_id UUID;
  div_d3_id UUID;
  div_rec_id UUID;
  season_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID;
  league_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
BEGIN
  -- Get division IDs
  SELECT id INTO div_a_id FROM divisions WHERE league_id = league_id AND slug = 'a';
  SELECT id INTO div_b_id FROM divisions WHERE league_id = league_id AND slug = 'b';
  SELECT id INTO div_c1_id FROM divisions WHERE league_id = league_id AND slug = 'c1';
  SELECT id INTO div_c2_id FROM divisions WHERE league_id = league_id AND slug = 'c2';
  SELECT id INTO div_d1_id FROM divisions WHERE league_id = league_id AND slug = 'd1';
  SELECT id INTO div_d2_id FROM divisions WHERE league_id = league_id AND slug = 'd2';
  SELECT id INTO div_d3_id FROM divisions WHERE league_id = league_id AND slug = 'd3';
  SELECT id INTO div_rec_id FROM divisions WHERE league_id = league_id AND slug = 'rec';

  -- Division A Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_a_id, 'Bandits', '#000000', '#FFD700'),
    (league_id, season_id, div_a_id, 'Kraken', '#001F3F', '#00CED1'),
    (league_id, season_id, div_a_id, 'Steelheads', '#4682B4', '#C0C0C0');

  -- Division B Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_b_id, 'No Stars', '#006400', '#FFD700'),
    (league_id, season_id, div_b_id, 'Brewers', '#8B4513', '#FFD700'),
    (league_id, season_id, div_b_id, 'Dickens', '#800000', '#FFFFFF');

  -- Division C1 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_c1_id, 'Kage Whalers', '#000080', '#87CEEB'),
    (league_id, season_id, div_c1_id, 'Renegades', '#8B0000', '#000000'),
    (league_id, season_id, div_c1_id, 'Dolphins', '#1E90FF', '#C0C0C0');

  -- Division C2 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_c2_id, 'Goal Diggers', '#FFD700', '#000000'),
    (league_id, season_id, div_c2_id, 'CGM Lions', '#FF8C00', '#000000'),
    (league_id, season_id, div_c2_id, 'Door Rangers', '#0000FF', '#FFFFFF');

  -- Division D1 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d1_id, 'Toe Dragons', '#8B008B', '#FFD700'),
    (league_id, season_id, div_d1_id, 'Coors Lightning', '#C0C0C0', '#FFD700'),
    (league_id, season_id, div_d1_id, 'Canada Wide', '#FF0000', '#FFFFFF');

  -- Division D2 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d2_id, 'Cowbros', '#8B4513', '#FFFFFF'),
    (league_id, season_id, div_d2_id, 'Ice Bulls', '#000000', '#FF0000'),
    (league_id, season_id, div_d2_id, 'Mighty Pucks', '#4169E1', '#FFD700');

  -- Division D3 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d3_id, 'Tigers', '#FF8C00', '#000000'),
    (league_id, season_id, div_d3_id, 'Fighting Pints', '#006400', '#FFD700'),
    (league_id, season_id, div_d3_id, 'Silky Needles', '#4B0082', '#FFFFFF');

  -- Rec Division Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_rec_id, 'Hockey Benders', '#FF69B4', '#FFFFFF'),
    (league_id, season_id, div_rec_id, 'Savages', '#8B0000', '#FFD700'),
    (league_id, season_id, div_rec_id, 'Outlaws', '#2F4F4F', '#C0C0C0'),
    (league_id, season_id, div_rec_id, 'Slot Rockets', '#FF4500', '#000000');

  RAISE NOTICE 'Created 25 teams across 8 divisions';
END $$;

-- ==============================================================================
-- STEP 5: Add League Owner/Admin
-- ==============================================================================

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- TODO: Replace with actual BMHL admin email
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE email = 'your-email@example.com' -- CHANGE THIS
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
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
    RAISE WARNING 'Admin user not found - add email at line 202';
  END IF;
END $$;

-- ==============================================================================
-- STEP 6: Verification & Summary
-- ==============================================================================

SELECT
  'BMHL League Setup Complete' AS status,
  l.name AS league_name,
  l.slug,
  l.subdomain,
  (SELECT COUNT(*) FROM divisions WHERE league_id = l.id) AS divisions,
  (SELECT COUNT(*) FROM teams WHERE league_id = l.id) AS teams,
  (SELECT COUNT(*) FROM seasons WHERE league_id = l.id) AS seasons,
  (SELECT COUNT(*) FROM league_memberships WHERE league_id = l.id) AS members
FROM leagues l
WHERE l.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;

-- Show divisions
SELECT
  'Divisions Created' AS status,
  d.name,
  d.slug,
  d.skill_level,
  COUNT(t.id) AS team_count
FROM divisions d
LEFT JOIN teams t ON d.id = t.division_id
WHERE d.league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID
GROUP BY d.id, d.name, d.slug, d.skill_level, d.sort_order
ORDER BY d.sort_order;

-- Show teams by division
SELECT
  'Teams Created' AS status,
  d.name AS division,
  t.name AS team_name,
  t.primary_color,
  t.secondary_color
FROM teams t
JOIN divisions d ON t.division_id = d.id
WHERE t.league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID
ORDER BY d.sort_order, t.name;

-- ==============================================================================
-- Success Message
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'BMHL ENTERPRISE SETUP COMPLETE!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'League: Barrie Mens Hockey League';
  RAISE NOTICE 'Access: /bmhl or bmhl.yourdomain.com';
  RAISE NOTICE 'Divisions: 8 (A, B, C1, C2, D1, D2, D3, Rec)';
  RAISE NOTICE 'Teams: 25 created';
  RAISE NOTICE 'Season: Winter 2026 (Active)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Update admin email (line 202)';
  RAISE NOTICE '2. Test access at /bmhl';
  RAISE NOTICE '3. Configure custom domain';
  RAISE NOTICE '4. Schedule demo with BMHL';
  RAISE NOTICE '5. Import existing player data';
  RAISE NOTICE '6. Set up payment processing';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ==============================================================================
-- ROLLBACK (if needed)
-- ==============================================================================
-- DELETE FROM teams WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
-- DELETE FROM seasons WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
-- DELETE FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
-- DELETE FROM league_memberships WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
-- DELETE FROM leagues WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
