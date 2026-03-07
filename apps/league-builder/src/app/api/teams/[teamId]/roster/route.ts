import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToRoster } from '@/lib/actions/roster';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

function normalizeRosterRows(rows: any[] | null | undefined) {
  return (rows || []).map((row: any) => ({
    ...row,
    player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this team's league
  const { data: team } = await supabase
    .from('teams')
    .select('league_id')
    .eq('id', teamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Platform admins bypass all membership checks
  // Use service role to read is_platform_admin — RLS on profiles may hide this column
  // from the user-scoped client depending on policy configuration.
  const serviceRole = createServiceRoleClient();
  const { data: profile } = await serviceRole
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  const isPlatformAdmin = !!(profile as any)?.is_platform_admin;

  let membership: { role: string } | null = null;

  if (!isPlatformAdmin) {
    const { data: mem } = await supabase
      .from('league_memberships')
      .select('role')
      .eq('league_id', team.league_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mem) {
      // Fallback: check org ownership (separate queries, no nested embed)
      const { data: league } = await supabase
        .from('leagues')
        .select('organization_id')
        .eq('id', team.league_id)
        .single();

      let isOrgOwner = false;
      if (league?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_user_id')
          .eq('id', league.organization_id)
          .single();
        isOrgOwner = org?.owner_user_id === user.id;
      }

      if (!isOrgOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      membership = mem;
    }
  }

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');

  // Use service role — auth already verified above; RLS would block platform admin reads
  const serviceRoleForRoster = createServiceRoleClient();
  let rosterQuery = serviceRoleForRoster
    .from('team_rosters')
    .select(`
      id,
      player_id,
      jersey_number,
      position,
      status,
      leadership_role,
      start_date,
      player:profiles!team_rosters_player_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .is('end_date', null)
    .order('jersey_number');

  if (seasonId) {
    rosterQuery = rosterQuery.eq('season_id', seasonId);
  }

  const { data: rosterRows, error: rosterError } = await rosterQuery;

  if (rosterError) {
    console.error('Error fetching active roster:', rosterError.message);
    return NextResponse.json(
      { error: 'Failed to fetch roster' },
      { status: 500 }
    );
  }

  const roster = normalizeRosterRows(rosterRows);

  if (!seasonId || roster.length === 0) {
    return NextResponse.json(roster);
  }

  const { data: season } = await supabase
    .from('seasons')
    .select('registration_type')
    .eq('id', seasonId)
    .eq('league_id', team.league_id)
    .maybeSingle();

  const canSeeRatings =
    isPlatformAdmin ||
    membership?.role === 'owner' ||
    membership?.role === 'admin' ||
    (membership?.role === 'captain' && season?.registration_type === 'draft');

  if (!canSeeRatings) {
    return NextResponse.json(roster);
  }

  const playerIds = roster
    .map((row: any) => row.player_id)
    .filter((id: unknown): id is string => typeof id === 'string');

  if (playerIds.length === 0) {
    return NextResponse.json(roster);
  }

  const { data: ratings } = await serviceRoleForRoster
    .from('player_ratings' as any)
    .select('player_id, rating, overall_percentile' as any)
    .eq('league_id', team.league_id)
    .eq('season_id', seasonId)
    .in('player_id', playerIds);

  const ratingByPlayerId = new Map(
    (ratings ?? []).map((row: any) => [row.player_id, { rating: row.rating, overall: row.overall_percentile }])
  );

  const withRatings = roster.map((row: any) => {
    const rating = ratingByPlayerId.get(row.player_id);
    return {
      ...row,
      rating_grade: rating?.rating ?? null,
      rating_percentile: rating?.overall ?? null,
    };
  });

  return NextResponse.json(withRatings);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playerId, seasonId, jerseyNumber, position, leadershipRole } = body;

    // Validate required fields
    if (!playerId || !seasonId || !jerseyNumber || !position) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, seasonId, jerseyNumber, position' },
        { status: 400 }
      );
    }

    // Validate jersey number
    if (typeof jerseyNumber !== 'number' || jerseyNumber < 1 || jerseyNumber > 99) {
      return NextResponse.json(
        { error: 'Jersey number must be between 1 and 99' },
        { status: 400 }
      );
    }

    // Validate position
    if (!['forward', 'defense', 'goalie'].includes(position)) {
      return NextResponse.json(
        { error: 'Position must be forward, defense, or goalie' },
        { status: 400 }
      );
    }

    // Validate leadership role if provided
    if (leadershipRole && !['captain', 'alternate'].includes(leadershipRole)) {
      return NextResponse.json(
        { error: 'Leadership role must be captain or alternate' },
        { status: 400 }
      );
    }

    const result = await addPlayerToRoster({
      teamId,
      playerId,
      seasonId,
      jerseyNumber,
      position,
      leadershipRole: leadershipRole || null,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Roster POST error:', sanitizeErrorForLogging(error));
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
