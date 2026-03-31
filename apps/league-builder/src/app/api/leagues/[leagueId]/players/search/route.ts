import { verifyCaptainOrAdminAccess, verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { buildLeaguePlayerSearchResults } from '@/lib/roster/player-search';

type LookupRow = {
  id: string;
  name: string | null;
};

type RosterHistoryRow = {
  player_id: string;
  team_id: string | null;
  season_id: string | null;
  status: string | null;
  joined_at: string | null;
  start_date: string | null;
  end_date: string | null;
};

type RegistrationHistoryRow = {
  player_id: string;
  season_id: string | null;
  team_id: string | null;
  assigned_team_id: string | null;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const { leagueId } = await params;
  const searchQuery = request.nextUrl.searchParams.get('q')?.trim() || '';
  const teamId = request.nextUrl.searchParams.get('teamId')?.trim() || '';
  const seasonId = request.nextUrl.searchParams.get('seasonId')?.trim() || '';

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user can manage rosters in this league, either through league access
  // or through explicit access to the target team.
  const leagueAccess = await verifyLeagueOwnerAccess(leagueId);
  const teamAccess = teamId ? await verifyCaptainOrAdminAccess(teamId) : null;
  const hasTeamAccess = !!teamAccess?.authorized && teamAccess.team?.league_id === leagueId;

  if (!leagueAccess.authorized && !hasTeamAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: league, error: leagueError } = await serviceSupabase
    .from('leagues')
    .select('id')
    .eq('id', leagueId)
    .maybeSingle();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  if (searchQuery.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const { data: matchedProfiles, error: matchedProfilesError } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .ilike('full_name', `%${searchQuery}%`)
      .order('full_name')
      .limit(100);

    if (matchedProfilesError) {
      console.error('Player profile search failed:', sanitizeErrorForLogging(matchedProfilesError));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    if (!matchedProfiles || matchedProfiles.length === 0) {
      return NextResponse.json([]);
    }

    const searchableProfiles = matchedProfiles.filter(
      (
        profile
      ): profile is { id: string; full_name: string; avatar_url: string | null } =>
        typeof profile.id === 'string' &&
        profile.id.length > 0 &&
        typeof profile.full_name === 'string' &&
        profile.full_name.length > 0
    );

    if (searchableProfiles.length === 0) {
      return NextResponse.json([]);
    }

    const matchedPlayerIds = searchableProfiles
      .map((profile) => profile.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const [rosterHistoryResponse, registrationHistoryResponse] = await Promise.all([
      serviceSupabase
        .from('team_rosters')
        .select('player_id, team_id, season_id, status, joined_at, start_date, end_date')
        .eq('league_id', leagueId)
        .in('player_id', matchedPlayerIds),
      serviceSupabase
        .from('registration_submissions')
        .select('player_id, season_id, team_id, assigned_team_id, status, submitted_at, created_at')
        .eq('league_id', leagueId)
        .in('player_id', matchedPlayerIds),
    ]);

    if (rosterHistoryResponse.error) {
      console.error('Roster player search failed:', sanitizeErrorForLogging(rosterHistoryResponse.error));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    if (registrationHistoryResponse.error) {
      console.error(
        'Registration player search failed:',
        sanitizeErrorForLogging(registrationHistoryResponse.error)
      );
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const rosterHistory = (rosterHistoryResponse.data ?? []) as RosterHistoryRow[];
    const registrationHistory = (registrationHistoryResponse.data ?? []) as RegistrationHistoryRow[];

    const teamIds = Array.from(
      new Set(
        [
          ...rosterHistory.map((entry) => entry.team_id),
          ...registrationHistory.map((entry) => entry.team_id),
          ...registrationHistory.map((entry) => entry.assigned_team_id),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    const seasonIds = Array.from(
      new Set(
        [
          ...rosterHistory.map((entry) => entry.season_id),
          ...registrationHistory.map((entry) => entry.season_id),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    const emptyLookupResult = { data: [] as LookupRow[], error: null };
    const [teamsResponse, seasonsResponse] = await Promise.all([
      teamIds.length > 0
        ? serviceSupabase.from('teams').select('id, name').in('id', teamIds)
        : Promise.resolve(emptyLookupResult),
      seasonIds.length > 0
        ? serviceSupabase.from('seasons').select('id, name').in('id', seasonIds)
        : Promise.resolve(emptyLookupResult),
    ]);

    if (teamsResponse.error) {
      console.error('Player team lookup failed:', sanitizeErrorForLogging(teamsResponse.error));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    if (seasonsResponse.error) {
      console.error('Player season lookup failed:', sanitizeErrorForLogging(seasonsResponse.error));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const teamNameById = new Map(
      (teamsResponse.data ?? []).map((team) => [team.id, team.name ?? null])
    );
    const seasonNameById = new Map(
      (seasonsResponse.data ?? []).map((season) => [season.id, season.name ?? null])
    );

    const players = buildLeaguePlayerSearchResults({
      profiles: searchableProfiles,
      rosterHistory: rosterHistory.map((entry) => ({
        ...entry,
        team_name: entry.team_id ? teamNameById.get(entry.team_id) ?? null : null,
        season_name: entry.season_id ? seasonNameById.get(entry.season_id) ?? null : null,
      })),
      registrationHistory: registrationHistory.map((entry) => ({
        ...entry,
        team_name: entry.team_id ? teamNameById.get(entry.team_id) ?? null : null,
        assigned_team_name: entry.assigned_team_id
          ? teamNameById.get(entry.assigned_team_id) ?? null
          : null,
        season_name: entry.season_id ? seasonNameById.get(entry.season_id) ?? null : null,
      })),
      currentTeamId: teamId || undefined,
      currentSeasonId: seasonId || undefined,
      limit: 10,
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Unexpected search error:', sanitizeErrorForLogging(error));
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
