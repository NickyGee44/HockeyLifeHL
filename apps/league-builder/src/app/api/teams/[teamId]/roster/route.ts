import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToRoster, getTeamRoster } from '@/lib/actions/roster';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';
import { createClient } from '@/lib/supabase/server';

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

  // Verify user has access to this team's league via league_memberships or org ownership
  const { data: team } = await supabase
    .from('teams')
    .select('league_id')
    .eq('id', teamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', team.league_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    // Fallback: check org ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', team.league_id)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    );
  }

  const result = await getTeamRoster(teamId, seasonId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

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
