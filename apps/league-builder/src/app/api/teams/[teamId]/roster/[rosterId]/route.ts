import { NextRequest, NextResponse } from 'next/server';
import {
  removePlayerFromRoster,
  updateJerseyNumber,
  updatePlayerStatus,
  assignCaptain,
} from '@/lib/actions/roster';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; rosterId: string }> }
) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { rosterId, teamId } = await params;

  try {
    const body = await request.json();

    // Accept both camelCase and snake_case field names
    const jerseyNumber = body.jerseyNumber ?? body.jersey_number;
    const position = body.position;
    const status = body.status;
    const leadershipRole = body.leadershipRole ?? body.leadership_role;
    const playerId = body.playerId ?? body.player_id;
    const seasonId = body.seasonId ?? body.season_id;

    // Build a single update object for direct field updates
    const updateFields: Record<string, unknown> = {};

    // Validate and collect jersey number
    if (jerseyNumber !== undefined) {
      const num = typeof jerseyNumber === 'string' ? parseInt(jerseyNumber) : jerseyNumber;
      if (typeof num !== 'number' || isNaN(num) || num < 1 || num > 99) {
        return NextResponse.json(
          { error: 'Jersey number must be between 1 and 99' },
          { status: 400 }
        );
      }
      updateFields.jersey_number = num;
    }

    // Validate and collect position
    if (position !== undefined) {
      const validPositions = ['Forward', 'Defense', 'Goalie', 'forward', 'defense', 'goalie'];
      if (!validPositions.includes(position)) {
        return NextResponse.json(
          { error: 'Position must be Forward, Defense, or Goalie' },
          { status: 400 }
        );
      }
      // Capitalize first letter for consistency
      updateFields.position = position.charAt(0).toUpperCase() + position.slice(1).toLowerCase();
    }

    // Validate and collect status
    if (status !== undefined) {
      if (!['active', 'inactive', 'injured', 'suspended', 'traded'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updateFields.status = status;
    }

    // Validate and collect leadership role
    if (leadershipRole !== undefined) {
      if (leadershipRole !== null && leadershipRole !== '' && !['captain', 'alternate_captain', 'alternate'].includes(leadershipRole)) {
        return NextResponse.json(
          { error: 'Leadership role must be captain, alternate_captain, or null' },
          { status: 400 }
        );
      }
      updateFields.leadership_role = leadershipRole || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    // Perform a single update on the roster entry
    const { data: updated, error: updateError } = await supabase
      .from('team_rosters')
      .update(updateFields)
      .eq('id', rosterId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating roster entry:', updateError);
      return NextResponse.json(
        { error: 'Failed to update roster entry' },
        { status: 400 }
      );
    }

    return NextResponse.json(updated);
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
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
