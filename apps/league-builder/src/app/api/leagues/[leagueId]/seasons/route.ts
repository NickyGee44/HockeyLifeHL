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
    .single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
