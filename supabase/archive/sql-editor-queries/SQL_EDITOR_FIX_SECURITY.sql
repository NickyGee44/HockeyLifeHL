-- Fix Supabase Security Linter Warnings
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX 1: Enable RLS on draft_order table
-- ============================================

ALTER TABLE public.draft_order ENABLE ROW LEVEL SECURITY;

-- Add policies for draft_order
CREATE POLICY "Draft order is viewable by everyone" ON public.draft_order
  FOR SELECT USING (true);

CREATE POLICY "Only owners can manage draft order" ON public.draft_order
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================
-- FIX 2: Recreate views as SECURITY INVOKER
-- ============================================

-- Drop and recreate player_season_stats view
DROP VIEW IF EXISTS public.player_season_stats;
CREATE VIEW public.player_season_stats 
WITH (security_invoker = true) AS
SELECT 
  ps.player_id,
  ps.season_id,
  p.full_name,
  p.jersey_number,
  p.position,
  p.avatar_url,
  COUNT(DISTINCT ps.game_id) as games_played,
  SUM(ps.goals) as goals,
  SUM(ps.assists) as assists,
  SUM(ps.goals) + SUM(ps.assists) as points,
  CASE WHEN COUNT(DISTINCT ps.game_id) > 0 
    THEN ROUND((SUM(ps.goals)::numeric + SUM(ps.assists)::numeric) / COUNT(DISTINCT ps.game_id), 2)
    ELSE 0 
  END as points_per_game
FROM player_stats ps
JOIN profiles p ON ps.player_id = p.id
JOIN games g ON ps.game_id = g.id
WHERE g.status = 'completed' 
  AND (g.home_captain_verified = true OR g.home_verified_by_owner = true)
  AND (g.away_captain_verified = true OR g.away_verified_by_owner = true)
GROUP BY ps.player_id, ps.season_id, p.full_name, p.jersey_number, p.position, p.avatar_url;

-- Drop and recreate goalie_season_stats view
DROP VIEW IF EXISTS public.goalie_season_stats;
CREATE VIEW public.goalie_season_stats 
WITH (security_invoker = true) AS
SELECT 
  gs.player_id,
  gs.season_id,
  p.full_name,
  p.jersey_number,
  p.avatar_url,
  COUNT(DISTINCT gs.game_id) as games_played,
  SUM(gs.goals_against) as goals_against,
  SUM(gs.saves) as saves,
  SUM(CASE WHEN gs.shutout THEN 1 ELSE 0 END) as shutouts,
  CASE WHEN COUNT(DISTINCT gs.game_id) > 0 
    THEN ROUND(SUM(gs.goals_against)::numeric / COUNT(DISTINCT gs.game_id), 2)
    ELSE 0 
  END as gaa,
  CASE WHEN (SUM(gs.goals_against) + SUM(gs.saves)) > 0 
    THEN ROUND((SUM(gs.saves)::numeric / (SUM(gs.goals_against) + SUM(gs.saves))) * 100, 1)
    ELSE 0 
  END as save_percentage
FROM goalie_stats gs
JOIN profiles p ON gs.player_id = p.id
JOIN games g ON gs.game_id = g.id
WHERE g.status = 'completed' 
  AND (g.home_captain_verified = true OR g.home_verified_by_owner = true)
  AND (g.away_captain_verified = true OR g.away_verified_by_owner = true)
GROUP BY gs.player_id, gs.season_id, p.full_name, p.jersey_number, p.avatar_url;

-- Drop and recreate player_career_stats view
DROP VIEW IF EXISTS public.player_career_stats;
CREATE VIEW public.player_career_stats 
WITH (security_invoker = true) AS
SELECT 
  ps.player_id,
  p.full_name,
  p.jersey_number,
  p.position,
  p.avatar_url,
  COUNT(DISTINCT ps.game_id) as games_played,
  SUM(ps.goals) as goals,
  SUM(ps.assists) as assists,
  SUM(ps.goals) + SUM(ps.assists) as points,
  CASE WHEN COUNT(DISTINCT ps.game_id) > 0 
    THEN ROUND((SUM(ps.goals)::numeric + SUM(ps.assists)::numeric) / COUNT(DISTINCT ps.game_id), 2)
    ELSE 0 
  END as points_per_game
FROM player_stats ps
JOIN profiles p ON ps.player_id = p.id
JOIN games g ON ps.game_id = g.id
WHERE g.status = 'completed' 
  AND (g.home_captain_verified = true OR g.home_verified_by_owner = true)
  AND (g.away_captain_verified = true OR g.away_verified_by_owner = true)
GROUP BY ps.player_id, p.full_name, p.jersey_number, p.position, p.avatar_url;

-- Drop and recreate team_standings view
DROP VIEW IF EXISTS public.team_standings;
CREATE VIEW public.team_standings 
WITH (security_invoker = true) AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.short_name,
  t.logo_url,
  t.primary_color,
  t.secondary_color,
  g.season_id,
  COUNT(CASE WHEN 
    (g.home_team_id = t.id AND g.home_score > g.away_score) OR
    (g.away_team_id = t.id AND g.away_score > g.home_score)
    THEN 1 END) as wins,
  COUNT(CASE WHEN 
    (g.home_team_id = t.id AND g.home_score < g.away_score) OR
    (g.away_team_id = t.id AND g.away_score < g.home_score)
    THEN 1 END) as losses,
  COUNT(CASE WHEN g.home_score = g.away_score THEN 1 END) as ties,
  COUNT(g.id) as games_played,
  -- Points: 2 for win, 1 for tie, 0 for loss
  COUNT(CASE WHEN 
    (g.home_team_id = t.id AND g.home_score > g.away_score) OR
    (g.away_team_id = t.id AND g.away_score > g.home_score)
    THEN 1 END) * 2 +
  COUNT(CASE WHEN g.home_score = g.away_score THEN 1 END) as points,
  -- Goals for
  SUM(CASE 
    WHEN g.home_team_id = t.id THEN g.home_score
    WHEN g.away_team_id = t.id THEN g.away_score
    ELSE 0 
  END) as goals_for,
  -- Goals against
  SUM(CASE 
    WHEN g.home_team_id = t.id THEN g.away_score
    WHEN g.away_team_id = t.id THEN g.home_score
    ELSE 0 
  END) as goals_against
FROM teams t
LEFT JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id)
  AND g.status = 'completed'
  AND (g.home_captain_verified = true OR g.home_verified_by_owner = true)
  AND (g.away_captain_verified = true OR g.away_verified_by_owner = true)
GROUP BY t.id, t.name, t.short_name, t.logo_url, t.primary_color, t.secondary_color, g.season_id;

-- ============================================
-- Verify fixes
-- ============================================

-- Check RLS is enabled on draft_order
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'draft_order';

-- Check views are now security_invoker
SELECT schemaname, viewname, definition
FROM pg_views
WHERE schemaname = 'public' 
AND viewname IN ('player_season_stats', 'goalie_season_stats', 'player_career_stats', 'team_standings');

