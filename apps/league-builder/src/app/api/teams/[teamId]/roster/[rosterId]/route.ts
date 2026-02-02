import { NextRequest, NextResponse } from 'next/server';
import {
  removePlayerFromRoster,
  updateJerseyNumber,
  updatePlayerStatus,
  assignCaptain,
} from '@/lib/actions/roster';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; rosterId: string }> }
) {
  const { rosterId, teamId } = await params;

  try {
    const body = await request.json();
    const { jerseyNumber, status, leadershipRole, playerId, seasonId } = body;

    // Handle jersey number update
    if (jerseyNumber !== undefined) {
      if (typeof jerseyNumber !== 'number' || jerseyNumber < 1 || jerseyNumber > 99) {
        return NextResponse.json(
          { error: 'Jersey number must be between 1 and 99' },
          { status: 400 }
        );
      }

      const result = await updateJerseyNumber({ rosterId, newJerseyNumber: jerseyNumber });

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    }

    // Handle status update
    if (status !== undefined) {
      if (!['active', 'inactive', 'injured', 'suspended', 'traded'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }

      const result = await updatePlayerStatus({ rosterId, status });

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    }

    // Handle leadership role update
    if (leadershipRole !== undefined) {
      if (!playerId || !seasonId) {
        return NextResponse.json(
          { error: 'playerId and seasonId required for leadership role update' },
          { status: 400 }
        );
      }

      if (leadershipRole !== null && !['captain', 'alternate'].includes(leadershipRole)) {
        return NextResponse.json(
          { error: 'Leadership role must be captain, alternate, or null' },
          { status: 400 }
        );
      }

      const result = await assignCaptain({
        teamId,
        playerId,
        seasonId,
        role: leadershipRole,
      });

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/teams/[teamId]/roster/[rosterId]:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; rosterId: string }> }
) {
  const { rosterId } = await params;

  const result = await removePlayerFromRoster(rosterId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
