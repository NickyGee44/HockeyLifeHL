'use server';

/**
 * Schedule Generation Server Actions
 *
 * Server actions for generating, managing, and saving schedules.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateSchedule, rescheduleGame } from './generator';
import type {
  Team,
  Venue,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleTemplate,
  ScheduleGenerationResult,
  ScheduledGame,
  GenerationLog,
} from './types';

// ============================================================================
// TEMPLATE ACTIONS
// ============================================================================

/**
 * Get all schedule templates for a league.
 */
export async function getScheduleTemplates(leagueId: string): Promise<ScheduleTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('league_id', leagueId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching schedule templates:', error);
    return [];
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    leagueId: t.league_id,
    name: t.name,
    description: t.description,
    scheduleType: t.schedule_type as ScheduleConfig['scheduleType'],
    gamesPerTeam: t.games_per_team,
    allowBackToBack: t.allow_back_to_back,
    homeAwayBalance: t.home_away_balance,
    divisionGamesRatio: t.division_games_ratio ?? 0.6,
    gameDays: (t.default_game_days as number[]) ?? [1, 3], // Mon, Wed
    gameTimes: (t.default_game_times as string[]) ?? ['19:00', '20:30', '22:00'],
    gameDurationMinutes: t.default_game_duration_minutes ?? 60,
    startDate: new Date(),
    endDate: new Date(),
    defaultVenueId: t.default_venue_id,
    rotateHomeVenue: t.rotate_home_venue ?? true,
    isDefault: t.is_default ?? false,
    createdAt: new Date(t.created_at ?? Date.now()),
    updatedAt: new Date(t.updated_at ?? Date.now()),
  }));
}

/**
 * Create a new schedule template.
 */
export async function createScheduleTemplate(
  leagueId: string,
  template: Partial<ScheduleTemplate>
): Promise<{ success: boolean; template?: ScheduleTemplate; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('schedule_templates')
    .insert({
      league_id: leagueId,
      name: template.name ?? 'New Template',
      description: template.description ?? null,
      schedule_type: template.scheduleType ?? 'round_robin',
      games_per_team: template.gamesPerTeam ?? 14,
      allow_back_to_back: template.allowBackToBack ?? false,
      home_away_balance: template.homeAwayBalance ?? true,
      division_games_ratio: template.divisionGamesRatio ?? 0.6,
      default_game_days: template.gameDays ?? [1, 3],
      default_game_times: template.gameTimes ?? ['19:00', '20:30', '22:00'],
      default_game_duration_minutes: template.gameDurationMinutes ?? 60,
      default_venue_id: template.defaultVenueId ?? null,
      rotate_home_venue: template.rotateHomeVenue ?? true,
      is_default: template.isDefault ?? false,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule template:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');

  return {
    success: true,
    template: {
      id: data.id,
      leagueId: data.league_id,
      name: data.name,
      description: data.description,
      scheduleType: data.schedule_type as ScheduleConfig['scheduleType'],
      gamesPerTeam: data.games_per_team,
      allowBackToBack: data.allow_back_to_back,
      homeAwayBalance: data.home_away_balance,
      divisionGamesRatio: data.division_games_ratio ?? 0.6,
      gameDays: (data.default_game_days as number[]) ?? [1, 3],
      gameTimes: (data.default_game_times as string[]) ?? ['19:00', '20:30', '22:00'],
      gameDurationMinutes: data.default_game_duration_minutes ?? 60,
      startDate: new Date(),
      endDate: new Date(),
      defaultVenueId: data.default_venue_id,
      rotateHomeVenue: data.rotate_home_venue ?? true,
      isDefault: data.is_default ?? false,
      createdAt: new Date(data.created_at ?? Date.now()),
      updatedAt: new Date(data.updated_at ?? Date.now()),
    },
  };
}

// ============================================================================
// CONSTRAINT ACTIONS
// ============================================================================

/**
 * Get all constraints for a season.
 */
export async function getScheduleConstraints(seasonId: string): Promise<ScheduleConstraint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedule_constraints')
    .select('*')
    .eq('season_id', seasonId)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching schedule constraints:', error);
    return [];
  }

  return (data ?? []).map((c) => ({
    id: c.id,
    seasonId: c.season_id,
    leagueId: c.league_id,
    constraintType: c.constraint_type as ScheduleConstraint['constraintType'],
    teamId: c.team_id,
    venueId: c.venue_id,
    opponentTeamId: c.opponent_team_id,
    startDate: c.start_date ? new Date(c.start_date) : null,
    endDate: c.end_date ? new Date(c.end_date) : null,
    dayOfWeek: c.day_of_week,
    startTime: c.start_time,
    endTime: c.end_time,
    priority: c.priority ?? 5,
    isHardConstraint: c.is_hard_constraint ?? false,
    notes: c.notes,
  }));
}

/**
 * Add a constraint for a season.
 */
export async function addScheduleConstraint(
  seasonId: string,
  leagueId: string,
  constraint: Partial<ScheduleConstraint>
): Promise<{ success: boolean; constraint?: ScheduleConstraint; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('schedule_constraints')
    .insert({
      season_id: seasonId,
      league_id: leagueId,
      constraint_type: constraint.constraintType ?? 'team_blackout',
      team_id: constraint.teamId ?? null,
      venue_id: constraint.venueId ?? null,
      opponent_team_id: constraint.opponentTeamId ?? null,
      start_date: constraint.startDate?.toISOString().split('T')[0] ?? null,
      end_date: constraint.endDate?.toISOString().split('T')[0] ?? null,
      day_of_week: constraint.dayOfWeek ?? null,
      start_time: constraint.startTime ?? null,
      end_time: constraint.endTime ?? null,
      priority: constraint.priority ?? 5,
      is_hard_constraint: constraint.isHardConstraint ?? false,
      notes: constraint.notes ?? null,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding schedule constraint:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');

  return {
    success: true,
    constraint: {
      id: data.id,
      seasonId: data.season_id,
      leagueId: data.league_id,
      constraintType: data.constraint_type as ScheduleConstraint['constraintType'],
      teamId: data.team_id,
      venueId: data.venue_id,
      opponentTeamId: data.opponent_team_id,
      startDate: data.start_date ? new Date(data.start_date) : null,
      endDate: data.end_date ? new Date(data.end_date) : null,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      priority: data.priority ?? 5,
      isHardConstraint: data.is_hard_constraint ?? false,
      notes: data.notes,
    },
  };
}

/**
 * Delete a constraint.
 */
export async function deleteScheduleConstraint(
  constraintId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('schedule_constraints')
    .delete()
    .eq('id', constraintId);

  if (error) {
    console.error('Error deleting schedule constraint:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// SCHEDULE GENERATION ACTIONS
// ============================================================================

/**
 * Generate a schedule for a season.
 */
export async function generateSeasonSchedule(
  seasonId: string,
  leagueId: string,
  config: ScheduleConfig,
  templateId?: string
): Promise<ScheduleGenerationResult & { logId?: string }> {
  const supabase = await createClient();
  const startTime = Date.now();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      success: false,
      games: [],
      totalGames: 0,
      gamesPerTeam: {},
      homeGamesPerTeam: {},
      awayGamesPerTeam: {},
      constraintViolations: [],
      hardConstraintFailures: [],
      durationMs: 0,
      error: 'Not authenticated',
    };
  }

  // Fetch teams for the season
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, short_name, division_id, home_venue_id')
    .eq('league_id', leagueId)
    .eq('status', 'active');

  if (teamsError || !teamsData) {
    return {
      success: false,
      games: [],
      totalGames: 0,
      gamesPerTeam: {},
      homeGamesPerTeam: {},
      awayGamesPerTeam: {},
      constraintViolations: [],
      hardConstraintFailures: [],
      durationMs: Date.now() - startTime,
      error: teamsError?.message ?? 'Failed to fetch teams',
    };
  }

  const teams: Team[] = teamsData.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.short_name,
    divisionId: t.division_id,
    homeVenueId: t.home_venue_id,
  }));

  // Fetch venues
  const { data: venuesData } = await supabase
    .from('venues')
    .select('id, name, address, number_of_rinks')
    .eq('league_id', leagueId);

  const venues: Venue[] = (venuesData ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    address: v.address ?? '',
    numberOfRinks: v.number_of_rinks ?? 1,
  }));

  // Fetch constraints
  const constraints = await getScheduleConstraints(seasonId);

  // Create generation log
  const { data: logData, error: logError } = await supabase
    .from('schedule_generation_log')
    .insert({
      season_id: seasonId,
      league_id: leagueId,
      status: 'running',
      template_id: templateId ?? null,
      algorithm_type: config.scheduleType,
      team_count: teams.length,
      started_at: new Date().toISOString(),
      generated_by: userData.user.id,
    })
    .select()
    .single();

  if (logError) {
    console.error('Error creating generation log:', logError);
  }

  const logId = logData?.id;

  // Generate the schedule
  const result = await generateSchedule({
    seasonId,
    leagueId,
    teams,
    config,
    constraints,
    venues,
  });

  // Update generation log with results
  if (logId) {
    await supabase
      .from('schedule_generation_log')
      .update({
        status: result.success ? 'completed' : 'failed',
        games_generated: result.totalGames,
        constraint_violations: JSON.parse(JSON.stringify(result.constraintViolations)),
        hard_constraint_failures: JSON.parse(JSON.stringify(result.hardConstraintFailures)),
        completed_at: new Date().toISOString(),
        duration_ms: result.durationMs,
        error_message: result.error ?? null,
        error_details: result.errorDetails ? JSON.parse(JSON.stringify(result.errorDetails)) : null,
      })
      .eq('id', logId);
  }

  return { ...result, logId };
}

/**
 * Save generated games to the database using atomic transaction.
 * Uses the save_schedule_games database function for data integrity.
 */
export async function saveScheduleGames(
  seasonId: string,
  leagueId: string,
  games: ScheduledGame[],
  logId?: string
): Promise<{ success: boolean; gamesCreated: number; error?: string }> {
  const supabase = await createClient();

  // Acquire advisory lock to prevent concurrent schedule saves
  const { data: lockAcquired } = await supabase.rpc('acquire_schedule_lock', {
    p_season_id: seasonId,
  });

  if (!lockAcquired) {
    return {
      success: false,
      gamesCreated: 0,
      error: 'Another schedule generation is in progress. Please try again.',
    };
  }

  try {
    // Convert games to JSONB format for the database function
    const gamesJson = games.map((game) => ({
      home_team_id: game.homeTeamId,
      away_team_id: game.awayTeamId,
      scheduled_at: game.scheduledAt.toISOString(),
      location: game.location,
      round_number: game.roundNumber,
      game_number: game.gameNumber,
    }));

    // Call atomic save function
    const { data, error } = await supabase.rpc('save_schedule_games', {
      p_season_id: seasonId,
      p_league_id: leagueId,
      p_games: gamesJson,
      p_log_id: logId,
    });

    if (error) {
      console.error('Error saving games:', error);
      return { success: false, gamesCreated: 0, error: error.message };
    }

    const result = data?.[0];
    if (!result?.success) {
      return {
        success: false,
        gamesCreated: 0,
        error: result?.error_message ?? 'Unknown error saving schedule',
      };
    }

    revalidatePath('/dashboard');

    return { success: true, gamesCreated: result.games_created };
  } finally {
    // Always release the lock
    await supabase.rpc('release_schedule_lock', { p_season_id: seasonId });
  }
}

// ============================================================================
// RESCHEDULE ACTIONS
// ============================================================================

/**
 * Reschedule a game to a new date/time.
 */
export async function rescheduleGameAction(
  gameId: string,
  newScheduledAt: Date,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*, season:seasons(league_id)')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return { success: false, error: gameError?.message ?? 'Game not found' };
  }

  // Update the game
  const { error: updateError } = await supabase
    .from('games')
    .update({
      original_scheduled_at: game.scheduled_at,
      scheduled_at: newScheduledAt.toISOString(),
      is_rescheduled: true,
      rescheduled_at: new Date().toISOString(),
      cancellation_reason: reason, // Reusing this field for reschedule reason
    })
    .eq('id', gameId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Cancel a game with a reason.
 */
export async function cancelGame(
  gameId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('games')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', gameId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Get schedule generation history for a season.
 */
export async function getGenerationLogs(seasonId: string): Promise<GenerationLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedule_generation_log')
    .select('*')
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching generation logs:', error);
    return [];
  }

  return (data ?? []).map((log) => ({
    id: log.id,
    seasonId: log.season_id,
    leagueId: log.league_id,
    status: log.status as GenerationLog['status'],
    templateId: log.template_id,
    algorithmType: log.algorithm_type ?? 'round_robin',
    teamCount: log.team_count,
    gamesGenerated: log.games_generated ?? 0,
    constraintViolations: (log.constraint_violations as unknown as GenerationLog['constraintViolations']) ?? [],
    hardConstraintFailures: (log.hard_constraint_failures as unknown as GenerationLog['hardConstraintFailures']) ?? [],
    startedAt: log.started_at ? new Date(log.started_at) : null,
    completedAt: log.completed_at ? new Date(log.completed_at) : null,
    durationMs: log.duration_ms ?? null,
    errorMessage: log.error_message ?? null,
    errorDetails: (log.error_details as Record<string, unknown> | null) ?? null,
    generatedBy: log.generated_by ?? '',
    createdAt: new Date(log.created_at ?? Date.now()),
  }));
}
