-- ==============================================================================
-- SETUP: Barrie Mens Hockey League (BMHL) - FIXED VERSION
-- ==============================================================================
-- Description: Full enterprise setup for BMHL with 8 divisions, 25 teams
-- Date: January 28, 2026
-- Fixed: Uses only columns that exist in current schema
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
  address,
  city,
  state_province,
  country,
  postal_code,
  timezone,
  is_public,
  logo_url,
  banner_url,
  primary_color,
  secondary_color,
  accent_color,
  subdomain,
  status,
  tagline,
  font_family,
  favicon_url,
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
  'L4M',
  'America/Toronto',
  true,
  '/bmhl-logo.png',
  '/banner2.png',
  '#0A1E3F', -- Deep Navy (Primary)
  '#3CA6DB', -- Ice Blue (Secondary)
  '#E63946', -- Action Red (Accent)
  'bmhl',
  'active',
  'Where Skills Meet Community Ice',
  'Inter, system-ui, sans-serif',
  '/bmhl-logo.png',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  updated_at = NOW();

-- ==============================================================================
-- STEP 2: Create 8 Divisions (A, B, C1, C2, D1, D2, D3, Rec)
-- ==============================================================================

INSERT INTO divisions (league_id, name, skill_level, description, created_at) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division A', 'advanced', 'Elite level competitive hockey', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division B', 'intermediate', 'High level competitive play', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division C1', 'intermediate', 'Intermediate level - Tier 1', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division C2', 'intermediate', 'Intermediate level - Tier 2', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D1', 'beginner', 'Recreational level - Tier 1', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D2', 'beginner', 'Recreational level - Tier 2', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Division D3', 'beginner', 'Recreational level - Tier 3', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Rec Division', 'beginner', 'Pure recreational play', NOW())
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
  SELECT id INTO div_a_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division A';
  SELECT id INTO div_b_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division B';
  SELECT id INTO div_c1_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division C1';
  SELECT id INTO div_c2_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division C2';
  SELECT id INTO div_d1_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division D1';
  SELECT id INTO div_d2_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division D2';
  SELECT id INTO div_d3_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Division D3';
  SELECT id INTO div_rec_id FROM divisions WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID AND name = 'Rec Division';

  -- Division A Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_a_id, 'Bandits', '#000000', '#FFD700'),
    (league_id, season_id, div_a_id, 'Kraken', '#001F3F', '#00CED1'),
    (league_id, season_id, div_a_id, 'Steelheads', '#4682B4', '#C0C0C0')
  ON CONFLICT DO NOTHING;

  -- Division B Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_b_id, 'No Stars', '#006400', '#FFD700'),
    (league_id, season_id, div_b_id, 'Brewers', '#8B4513', '#FFD700'),
    (league_id, season_id, div_b_id, 'Dickens', '#800000', '#FFFFFF')
  ON CONFLICT DO NOTHING;

  -- Division C1 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_c1_id, 'Kage Whalers', '#000080', '#87CEEB'),
    (league_id, season_id, div_c1_id, 'Renegades', '#8B0000', '#000000'),
    (league_id, season_id, div_c1_id, 'Dolphins', '#1E90FF', '#C0C0C0')
  ON CONFLICT DO NOTHING;

  -- Division C2 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_c2_id, 'Goal Diggers', '#FFD700', '#000000'),
    (league_id, season_id, div_c2_id, 'CGM Lions', '#FF8C00', '#000000'),
    (league_id, season_id, div_c2_id, 'Door Rangers', '#0000FF', '#FFFFFF')
  ON CONFLICT DO NOTHING;

  -- Division D1 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d1_id, 'Toe Dragons', '#8B008B', '#FFD700'),
    (league_id, season_id, div_d1_id, 'Coors Lightning', '#C0C0C0', '#FFD700'),
    (league_id, season_id, div_d1_id, 'Canada Wide', '#FF0000', '#FFFFFF')
  ON CONFLICT DO NOTHING;

  -- Division D2 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d2_id, 'Cowbros', '#8B4513', '#FFFFFF'),
    (league_id, season_id, div_d2_id, 'Ice Bulls', '#000000', '#FF0000'),
    (league_id, season_id, div_d2_id, 'Mighty Pucks', '#4169E1', '#FFD700')
  ON CONFLICT DO NOTHING;

  -- Division D3 Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_d3_id, 'Tigers', '#FF8C00', '#000000'),
    (league_id, season_id, div_d3_id, 'Fighting Pints', '#006400', '#FFD700'),
    (league_id, season_id, div_d3_id, 'Silky Needles', '#4B0082', '#FFFFFF')
  ON CONFLICT DO NOTHING;

  -- Rec Division Teams
  INSERT INTO teams (league_id, season_id, division_id, name, primary_color, secondary_color) VALUES
    (league_id, season_id, div_rec_id, 'Hockey Benders', '#FF69B4', '#FFFFFF'),
    (league_id, season_id, div_rec_id, 'Savages', '#8B0000', '#FFD700'),
    (league_id, season_id, div_rec_id, 'Outlaws', '#2F4F4F', '#C0C0C0'),
    (league_id, season_id, div_rec_id, 'Slot Rockets', '#FF4500', '#000000')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created 25 teams across 8 divisions';
END $$;

-- ==============================================================================
-- STEP 5: Add League Owner/Admin (OPTIONAL - Update email if needed)
-- ==============================================================================

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- TODO: Replace with actual BMHL admin email
  -- Leave as-is if you'll add admin later
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE email = 'your-email@example.com' -- CHANGE THIS or add later
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

    RAISE NOTICE '✅ Added league owner successfully';
  ELSE
    RAISE NOTICE '⚠️  Admin user not found - you can add owner later';
  END IF;
END $$;

COMMIT;

-- ==============================================================================
-- STEP 6: Verification & Summary
-- ==============================================================================

SELECT
  '🎉 BMHL League Setup Complete!' AS status,
  l.name AS league_name,
  l.slug,
  l.subdomain,
  (SELECT COUNT(*) FROM divisions WHERE league_id = l.id) AS divisions,
  (SELECT COUNT(*) FROM teams WHERE league_id = l.id) AS teams,
  (SELECT COUNT(*) FROM seasons WHERE league_id = l.id) AS seasons,
  (SELECT COUNT(*) FROM league_memberships WHERE league_id = l.id AND role = 'owner') AS owners
FROM leagues l
WHERE l.id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;

-- Show divisions
SELECT
  '📊 Divisions Created' as info,
  name,
  skill_level,
  (SELECT COUNT(*) FROM teams t WHERE t.division_id = d.id) as team_count
FROM divisions d
WHERE league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID
ORDER BY name;

-- Show teams by division
SELECT
  '🏒 Teams Created' as info,
  d.name as division,
  t.name as team_name,
  t.primary_color,
  t.secondary_color
FROM teams t
JOIN divisions d ON t.division_id = d.id
WHERE t.league_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID
ORDER BY d.name, t.name;
