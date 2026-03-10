import { NextRequest, NextResponse } from 'next/server';
import {
  removePlayerFromRoster,
} from '@/lib/actions/roster';
import { verifyCaptainOrAdminAccess } from '@/lib/actions/permissions';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

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
    const access = await verifyCaptainOrAdminAccess(teamId);
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error || 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const serviceClient = createServiceRoleClient();
    const { data: currentRoster, error: currentRosterError } = await serviceClient
      .from('team_rosters')
      .select('id, team_id, league_id, player_id, season_id, leadership_role')
      .eq('id', rosterId)
      .single();

    if (currentRosterError || !currentRoster || currentRoster.team_id !== teamId) {
      return NextResponse.json(
        { error: 'Roster entry not found' },
        { status: 404 }
      );
    }

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
      updateFields.leadership_role =
        leadershipRole === 'alternate' ? 'alternate_captain' : leadershipRole || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    if (Object.prototype.hasOwnProperty.call(updateFields, 'leadership_role') && updateFields.leadership_role === 'captain') {
      const { error: clearCaptainError } = await serviceClient
        .from('team_rosters')
        .update({ leadership_role: null })
        .eq('team_id', teamId)
        .eq('season_id', currentRoster.season_id)
        .eq('leadership_role', 'captain')
        .is('end_date', null)
        .neq('id', rosterId);

      if (clearCaptainError) {
        console.error('Error clearing existing captain role:', clearCaptainError);
        return NextResponse.json(
          { error: 'Failed to update captain assignment' },
          { status: 400 }
        );
      }
    }

    // Perform the roster update with service role after explicit auth verification.
    const { data: updated, error: updateError } = await serviceClient
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

    if (Object.prototype.hasOwnProperty.call(updateFields, 'leadership_role')) {
      let nextCaptainId: string | null = null;

      if (updateFields.leadership_role === 'captain') {
        nextCaptainId = currentRoster.player_id;
      } else {
        const { data: nextCaptain } = await serviceClient
          .from('team_rosters')
          .select('player_id')
          .eq('team_id', teamId)
          .eq('season_id', currentRoster.season_id)
          .eq('leadership_role', 'captain')
          .is('end_date', null)
          .maybeSingle();

        nextCaptainId = nextCaptain?.player_id ?? null;
      }

      const { error: teamUpdateError } = await serviceClient
        .from('teams')
        .update({ captain_id: nextCaptainId, updated_at: new Date().toISOString() })
        .eq('id', teamId);

      if (teamUpdateError) {
        console.error('Error syncing team captain:', teamUpdateError);
        return NextResponse.json(
          { error: 'Failed to sync team captain' },
          { status: 400 }
        );
      }
    }

    revalidatePath(`/dashboard/teams/${teamId}`);
    revalidatePath(`/dashboard/teams/${teamId}/settings`);
    revalidatePath('/dashboard/teams');
    revalidatePath(`/dashboard/leagues/${currentRoster.league_id}/teams`);
    revalidatePath(`/dashboard/leagues/${currentRoster.league_id}/teams-divisions`);

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
