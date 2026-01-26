import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateStatEntry, validatePeriod, validateStatType } from "@/lib/scorekeeper/stat-validation";

/**
 * API Endpoint: Submit Stat Entry
 *
 * Used by service worker to sync offline queue
 * Accepts individual stat entries from the offline queue
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { gameId, playerId, teamId, statType, period, timestamp, pimValue } = body;

    // Validate required fields
    if (!gameId || !playerId || !teamId || !statType || !period) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate period and stat type
    const periodValidation = validatePeriod(period);
    if (!periodValidation.valid) {
      return NextResponse.json(
        { error: periodValidation.error },
        { status: 400 }
      );
    }

    const statTypeValidation = validateStatType(statType);
    if (!statTypeValidation.valid) {
      return NextResponse.json(
        { error: statTypeValidation.error },
        { status: 400 }
      );
    }

    // Verify user is assigned to this game
    const { data: assignment, error: assignmentError } = await supabase
      .from('game_scorekeeper_assignments')
      .select('id, league_id')
      .eq('game_id', gameId)
      .eq('scorekeeper_id', user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Not authorized to enter stats for this game" },
        { status: 403 }
      );
    }

    // Get game details to determine team type
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('home_team_id, away_team_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    const teamType = teamId === game.home_team_id ? 'home' : 'away';

    // Fetch player position for validation
    const { data: playerRoster, error: playerError } = await supabase
      .from('team_rosters')
      .select('player:profiles!team_rosters_player_id_fkey(position)')
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .single();

    if (playerError || !playerRoster || !playerRoster.player) {
      return NextResponse.json(
        { error: "Player not found on team roster" },
        { status: 404 }
      );
    }

    // Fetch current game stats for validation (goals vs shots)
    const { data: gameStats } = await supabase
      .from('game_stats')
      .select('stat_type, team_type, value')
      .eq('game_id', gameId);

    const currentStats = {
      homeGoals: gameStats?.filter(s => s.stat_type === 'Goal' && s.team_type === 'home').length || 0,
      awayGoals: gameStats?.filter(s => s.stat_type === 'Goal' && s.team_type === 'away').length || 0,
      homeShots: gameStats?.filter(s => s.stat_type === 'Shot' && s.team_type === 'home').length || 0,
      awayShots: gameStats?.filter(s => s.stat_type === 'Shot' && s.team_type === 'away').length || 0,
      homePIM: gameStats?.filter(s => s.stat_type === 'PIM' && s.team_type === 'home').reduce((sum, s) => sum + (s.value || 0), 0) || 0,
      awayPIM: gameStats?.filter(s => s.stat_type === 'PIM' && s.team_type === 'away').reduce((sum, s) => sum + (s.value || 0), 0) || 0,
    };

    // Comprehensive validation
    const validation = validateStatEntry({
      statType,
      period,
      playerPosition: playerRoster.player.position,
      teamType,
      currentStats,
      pimValue,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check for duplicate entry (same player, stat type, period, within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data: duplicates } = await supabase.from('game_stats').select('id').eq('game_id', gameId).eq('player_id', playerId).eq('stat_type', statType).eq('period', period).gte('created_at', thirtySecondsAgo);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json(
        { error: "Duplicate entry detected", duplicate: true },
        { status: 409 }
      );
    }

    // Insert stat entry
    const { data: stat, error: insertError } = await supabase.from('game_stats').insert({ game_id: gameId, player_id: playerId, team_id: teamId, league_id: assignment.league_id, stat_type: statType, value: statType === 'PIM' ? (pimValue || 2) : 1, period: period, timestamp: timestamp || new Date().toISOString(), team_type: teamType, entered_by: user.id }).select('id').single();

    if (insertError) {
      console.error('[API] Error inserting stat:', insertError);
      return NextResponse.json(
        { error: "Failed to insert stat entry" },
        { status: 500 }
      );
    }

    // Log the entry for audit trail
    await supabase
      .from('game_stat_entry_log')
      .insert({
        game_id: gameId,
        entered_by: user.id,
        entered_by_role: 'scorekeeper',
        league_id: assignment.league_id,
        action: 'create',
        stat_type: statType,
        player_id: playerId,
        new_value: { stat_id: stat.id, period: period, timestamp: timestamp || new Date().toISOString() },
      });

    return NextResponse.json({
      success: true,
      statId: stat.id,
    });
  } catch (error) {
    console.error('[API] Stat submission error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
