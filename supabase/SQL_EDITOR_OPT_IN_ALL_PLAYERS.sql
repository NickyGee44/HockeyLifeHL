-- ============================================
-- Opt-In All Players to Current Season as Full-Time
-- Run this in Supabase SQL Editor
-- ============================================
-- This script will:
-- 1. Create the season_opt_ins table if it doesn't exist
-- 2. Opt-in all existing players to the current active/draft season as full-time players

-- ============================================
-- STEP 1: Create season_opt_ins table if it doesn't exist
-- ============================================

-- Create enum for opt-in types if it doesn't exist
DO $$ BEGIN
  CREATE TYPE opt_in_type AS ENUM ('full_time', 'call_up');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the season_opt_ins table if it doesn't exist
CREATE TABLE IF NOT EXISTS season_opt_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  opt_in_type opt_in_type NOT NULL DEFAULT 'full_time',
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(player_id, season_id) -- One opt-in per player per season
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_season_opt_ins_season ON season_opt_ins(season_id);
CREATE INDEX IF NOT EXISTS idx_season_opt_ins_player ON season_opt_ins(player_id);
CREATE INDEX IF NOT EXISTS idx_season_opt_ins_type ON season_opt_ins(season_id, opt_in_type);

-- Enable RLS if not already enabled
ALTER TABLE season_opt_ins ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies if they don't exist
DO $$ 
BEGIN
  -- Policy for viewing all opt-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'season_opt_ins' 
    AND policyname = 'Season opt-ins are viewable by everyone'
  ) THEN
    CREATE POLICY "Season opt-ins are viewable by everyone" ON season_opt_ins
      FOR SELECT USING (true);
  END IF;

  -- Policy for players managing their own opt-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'season_opt_ins' 
    AND policyname = 'Players can manage own opt-ins'
  ) THEN
    CREATE POLICY "Players can manage own opt-ins" ON season_opt_ins
      FOR ALL USING (auth.uid() = player_id);
  END IF;

  -- Policy for owners managing all opt-ins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'season_opt_ins' 
    AND policyname = 'Owners can manage all opt-ins'
  ) THEN
    CREATE POLICY "Owners can manage all opt-ins" ON season_opt_ins
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
      );
  END IF;
END $$;

-- ============================================
-- STEP 2: Check what seasons we have
-- ============================================

-- First, let's see what seasons we have
SELECT id, name, status, start_date 
FROM seasons 
WHERE status IN ('active', 'draft', 'playoffs')
ORDER BY created_at DESC
LIMIT 5;

-- Replace 'YOUR_SEASON_ID_HERE' with the actual season ID from above
-- Or use this to automatically get the most recent active/draft season:

-- Option 1: Opt-in all players to a specific season (replace SEASON_ID)
/*
INSERT INTO season_opt_ins (player_id, season_id, opt_in_type, opted_in_at, updated_at)
SELECT 
  p.id as player_id,
  'YOUR_SEASON_ID_HERE'::uuid as season_id,
  'full_time'::opt_in_type as opt_in_type,
  NOW() as opted_in_at,
  NOW() as updated_at
FROM profiles p
WHERE p.id NOT IN (
  SELECT player_id 
  FROM season_opt_ins 
  WHERE season_id = 'YOUR_SEASON_ID_HERE'::uuid
)
ON CONFLICT (player_id, season_id) DO NOTHING;
*/

-- Option 2: Automatically opt-in all players to the most recent active/draft season
DO $$
DECLARE
  current_season_id UUID;
BEGIN
  -- Get the most recent active/draft season
  SELECT id INTO current_season_id
  FROM seasons
  WHERE status IN ('active', 'draft', 'playoffs')
  ORDER BY created_at DESC
  LIMIT 1;

  IF current_season_id IS NULL THEN
    RAISE EXCEPTION 'No active or draft season found. Please create a season first.';
  END IF;

  -- Opt-in all players who haven't already opted in
  INSERT INTO season_opt_ins (player_id, season_id, opt_in_type, opted_in_at, updated_at)
  SELECT 
    p.id as player_id,
    current_season_id as season_id,
    'full_time'::opt_in_type as opt_in_type,
    NOW() as opted_in_at,
    NOW() as updated_at
  FROM profiles p
  WHERE p.id NOT IN (
    SELECT player_id 
    FROM season_opt_ins 
    WHERE season_id = current_season_id
  )
  ON CONFLICT (player_id, season_id) DO NOTHING;

  RAISE NOTICE 'Opted in % players to season %', 
    (SELECT COUNT(*) FROM season_opt_ins WHERE season_id = current_season_id),
    current_season_id;
END $$;

-- Verify the results
SELECT 
  s.name as season_name,
  s.status as season_status,
  COUNT(soi.player_id) as opted_in_count,
  COUNT(p.id) as total_players
FROM seasons s
LEFT JOIN season_opt_ins soi ON soi.season_id = s.id AND soi.opt_in_type = 'full_time'
CROSS JOIN (SELECT COUNT(*) as id FROM profiles) p
WHERE s.status IN ('active', 'draft', 'playoffs')
GROUP BY s.id, s.name, s.status
ORDER BY s.created_at DESC;
