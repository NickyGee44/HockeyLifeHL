import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToRoster } from '@/lib/actions/roster';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireTeamApiAccess } from '@/lib/api/guards';

function normalizeRosterRows(rows: any[] | null | undefined) {
  return (rows || []).map((row: any) => ({
    ...row,
    player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
  }));
}

const POSITION_MAP = {
  forward: 'Forward',
  defense: 'Defense',
  goalie: 'Goalie',
} as const;

function normalizeRosterPosition(position: unknown) {
  if (typeof position !== 'string') return null;

  const normalizedPosition = position.trim().toLowerCase() as keyof typeof POSITION_MAP;
  return POSITION_MAP[normalizedPosition] ?? null;
}

function normalizeLeadershipRole(leadershipRole: unknown) {
  if (leadershipRole === undefined || leadershipRole === null || leadershipRole === '') {
    return null;
  }

  if (leadershipRole === 'captain') {
    return 'captain' as const;
  }

  if (leadershipRole === 'alternate' || leadershipRole === 'alternate_captain') {
    return 'alternate_captain' as const;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const access = await requireTeamApiAccess(teamId);
  if ('response' in access) {
    return access.response;
  }

  const supabase = access.supabase;

  const leagueId = access.access.team!.league_id;
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
    .eq('league_id', leagueId)
    .maybeSingle();

  const canSeeRatings =
    access.access.accessType === 'platform_admin' ||
    access.access.accessType === 'org_owner' ||
    access.access.accessType === 'league_admin' ||
    (access.access.accessType === 'captain' && season?.registration_type === 'draft');

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
    .eq('league_id', leagueId)
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
    const parsedJerseyNumber = typeof jerseyNumber === 'string' ? parseInt(jerseyNumber, 10) : jerseyNumber;
    const normalizedPosition = normalizeRosterPosition(position);
    const normalizedLeadershipRole = normalizeLeadershipRole(leadershipRole);

    // Validate required fields
    if (!playerId || !seasonId || !jerseyNumber || !position) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId, seasonId, jerseyNumber, position' },
        { status: 400 }
      );
    }

    // Validate jersey number
    if (typeof parsedJerseyNumber !== 'number' || Number.isNaN(parsedJerseyNumber) || parsedJerseyNumber < 1 || parsedJerseyNumber > 99) {
      return NextResponse.json(
        { error: 'Jersey number must be between 1 and 99' },
        { status: 400 }
      );
    }

    // Validate position
    if (!normalizedPosition) {
      return NextResponse.json(
        { error: 'Position must be Forward, Defense, or Goalie' },
        { status: 400 }
      );
    }

    // Validate leadership role if provided
    if (leadershipRole !== undefined && leadershipRole !== null && leadershipRole !== '' && !normalizedLeadershipRole) {
      return NextResponse.json(
        { error: 'Leadership role must be captain or alternate captain' },
        { status: 400 }
      );
    }

    const result = await addPlayerToRoster({
      teamId,
      playerId,
      seasonId,
      jerseyNumber: parsedJerseyNumber,
      position: normalizedPosition,
      leadershipRole: normalizedLeadershipRole,
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
