-- ==============================================================================
-- HLHL LEGACY SEASON: Create Historical Stats Container
-- ==============================================================================
-- Description: Create single season to house all pre-2026 legacy stats
-- Author: Legacy Stats Migration
-- Date: February 15, 2026
-- ==============================================================================

BEGIN;

-- Create legacy season for HLHL
INSERT INTO seasons (
  id,
  league_id,
  name,
  start_date,
  end_date,
  status,
  registration_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c', -- HLHL league ID
  'HLHL Legacy Stats (Pre-2026)',
  '2020-01-01'::DATE,
  '2025-12-31'::DATE,
  'archived', -- Archived so it doesn't appear as current/active season
  'open', -- Default registration type
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verification
SELECT
  'Legacy Season Created' as check_name,
  id,
  name,
  status,
  start_date,
  end_date,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
FROM seasons
WHERE league_id = '2483cb8f-8af4-4aca-9cbb-b8e83ba91f4c'
  AND name = 'HLHL Legacy Stats (Pre-2026)';
