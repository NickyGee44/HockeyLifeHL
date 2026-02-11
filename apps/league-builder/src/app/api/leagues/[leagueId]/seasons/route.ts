import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this league via league_memberships or org ownership
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    // Fallback: check org ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

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
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has admin/owner access to this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

  if (!isAdmin) {
    // Fallback: check org ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const {
      name,
      start_date,
      end_date,
      carry_forward_teams,
      selected_team_ids,
      import_rosters,
      team_roster_import,
      previous_season_id,
    } = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      })
      .select()
      .single();

    if (seasonError || !newSeason) {
      console.error('Error creating season:', seasonError);
      return NextResponse.json({ error: 'Failed to create season' }, { status: 500 });
    }

    // If carrying forward teams, update team-season associations
    if (carry_forward_teams && selected_team_ids && selected_team_ids.length > 0) {
      // Teams are associated via their league_id, so we just need to ensure
      // they have roster entries for the new season if importing rosters

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
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has admin/owner access to this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

  if (!isAdmin) {
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

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
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has admin/owner access to this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const isAdmin = membership && ['owner', 'admin'].includes(membership.role);

  if (!isAdmin) {
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

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
