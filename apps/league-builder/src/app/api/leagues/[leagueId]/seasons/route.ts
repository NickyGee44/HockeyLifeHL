import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { seedSeasonParticipationTeams } from '@/lib/seasons/team-participation';

async function requireLeagueSeasonAccess(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return {
      error: access.error || 'Forbidden',
      status: 403 as const,
      userId: user.id,
    };
  }

  return { userId: user.id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const access = await requireLeagueSeasonAccess(leagueId);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createServiceRoleClient();

  // Fetch seasons for the league
  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date')
    .eq('league_id', leagueId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 });
  }

  return NextResponse.json({ seasons: seasons || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const access = await requireLeagueSeasonAccess(leagueId);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createServiceRoleClient();

  try {
    const body = await request.json();
    const {
      name,
      start_date,
      end_date,
      registration_type,
      registration_opens_at,
      registration_closes_at,
      carry_forward_teams,
      selected_team_ids,
      import_rosters,
      team_roster_import,
      previous_season_id,
      games_per_cycle,
      max_players_per_team,
      allow_team_selection,
      schedule_setup_mode: _schedule_setup_mode,
    } = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (
      registration_opens_at &&
      registration_closes_at &&
      new Date(registration_opens_at).getTime() >= new Date(registration_closes_at).getTime()
    ) {
      return NextResponse.json(
        { error: 'Registration open date must be before registration close date' },
        { status: 400 }
      );
    }

    // Create the new season
    const { data: newSeason, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        league_id: leagueId,
        name,
        start_date,
        end_date,
        status: 'draft',
        registration_type: registration_type || 'open_registration',
        registration_opens_at: registration_opens_at || null,
        registration_closes_at: registration_closes_at || null,
        games_per_cycle:
          typeof games_per_cycle === 'number' && Number.isFinite(games_per_cycle)
            ? games_per_cycle
            : 1,
        max_players_per_team:
          typeof max_players_per_team === 'number' && Number.isFinite(max_players_per_team)
            ? max_players_per_team
            : 18,
        allow_team_selection: allow_team_selection === true,
      })
      .select()
      .single();

    if (seasonError || !newSeason) {
      console.error('Error creating season:', seasonError);
      return NextResponse.json({ error: 'Failed to create season' }, { status: 500 });
    }

    // If carrying forward teams, update team-season associations
    if (carry_forward_teams && selected_team_ids && selected_team_ids.length > 0) {
      await seedSeasonParticipationTeams({
        supabase,
        leagueId,
        seasonId: newSeason.id,
        teamIds: selected_team_ids,
        createdBy: access.userId,
        sourceSeasonId: previous_season_id || null,
      });

      if (import_rosters && previous_season_id) {
        // Import rosters for selected teams
        for (const teamId of selected_team_ids) {
          if (team_roster_import[teamId]) {
            // Use the copy_roster_between_seasons function
            const { error: rosterError } = await supabase.rpc('copy_roster_between_seasons', {
              p_team_id: teamId,
              p_from_season_id: previous_season_id,
              p_to_season_id: newSeason.id,
              p_player_ids: undefined, // Import all players
            });

            if (rosterError) {
              console.error(`Error importing roster for team ${teamId}:`, rosterError);
              // Continue with other teams, don't fail the whole operation
            }
          }
        }
      }
    }

    return NextResponse.json({ id: newSeason.id, name: newSeason.name });
  } catch (error) {
    console.error('Error in POST /api/leagues/[leagueId]/seasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const access = await requireLeagueSeasonAccess(leagueId);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createServiceRoleClient();

  try {
    const body = await request.json();
    const { id, name, start_date, end_date, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('seasons')
      .update(updateData)
      .eq('id', id)
      .eq('league_id', leagueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating season:', error);
      return NextResponse.json({ error: 'Failed to update season' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error in PUT /api/leagues/[leagueId]/seasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const access = await requireLeagueSeasonAccess(leagueId);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = createServiceRoleClient();

  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId is required' }, { status: 400 });
    }

    // Check if the season has any games before deleting
    const { count: gameCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId);

    if (gameCount && gameCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a season with existing games. Remove all games first.' },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId)
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error deleting season:', error);
      return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/leagues/[leagueId]/seasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
