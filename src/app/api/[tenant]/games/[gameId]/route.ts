/**
 * Game Detail API
 *
 * GET /api/[tenant]/games/[gameId]
 *
 * Returns full game details including:
 * - Basic game info (teams, venue, division, status, scores)
 * - Team rosters (players on each team)
 * - Player stats (goals, assists, PIM, goalie stats)
 * - Venue details with address
 * - Reschedule history (if game was rescheduled)
 * - Team season records and head-to-head series
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";

/**
 * Team roster player
 */
interface RosterPlayer {
  id: string;
  name: string;
  jerseyNumber: string | null;
  position: string | null;
}

/**
 * Player game stats
 */
interface PlayerStats {
  playerId: string;
  playerName: string;
  jerseyNumber: string | null;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  shots: number;
  saves?: number; // Goalie only
  goalsAgainst?: number; // Goalie only
}

/**
 * Reschedule history entry
 */
interface RescheduleHistoryEntry {
  gameId: string;
  scheduledAt: string;
  status: string;
  rescheduleReason: string | null;
  rescheduledAt: string | null;
  rescheduledBy: string | null;
  isOriginal: boolean;
  isCurrent: boolean;
}

/**
 * Full game detail response
 */
interface GameDetailResponse {
  id: string;
  scheduledAt: string;
  status: string;
  homeTeam: {
    id: string;
    name: string;
    logoUrl: string | null;
    score?: number;
    roster: RosterPlayer[];
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl: string | null;
    score?: number;
    roster: RosterPlayer[];
  };
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
  };
  division?: {
    id: string;
    name: string;
  };
  scorekeeper?: {
    id: string;
    name: string;
  };
  playerStats: {
    homeTeam: PlayerStats[];
    awayTeam: PlayerStats[];
  };
  rescheduleHistory?: RescheduleHistoryEntry[];
  teamRecords?: {
    homeTeamRecord: { wins: number; losses: number; ties: number };
    awayTeamRecord: { wins: number; losses: number; ties: number };
    seasonSeries: { homeWins: number; awayWins: number; ties: number };
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; gameId: string }> }
) {
  try {
    // 1. Authenticate user
    const { userId } = await requireAuth();

    // 2. Resolve params
    const { tenant, gameId } = await params;

    // 3. Validate tenant access
    const tenantAccess = await validateTenantAccess(tenant, userId);
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;

    const supabase = await createClient();

    // 4. Fetch game with full details
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(
        `
        id,
        scheduled_at,
        status,
        home_score,
        away_score,
        season_id,
        home_team:teams!games_home_team_id_fkey(id, name, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, logo_url),
        venue:venues(id, name, address, city, state_province, postal_code),
        division:divisions(id, name),
        scorekeeper:profiles(id, name)
      `
      )
      .eq("id", gameId)
      .eq("league_id", leagueId)
      .single();

    if (gameError || !game) {
      throw ErrorResponses.notFound("Game");
    }

    // 5. Fetch team rosters
    const { data: homeRoster } = await supabase
      .from("team_memberships")
      .select(
        `
        player:profiles(id, name, jersey_number, position)
      `
      )
      .eq("team_id", game.home_team.id)
      .eq("status", "active");

    const { data: awayRoster } = await supabase
      .from("team_memberships")
      .select(
        `
        player:profiles(id, name, jersey_number, position)
      `
      )
      .eq("team_id", game.away_team.id)
      .eq("status", "active");

    // 6. Fetch player stats for this game
    const { data: gameStats } = await supabase
      .from("game_stats")
      .select(
        `
        player_id,
        stat_type,
        value,
        team_id,
        player:profiles(id, name, jersey_number)
      `
      )
      .eq("game_id", gameId);

    // 7. Aggregate player stats by team
    const homePlayerStats: Map<string, PlayerStats> = new Map();
    const awayPlayerStats: Map<string, PlayerStats> = new Map();

    (gameStats || []).forEach((stat: any) => {
      const isHomeTeam = stat.team_id === game.home_team.id;
      const statsMap = isHomeTeam ? homePlayerStats : awayPlayerStats;

      if (!statsMap.has(stat.player_id)) {
        statsMap.set(stat.player_id, {
          playerId: stat.player_id,
          playerName: stat.player.name,
          jerseyNumber: stat.player.jersey_number,
          goals: 0,
          assists: 0,
          points: 0,
          pim: 0,
          shots: 0,
          saves: 0,
          goalsAgainst: 0,
        });
      }

      const playerStat = statsMap.get(stat.player_id)!;

      switch (stat.stat_type) {
        case "Goal":
          playerStat.goals += stat.value;
          playerStat.points += stat.value;
          break;
        case "Assist":
          playerStat.assists += stat.value;
          playerStat.points += stat.value;
          break;
        case "PIM":
          playerStat.pim += stat.value;
          break;
        case "Shot":
          playerStat.shots += stat.value;
          break;
        case "Save":
          playerStat.saves = (playerStat.saves || 0) + stat.value;
          break;
      }
    });

    // 8. Fetch reschedule history (using database function)
    const { data: rescheduleHistory } = await (supabase as any).rpc(
      "get_game_reschedule_history",
      { game_id_param: gameId }
    );

    // 9. Fetch team records (optional, for MatchupHeader component)
    // This is a simplified version - you may want to add more sophisticated season stats
    const { data: homeTeamGames } = await supabase
      .from("games")
      .select("id, status, home_team_id, away_team_id, home_score, away_score")
      .eq("league_id", leagueId)
      .eq("season_id", game.season_id)
      .eq("status", "completed")
      .or(`home_team_id.eq.${game.home_team.id},away_team_id.eq.${game.home_team.id}`);

    const { data: awayTeamGames } = await supabase
      .from("games")
      .select("id, status, home_team_id, away_team_id, home_score, away_score")
      .eq("league_id", leagueId)
      .eq("season_id", game.season_id)
      .eq("status", "completed")
      .or(`home_team_id.eq.${game.away_team.id},away_team_id.eq.${game.away_team.id}`);

    // Calculate team records
    const homeTeamRecord = { wins: 0, losses: 0, ties: 0 };
    (homeTeamGames || []).forEach((g: any) => {
      if (g.home_team_id === game.home_team.id) {
        if (g.home_score > g.away_score) homeTeamRecord.wins++;
        else if (g.home_score < g.away_score) homeTeamRecord.losses++;
        else homeTeamRecord.ties++;
      } else {
        if (g.away_score > g.home_score) homeTeamRecord.wins++;
        else if (g.away_score < g.home_score) homeTeamRecord.losses++;
        else homeTeamRecord.ties++;
      }
    });

    const awayTeamRecord = { wins: 0, losses: 0, ties: 0 };
    (awayTeamGames || []).forEach((g: any) => {
      if (g.home_team_id === game.away_team.id) {
        if (g.home_score > g.away_score) awayTeamRecord.wins++;
        else if (g.home_score < g.away_score) awayTeamRecord.losses++;
        else awayTeamRecord.ties++;
      } else {
        if (g.away_score > g.home_score) awayTeamRecord.wins++;
        else if (g.away_score < g.home_score) awayTeamRecord.losses++;
        else awayTeamRecord.ties++;
      }
    });

    // Calculate season series (head-to-head)
    const seasonSeries = { homeWins: 0, awayWins: 0, ties: 0 };
    const headToHeadGames = [...(homeTeamGames || []), ...(awayTeamGames || [])].filter(
      (g: any) =>
        (g.home_team_id === game.home_team.id && g.away_team_id === game.away_team.id) ||
        (g.home_team_id === game.away_team.id && g.away_team_id === game.home_team.id)
    );

    headToHeadGames.forEach((g: any) => {
      if (g.home_team_id === game.home_team.id) {
        if (g.home_score > g.away_score) seasonSeries.homeWins++;
        else if (g.home_score < g.away_score) seasonSeries.awayWins++;
        else seasonSeries.ties++;
      } else {
        if (g.away_score > g.home_score) seasonSeries.homeWins++;
        else if (g.away_score < g.home_score) seasonSeries.awayWins++;
        else seasonSeries.ties++;
      }
    });

    // 10. Build response
    const response: GameDetailResponse = {
      id: game.id,
      scheduledAt: game.scheduled_at,
      status: game.status,
      homeTeam: {
        id: game.home_team.id,
        name: game.home_team.name,
        logoUrl: game.home_team.logo_url,
        score: game.home_score,
        roster: (homeRoster || []).map((r: any) => ({
          id: r.player.id,
          name: r.player.name,
          jerseyNumber: r.player.jersey_number,
          position: r.player.position,
        })),
      },
      awayTeam: {
        id: game.away_team.id,
        name: game.away_team.name,
        logoUrl: game.away_team.logo_url,
        score: game.away_score,
        roster: (awayRoster || []).map((r: any) => ({
          id: r.player.id,
          name: r.player.name,
          jerseyNumber: r.player.jersey_number,
          position: r.player.position,
        })),
      },
      venue: {
        id: game.venue.id,
        name: game.venue.name,
        address: game.venue.address,
        city: game.venue.city,
        stateProvince: game.venue.state_province,
        postalCode: game.venue.postal_code,
      },
      division: game.division
        ? {
            id: game.division.id,
            name: game.division.name,
          }
        : undefined,
      scorekeeper: game.scorekeeper
        ? {
            id: game.scorekeeper.id,
            name: game.scorekeeper.name,
          }
        : undefined,
      playerStats: {
        homeTeam: Array.from(homePlayerStats.values()).filter((s) => s.points > 0 || s.pim > 0 || s.saves || 0 > 0),
        awayTeam: Array.from(awayPlayerStats.values()).filter((s) => s.points > 0 || s.pim > 0 || s.saves || 0 > 0),
      },
      rescheduleHistory:
        rescheduleHistory && rescheduleHistory.length > 0
          ? rescheduleHistory.map((h: any) => ({
              gameId: h.game_id,
              scheduledAt: h.scheduled_at,
              status: h.status,
              rescheduleReason: h.reschedule_reason,
              rescheduledAt: h.rescheduled_at,
              rescheduledBy: h.rescheduled_by,
              isOriginal: h.is_original,
              isCurrent: h.is_current,
            }))
          : undefined,
      teamRecords: {
        homeTeamRecord,
        awayTeamRecord,
        seasonSeries,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
