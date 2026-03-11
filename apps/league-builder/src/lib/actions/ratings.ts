// @ts-nocheck — new tables pending migration; regenerate types after running migrations
'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  calculatePlayerRatings,
  calculateTeamRatings,
  calculateDivisionBalance,
} from '@/lib/ratings';
import type {
  DivisionBalanceResult,
  RatingCalculationSummary,
  TeamRatingRecord,
} from '@/lib/ratings';

interface RatingFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  divisionId?: string;
  teamId?: string;
  position?: 'skater' | 'goalie';
  gradeMin?: number;
  gradeMax?: number;
}

interface LeagueAccessContext {
  leagueRole: 'owner' | 'admin' | 'captain' | 'player' | 'none';
  seasonRegistrationType: string | null;
  captainTeamIds: string[];
}

function normalizeRole(role: string | null | undefined): LeagueAccessContext['leagueRole'] {
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  if (role === 'captain') return 'captain';
  if (role === 'player') return 'player';
  return 'none';
}

function inRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

async function getLeagueAccessContext(
  leagueId: string,
  seasonId?: string
): Promise<{ success: true; data: LeagueAccessContext } | { success: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const [membershipRes, captainTeamsRes, seasonRes] = await Promise.all([
    supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('captain_id', user.id),
    seasonId
      ? supabase
          .from('seasons')
          .select('registration_type')
          .eq('id', seasonId)
          .eq('league_id', leagueId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (membershipRes.error) {
    return { success: false, error: 'Unable to verify league access' };
  }

  const leagueRole = normalizeRole(membershipRes.data?.role);
  if (leagueRole === 'none') {
    return { success: false, error: 'No league access' };
  }

  return {
    success: true,
    data: {
      leagueRole,
      seasonRegistrationType: seasonRes.data?.registration_type ?? null,
      captainTeamIds: (captainTeamsRes.data ?? []).map((row) => row.id),
    },
  };
}

export async function calculateLeagueRatings(
  leagueId: string,
  seasonId: string
): Promise<{ success: boolean; summary?: RatingCalculationSummary; error?: string }> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  try {
    const supabase = createServiceRoleClient();

    const { summary } = await calculatePlayerRatings(supabase, leagueId, seasonId);
    const teamResult = await calculateTeamRatings(supabase, leagueId, seasonId);
    const divisionBalance = await calculateDivisionBalance(supabase, leagueId, seasonId);

    await supabase
      .from('division_balance_snapshots' as any)
      .insert({
        league_id: leagueId,
        season_id: seasonId,
        snapshot_data: divisionBalance,
        recommendations: divisionBalance.recommendations,
        balance_score: divisionBalance.balanceScore,
      } as any);

    const mergedSummary: RatingCalculationSummary = {
      ...summary,
      teamsRated: teamResult.records.length,
    };

    revalidatePath(`/dashboard/leagues/${leagueId}/ratings`);
    revalidatePath(`/dashboard/leagues/${leagueId}/teams`);

    return {
      success: true,
      summary: mergedSummary,
    };
  } catch (error) {
    console.error('calculateLeagueRatings error:', error);
    return { success: false, error: 'Failed to calculate ratings' };
  }
}

export async function getPlayerRatings(
  leagueId: string,
  seasonId: string,
  filters: RatingFilters = {}
): Promise<{
  success: boolean;
  data?: {
    rows: Array<{
      playerId: string;
      name: string;
      teamId: string | null;
      teamName: string;
      divisionId: string | null;
      divisionName: string;
      position: 'skater' | 'goalie';
      grade: string;
      overallPercentile: number;
      rawPercentile: number;
      gamesPlayed: number;
      points: number;
      plusMinus: number;
      trend: 'up' | 'down' | 'flat';
      // Goalie-specific stats (null for skaters)
      savePct: number | null;
      gaa: number | null;
      wins: number | null;
      shutouts: number | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}> {
  const access = await getLeagueAccessContext(leagueId, seasonId);
  if (!access.success) {
    return { success: false, error: access.error };
  }

  if (!['owner', 'admin'].includes(access.data.leagueRole)) {
    return { success: false, error: 'Only league owners/admins can view player directory ratings' };
  }

  const supabase = createServiceRoleClient();

  const [ratingsRes, profilesRes, rostersRes, teamsRes, divisionsRes, statsRes] = await Promise.all([
    supabase
      .from('player_ratings' as any)
      .select('player_id, rating, overall_percentile, raw_percentile, games_played, position, stats_json')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('profiles')
      .select('id, full_name'),
    supabase
      .from('team_rosters')
      .select('player_id, team_id, division_id, end_date, start_date')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
    supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId),
    supabase
      .from('divisions')
      .select('id, name')
      .eq('league_id', leagueId),
    supabase
      .from('player_stats')
      .select('player_id, goals, assists, plus_minus')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId),
  ]);

  if (ratingsRes.error) return { success: false, error: 'Failed to load player ratings' };
  if (profilesRes.error) return { success: false, error: 'Failed to load player profiles' };
  if (rostersRes.error) return { success: false, error: 'Failed to load roster data' };
  if (teamsRes.error) return { success: false, error: 'Failed to load teams' };
  if (divisionsRes.error) return { success: false, error: 'Failed to load divisions' };
  if (statsRes.error) return { success: false, error: 'Failed to load player stats' };

  const profileNameById = new Map((profilesRes.data ?? []).map((row) => [row.id, row.full_name || 'Unknown Player']));
  const teamNameById = new Map((teamsRes.data ?? []).map((row) => [row.id, row.name]));
  const divisionNameById = new Map((divisionsRes.data ?? []).map((row) => [row.id, row.name]));

  const latestRosterByPlayer = new Map<string, { teamId: string | null; divisionId: string | null; startDate: string }>();
  for (const row of rostersRes.data ?? []) {
    const existing = latestRosterByPlayer.get(row.player_id);
    const candidate = { teamId: row.team_id, divisionId: row.division_id, startDate: row.start_date };
    if (!existing || candidate.startDate > existing.startDate || row.end_date === null) {
      latestRosterByPlayer.set(row.player_id, candidate);
    }
  }

  const statByPlayer = new Map<string, { points: number; plusMinus: number }>();
  for (const row of statsRes.data ?? []) {
    const stat = statByPlayer.get(row.player_id) ?? { points: 0, plusMinus: 0 };
    stat.points += Number(row.goals ?? 0) + Number(row.assists ?? 0);
    stat.plusMinus += Number(row.plus_minus ?? 0);
    statByPlayer.set(row.player_id, stat);
  }

  const rows = (ratingsRes.data ?? []).map((row: any) => {
    const roster = latestRosterByPlayer.get(row.player_id);
    const stats = statByPlayer.get(row.player_id) ?? { points: 0, plusMinus: 0 };
    const isGoalie = row.position === 'goalie';
    const statsJson = (row.stats_json as Record<string, unknown>) ?? null;

    return {
      playerId: row.player_id,
      name: profileNameById.get(row.player_id) || 'Unknown Player',
      teamId: roster?.teamId ?? null,
      teamName: roster?.teamId ? (teamNameById.get(roster.teamId) || 'Unassigned') : 'Unassigned',
      divisionId: roster?.divisionId ?? null,
      divisionName: roster?.divisionId ? (divisionNameById.get(roster.divisionId) || 'Unassigned') : 'Unassigned',
      position: (row.position as 'skater' | 'goalie') ?? 'skater',
      grade: row.rating,
      overallPercentile: Number(row.overall_percentile ?? 0),
      rawPercentile: Number(row.raw_percentile ?? 0),
      gamesPlayed: Number(row.games_played ?? 0),
      points: stats.points,
      plusMinus: stats.plusMinus,
      trend: 'flat' as const,
      savePct: isGoalie && typeof statsJson?.savePct === 'number' ? statsJson.savePct : null,
      gaa: isGoalie && typeof statsJson?.gaa === 'number' ? statsJson.gaa : null,
      wins: isGoalie && typeof statsJson?.wins === 'number' ? statsJson.wins : null,
      shutouts: isGoalie && typeof statsJson?.shutouts === 'number' ? statsJson.shutouts : null,
    };
  });

  const filtered = rows.filter((row) => {
    if (filters.search) {
      const query = filters.search.trim().toLowerCase();
      if (!row.name.toLowerCase().includes(query)) return false;
    }
    if (filters.divisionId && row.divisionId !== filters.divisionId) return false;
    if (filters.teamId && row.teamId !== filters.teamId) return false;
    if (filters.position && row.position !== filters.position) return false;
    if (!inRange(row.overallPercentile, filters.gradeMin, filters.gradeMax)) return false;
    return true;
  });

  filtered.sort((a, b) => b.overallPercentile - a.overallPercentile);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  return {
    success: true,
    data: {
      rows: filtered.slice(offset, offset + pageSize),
      total: filtered.length,
      page,
      pageSize,
    },
  };
}

export async function getTeamRatings(
  leagueId: string,
  seasonId: string
): Promise<{ success: boolean; data?: TeamRatingRecord[]; error?: string }> {
  const access = await getLeagueAccessContext(leagueId, seasonId);
  if (!access.success) {
    return { success: false, error: access.error };
  }

  const role = access.data.leagueRole;
  const isDraftLeague = access.data.seasonRegistrationType === 'draft';

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('team_ratings' as any)
    .select('*')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .order('overall_percentile', { ascending: false });

  if (error) {
    return { success: false, error: 'Failed to fetch team ratings' };
  }

  const rows = (data ?? []) as TeamRatingRecord[];

  if (role === 'owner' || role === 'admin') {
    return { success: true, data: rows };
  }

  if (role === 'captain') {
    if (isDraftLeague) {
      return { success: true, data: rows };
    }

    const allowed = new Set(access.data.captainTeamIds);
    return {
      success: true,
      data: rows.filter((row) => allowed.has(row.team_id)),
    };
  }

  return { success: false, error: 'Ratings are not visible to players' };
}

export async function getDivisionBalance(
  leagueId: string,
  seasonId: string
): Promise<{ success: boolean; data?: DivisionBalanceResult; error?: string }> {
  const access = await getLeagueAccessContext(leagueId, seasonId);
  if (!access.success) {
    return { success: false, error: access.error };
  }

  if (access.data.leagueRole !== 'owner') {
    return { success: false, error: 'Only league owners can view division balance analysis' };
  }

  const supabase = createServiceRoleClient();

  const { data: latestSnapshot } = await supabase
    .from('division_balance_snapshots' as any)
    .select('snapshot_data')
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSnapshot?.snapshot_data) {
    return { success: true, data: latestSnapshot.snapshot_data as DivisionBalanceResult };
  }

  const generated = await calculateDivisionBalance(supabase, leagueId, seasonId);
  return { success: true, data: generated };
}

export async function getPlayerDetail(
  playerId: string,
  leagueId: string
): Promise<{
  success: boolean;
  data?: {
    playerId: string;
    name: string;
    ratingsHistory: Array<{
      seasonId: string;
      seasonName: string;
      grade: string;
      overallPercentile: number;
      gamesPlayed: number;
      position: string | null;
      calculatedAt: string | null;
      confidenceScore?: number | null;
    }>;
    teamHistory: Array<{
      seasonId: string;
      teamName: string;
      divisionName: string;
      isGoalie: boolean;
    }>;
    latestBreakdown?: Array<{
      key: string;
      label: string;
      normalizedScore: number;
      appliedWeight: number;
    }>;
  };
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from('league_memberships')
      .select('role, status')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', playerId)
      .maybeSingle(),
  ]);

  const role = normalizeRole(membership?.role);
  if (role === 'none' || role === 'player') {
    return { success: false, error: 'Not authorized to view player rating details' };
  }

  if (role === 'captain') {
    const [{ data: captainTeams }, { data: rosterInDraftSeason }] = await Promise.all([
      supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
        .eq('captain_id', user.id),
      supabase
        .from('team_rosters')
        .select('team_id, season_id, seasons!inner(registration_type)')
        .eq('league_id', leagueId)
        .eq('player_id', playerId),
    ]);

    const captainTeamIds = new Set((captainTeams ?? []).map((team) => team.id));
    const hasDraftAccess = (rosterInDraftSeason ?? []).some((row: any) => {
      const registrationType = (row.seasons as { registration_type?: string } | null)?.registration_type;
      return registrationType === 'draft' && captainTeamIds.has(row.team_id);
    });

    if (!hasDraftAccess) {
      return { success: false, error: 'Captains can only view player ratings for draft-league roster players' };
    }
  }

  const service = createServiceRoleClient();

  const [ratingsRes, rostersRes, seasonsRes, teamsRes, divisionsRes] = await Promise.all([
    service
      .from('player_ratings' as any)
      .select('season_id, rating, overall_percentile, games_played, position, calculated_at, stats_json')
      .eq('league_id', leagueId)
      .eq('player_id', playerId)
      .order('calculated_at', { ascending: false }),
    service
      .from('team_rosters')
      .select('season_id, team_id, division_id, is_goalie')
      .eq('league_id', leagueId)
      .eq('player_id', playerId),
    service
      .from('seasons')
      .select('id, name')
      .eq('league_id', leagueId),
    service
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId),
    service
      .from('divisions')
      .select('id, name')
      .eq('league_id', leagueId),
  ]);

  if (ratingsRes.error) return { success: false, error: 'Failed to load player rating history' };
  if (rostersRes.error) return { success: false, error: 'Failed to load team history' };

  const seasonNameById = new Map((seasonsRes.data ?? []).map((season) => [season.id, season.name]));
  const teamNameById = new Map((teamsRes.data ?? []).map((team) => [team.id, team.name]));
  const divisionNameById = new Map((divisionsRes.data ?? []).map((division) => [division.id, division.name]));

  return {
    success: true,
    data: {
      playerId,
      name: profile?.full_name || 'Unknown Player',
      ratingsHistory: (ratingsRes.data ?? []).map((row: any) => ({
        seasonId: row.season_id,
        seasonName: seasonNameById.get(row.season_id) || row.season_id,
        grade: row.rating,
        overallPercentile: Number(row.overall_percentile ?? 0),
        gamesPlayed: Number(row.games_played ?? 0),
        position: row.position,
        calculatedAt: row.calculated_at,
        confidenceScore: typeof row.stats_json?.ratingConfidence === 'number' ? row.stats_json.ratingConfidence : null,
      })),
      teamHistory: (rostersRes.data ?? []).map((row: any) => ({
        seasonId: row.season_id,
        teamName: teamNameById.get(row.team_id) || 'Unknown Team',
        divisionName: row.division_id ? (divisionNameById.get(row.division_id) || 'Unassigned') : 'Unassigned',
        isGoalie: Boolean(row.is_goalie),
      })),
      latestBreakdown: Array.isArray((ratingsRes.data ?? [])[0]?.stats_json?.breakdown)
        ? (ratingsRes.data ?? [])[0].stats_json.breakdown
            .filter((entry: any) => entry && entry.label)
            .map((entry: any) => ({
              key: entry.key,
              label: entry.label,
              normalizedScore: Number(entry.normalizedScore ?? 0),
              appliedWeight: Number(entry.appliedWeight ?? 0),
            }))
        : [],
    },
  };
}
