import type { SupabaseClientArg, Team, TeamStanding, Player } from '../types';

function transformTeamData(team: any): any {
  if (!team) return null;
  const rawTeam = Array.isArray(team) ? team[0] : team;
  if (!rawTeam) return null;
  const colors = [rawTeam.primary_color, rawTeam.secondary_color].filter(Boolean).join(',') || null;
  return {
    id: rawTeam.id,
    name: rawTeam.name,
    slug: rawTeam.slug,
    logo: rawTeam.logo_url || null,
    colors,
    division_id: rawTeam.division_id,
    division: rawTeam.division || (Array.isArray(rawTeam.divisions) ? rawTeam.divisions[0] : rawTeam.divisions) || null,
  };
}

export async function getTeams(supabase: SupabaseClientArg, leagueId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, division:divisions(*)')
    .eq('league_id', leagueId)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as Team[];
}

export async function getTeamById(supabase: SupabaseClientArg, teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, division:divisions(*)')
    .eq('id', teamId)
    .single();

  if (error || !data) return null;
  return data as Team;
}

export async function getTeamBySlug(
  supabase: SupabaseClientArg,
  leagueId: string,
  teamSlug: string,
): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, division:divisions(*)')
    .eq('league_id', leagueId)
    .eq('slug', teamSlug)
    .single();

  if (error || !data) return null;
  return data as Team;
}

function normalizeRosterPosition(
  position: string | null | undefined,
  isGoalieHint: boolean,
): Player['position'] {
  if (isGoalieHint) return 'Goalie';
  const value = (position || '').trim().toUpperCase();
  if (value === 'C' || value === 'LW' || value === 'RW' || value === 'D' || value === 'G') {
    return value as Player['position'];
  }
  if (value === 'FORWARD' || value === 'DEFENSE' || value === 'GOALIE') {
    return (value.charAt(0) + value.slice(1).toLowerCase()) as Player['position'];
  }
  return null;
}

export async function getTeamRoster(
  supabase: SupabaseClientArg,
  teamId: string,
  seasonId?: string,
): Promise<Player[]> {
  let rosterQuery = supabase
    .from('team_rosters')
    .select('*, profile:profiles(id, full_name, avatar_url, position)')
    .eq('team_id', teamId);

  let goalieStatsQuery = supabase
    .from('goalie_stats')
    .select('player_id')
    .eq('team_id', teamId);

  if (seasonId) {
    rosterQuery = rosterQuery.eq('season_id', seasonId);
    goalieStatsQuery = goalieStatsQuery.eq('season_id', seasonId);
  }

  const [{ data: rosterRows, error }, { data: goalieRows }] = await Promise.all([
    rosterQuery,
    goalieStatsQuery,
  ]);

  if (error || !rosterRows) return [];

  const goalieIds = new Set((goalieRows || []).map((r: any) => r.player_id));

  return rosterRows.map((row: any) => {
    const profileRow = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const isGoalie = Boolean(row.is_goalie || goalieIds.has(row.player_id));
    const position = normalizeRosterPosition(row.position ?? profileRow?.position, isGoalie);

    return {
      ...row,
      position,
      is_goalie: isGoalie,
      profile: profileRow
        ? { id: profileRow.id, full_name: profileRow.full_name, avatar_url: profileRow.avatar_url }
        : undefined,
    } as Player;
  }).sort((a: Player, b: Player) => {
    const aNum = a.jersey_number ?? Number.MAX_SAFE_INTEGER;
    const bNum = b.jersey_number ?? Number.MAX_SAFE_INTEGER;
    if (aNum !== bNum) return aNum - bNum;
    return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
  });
}

export async function getStandings(
  supabase: SupabaseClientArg,
  leagueId: string,
  seasonId?: string,
  divisionId?: string,
): Promise<TeamStanding[]> {
  let query = supabase
    .from('standings')
    .select('*')
    .eq('league_id', leagueId);

  if (seasonId) query = query.eq('season_id', seasonId);
  if (divisionId) query = query.eq('division_id', divisionId);

  query = query.order('points', { ascending: false });

  const { data, error } = await query;
  if (error || !data) return [];
  return data as TeamStanding[];
}

/**
 * Get teams a specific player belongs to
 */
export async function getPlayerTeams(
  supabase: SupabaseClientArg,
  userId: string,
): Promise<(Team & { league_id: string })[]> {
  const { data: rosters } = await supabase
    .from('team_rosters')
    .select('team_id, teams(*, division:divisions(*))')
    .eq('player_id', userId);

  if (!rosters) return [];

  return rosters
    .map((r: any) => {
      const team = Array.isArray(r.teams) ? r.teams[0] : r.teams;
      return team;
    })
    .filter(Boolean) as (Team & { league_id: string })[];
}
