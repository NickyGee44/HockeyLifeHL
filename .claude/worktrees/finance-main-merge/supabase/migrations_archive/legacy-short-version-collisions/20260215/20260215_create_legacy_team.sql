-- ==============================================================================
-- TEAMS: Create Synthetic "HLHL Legacy Players" Team
-- ==============================================================================
-- Description: Create team to satisfy team_id FK requirement for legacy stats
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create synthetic teams (need 2 teams for home/away constraint)
DO $$
DECLARE
  v_league_id UUID := '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
BEGIN
  -- Create first synthetic team for legacy stats
  INSERT INTO teams (
    id,
    league_id,
    name,
    short_name,
    slug,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_league_id,
    'HLHL Legacy Home',
    'LEGH',
    'hlhl-legacy-home',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Create second synthetic team for legacy stats (away team)
  INSERT INTO teams (
    id,
    league_id,
    name,
    short_name,
    slug,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_league_id,
    'HLHL Legacy Away',
    'LEGA',
    'hlhl-legacy-away',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created HLHL Legacy Home and Away teams';
END $$;

COMMIT;

-- Verification
SELECT
  'Legacy Teams Created' as check_name,
  COUNT(*) as team_count,
  STRING_AGG(t.name, ', ') as team_names
FROM teams t
WHERE t.name IN ('HLHL Legacy Home', 'HLHL Legacy Away')
  AND t.league_id = '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c';
