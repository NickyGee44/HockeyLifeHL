'use server';

import { createClient } from '@/lib/supabase/server';

interface RosterExportRow {
  jerseyNumber: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  leadershipRole: string | null;
  status: string;
  teamName: string;
}

/**
 * Export roster contacts for a single team.
 * Returns structured data that the client converts to CSV.
 */
export async function exportTeamRoster(
  teamId: string,
  seasonId?: string
): Promise<{ rows: RosterExportRow[]; teamName: string }> {
  const supabase = await createClient();

  // Verify user has access (must be authenticated)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get team name
  const { data: team } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single();

  if (!team) throw new Error('Team not found');

  // Fetch roster with profile contact info
  let query = supabase
    .from('team_rosters')
    .select('jersey_number, position, status, leadership_role, player_id, profile:profiles(full_name, email, phone)')
    .eq('team_id', teamId);

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data: roster, error } = await query;
  if (error || !roster) return { rows: [], teamName: team.name };

  const rows: RosterExportRow[] = roster.map((row: any) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      jerseyNumber: row.jersey_number,
      fullName: profile?.full_name || 'Unknown',
      email: profile?.email || '',
      phone: profile?.phone || null,
      position: row.position || 'Unknown',
      leadershipRole: row.leadership_role,
      status: row.status || 'active',
      teamName: team.name,
    };
  });

  // Sort by jersey number
  rows.sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));

  return { rows, teamName: team.name };
}

/**
 * Export roster contacts for all teams in a league.
 */
export async function exportLeagueRosters(
  leagueId: string,
  seasonId?: string
): Promise<{ rows: RosterExportRow[]; leagueName: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get league name
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .single();

  if (!league) throw new Error('League not found');

  // Get all teams in the league
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  if (!teams || teams.length === 0) return { rows: [], leagueName: league.name };

  // Fetch all rosters with contacts
  let query = supabase
    .from('team_rosters')
    .select('team_id, jersey_number, position, status, leadership_role, player_id, profile:profiles(full_name, email, phone)')
    .in(
      'team_id',
      teams.map((t) => t.id)
    );

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data: allRosters, error } = await query;
  if (error || !allRosters) return { rows: [], leagueName: league.name };

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const rows: RosterExportRow[] = allRosters.map((row: any) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      jerseyNumber: row.jersey_number,
      fullName: profile?.full_name || 'Unknown',
      email: profile?.email || '',
      phone: profile?.phone || null,
      position: row.position || 'Unknown',
      leadershipRole: row.leadership_role,
      status: row.status || 'active',
      teamName: teamMap.get(row.team_id) || 'Unknown',
    };
  });

  // Sort by team name, then jersey number
  rows.sort((a, b) => {
    const teamCmp = a.teamName.localeCompare(b.teamName);
    if (teamCmp !== 0) return teamCmp;
    return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999);
  });

  return { rows, leagueName: league.name };
}
