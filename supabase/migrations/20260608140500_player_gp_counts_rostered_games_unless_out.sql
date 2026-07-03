-- Count games played from rostered completed games unless the player was
-- explicitly marked out. A missing check-in is not evidence the player missed.
--
-- Scoring totals still come only from player_stats.

CREATE OR REPLACE VIEW public.player_season_stats AS
WITH stat_totals AS (
  SELECT
    ps.player_id,
    ps.season_id,
    ps.team_id,
    SUM(COALESCE(ps.goals, 0)) AS goals,
    SUM(COALESCE(ps.assists, 0)) AS assists
  FROM public.player_stats ps
  INNER JOIN public.games g
    ON g.id = ps.game_id
   AND g.status = 'completed'
  GROUP BY ps.player_id, ps.season_id, ps.team_id
),
appearances AS (
  SELECT DISTINCT
    tr.player_id,
    tr.season_id,
    tr.team_id,
    g.id AS game_id
  FROM public.team_rosters tr
  INNER JOIN public.games g
    ON g.season_id = tr.season_id
   AND g.status = 'completed'
   AND (g.home_team_id = tr.team_id OR g.away_team_id = tr.team_id)
  WHERE tr.status = 'active'
    AND tr.player_type = 'regular'
    AND tr.start_date <= (g.scheduled_at AT TIME ZONE 'America/Toronto')::date
    AND (
      tr.end_date IS NULL
      OR tr.end_date >= (g.scheduled_at AT TIME ZONE 'America/Toronto')::date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.game_checkins gc
      WHERE gc.game_id = g.id
        AND gc.team_id = tr.team_id
        AND gc.player_id = tr.player_id
        AND gc.status = 'out'
    )

  UNION

  SELECT DISTINCT
    si.invited_player_id AS player_id,
    g.season_id,
    si.team_id,
    si.game_id
  FROM public.sub_invitations si
  INNER JOIN public.games g
    ON g.id = si.game_id
   AND g.status = 'completed'
  WHERE si.status = 'accepted'
    AND si.invited_player_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.game_checkins gc
      WHERE gc.game_id = si.game_id
        AND gc.team_id = si.team_id
        AND gc.player_id = si.invited_player_id
        AND gc.status = 'out'
    )

  UNION

  SELECT DISTINCT
    ps.player_id,
    ps.season_id,
    ps.team_id,
    ps.game_id
  FROM public.player_stats ps
  INNER JOIN public.games g
    ON g.id = ps.game_id
   AND g.status = 'completed'
),
appearance_totals AS (
  SELECT
    player_id,
    season_id,
    team_id,
    COUNT(DISTINCT game_id) AS games_played
  FROM appearances
  GROUP BY player_id, season_id, team_id
)
SELECT
  a.player_id,
  a.season_id,
  p.full_name,
  COALESCE(tr.jersey_number, p.jersey_number) AS jersey_number,
  tr.position::text AS position,
  t.name AS team_name,
  t.short_name AS team_short_name,
  t.primary_color AS team_color,
  a.games_played,
  COALESCE(st.goals, 0) AS goals,
  COALESCE(st.assists, 0) AS assists,
  (COALESCE(st.goals, 0) + COALESCE(st.assists, 0)) AS points,
  ROUND(
    (COALESCE(st.goals, 0) + COALESCE(st.assists, 0))::numeric
      / NULLIF(a.games_played, 0),
    2
  ) AS points_per_game,
  a.team_id,
  t.division_id
FROM appearance_totals a
INNER JOIN public.profiles p
  ON p.id = a.player_id
INNER JOIN public.teams t
  ON t.id = a.team_id
LEFT JOIN stat_totals st
  ON st.player_id = a.player_id
 AND st.season_id = a.season_id
 AND st.team_id = a.team_id
LEFT JOIN public.team_rosters tr
  ON tr.player_id = a.player_id
 AND tr.season_id = a.season_id
 AND tr.team_id = a.team_id;
