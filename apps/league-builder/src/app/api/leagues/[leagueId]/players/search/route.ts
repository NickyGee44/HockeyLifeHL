import { verifyCaptainOrAdminAccess, verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const { leagueId } = await params;
  const searchQuery = request.nextUrl.searchParams.get('q')?.trim() || '';
  const teamId = request.nextUrl.searchParams.get('teamId')?.trim() || '';

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
    .select('id, organization_id')
    .eq('id', leagueId)
    .maybeSingle();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  if (searchQuery.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const candidateIds = new Set<string>();

    if (league.organization_id) {
      const { data: orgMembers, error: orgMembersError } = await serviceSupabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', league.organization_id)
        .eq('status', 'active');

      if (orgMembersError) {
        console.error('Organization member search failed:', sanitizeErrorForLogging(orgMembersError));
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
      }

      for (const member of orgMembers ?? []) {
        if (member.user_id) candidateIds.add(member.user_id);
      }
    }

    const { data: leagueMembers, error: leagueMembersError } = await serviceSupabase
      .from('league_memberships')
      .select('user_id')
      .eq('league_id', leagueId)
      .eq('status', 'active');

    if (leagueMembersError) {
      console.error('League member search failed:', sanitizeErrorForLogging(leagueMembersError));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    for (const member of leagueMembers ?? []) {
      if (member.user_id) candidateIds.add(member.user_id);
    }

    const { data: rosteredPlayers, error: rosteredPlayersError } = await serviceSupabase
      .from('team_rosters')
      .select('player_id')
      .eq('league_id', leagueId)
      .not('player_id', 'is', null);

    if (rosteredPlayersError) {
      console.error('Roster player search failed:', sanitizeErrorForLogging(rosteredPlayersError));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    for (const rosterEntry of rosteredPlayers ?? []) {
      if (rosterEntry.player_id) candidateIds.add(rosterEntry.player_id);
    }

    const { data: registrations, error: registrationsError } = await (serviceSupabase.from as any)('registration_submissions')
      .select('player_id')
      .eq('league_id', leagueId)
      .not('player_id', 'is', null);

    if (registrationsError) {
      console.error('Registration player search failed:', sanitizeErrorForLogging(registrationsError));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    for (const registration of registrations ?? []) {
      if (registration.player_id) candidateIds.add(registration.player_id);
    }

    if (candidateIds.size === 0) {
      return NextResponse.json([]);
    }

    // Search by name only and only return non-sensitive profile fields.
    const { data: players, error } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(candidateIds))
      .ilike('full_name', `%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Player search failed:', sanitizeErrorForLogging(error));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Unexpected search error:', sanitizeErrorForLogging(error));
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
