import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToRoster, getTeamRoster } from '@/lib/actions/roster';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
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
