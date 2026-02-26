'use server';

/**
 * Schedule Generation Server Actions
 *
 * Server actions for generating, managing, and saving schedules.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateSchedule, generateScheduleEnhanced } from './generator';
import type {
  Team,
  Venue,
  ScheduleConfig,
  ScheduleConstraint,
  ScheduleTemplate,
  ScheduleGenerationResult,
  ScheduledGame,
  GenerationLog,
  VenueAvailability,
  VenueBlackoutDate,
  TeamSchedulePreference,
  ScheduleConstraintConfig,
  AdditionalIceSlot,
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
    divisionAware: true,
    crossDivisionGamesPerTeam: 2,
    gameDays: (t.default_game_days as number[]) ?? [1, 3], // Mon, Wed
    gameTimes: (t.default_game_times as string[]) ?? ['19:00', '20:30', '22:00'],
    gameDurationMinutes: t.default_game_duration_minutes ?? 60,
    startDate: new Date(),
    endDate: new Date(),
    allowByeWeeks: false,
    byeWeeksPerTeam: 1,
    defaultVenueId: t.default_venue_id,
    rotateHomeVenue: t.rotate_home_venue ?? true,
    playoffFormat: 'none' as const, // Default - playoffs not configured yet
    playoffTeams: 8, // Default playoff teams
    playoffQualificationMode: 'count' as const,
    playoffPercentage: 50,
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
      divisionAware: true,
      crossDivisionGamesPerTeam: 2,
      gameDays: (data.default_game_days as number[]) ?? [1, 3],
      gameTimes: (data.default_game_times as string[]) ?? ['19:00', '20:30', '22:00'],
      gameDurationMinutes: data.default_game_duration_minutes ?? 60,
      startDate: new Date(),
      endDate: new Date(),
      defaultVenueId: data.default_venue_id,
      rotateHomeVenue: data.rotate_home_venue ?? true,
      playoffFormat: 'none' as const,
      playoffTeams: 8,
      playoffQualificationMode: 'count' as const,
      playoffPercentage: 50,
      allowByeWeeks: false,
      byeWeeksPerTeam: 1,
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
    maxOccurrences: (c as any).max_occurrences ?? null,
    timeSlotCategory: (c as any).time_slot_category ?? null,
    appliesToWeekends: (c as any).applies_to_weekends ?? null,
    appliesToWeekdays: (c as any).applies_to_weekdays ?? null,
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
      maxOccurrences: (data as any).max_occurrences ?? null,
      timeSlotCategory: (data as any).time_slot_category ?? null,
      appliesToWeekends: (data as any).applies_to_weekends ?? null,
      appliesToWeekdays: (data as any).applies_to_weekdays ?? null,
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
  templateId?: string,
  additionalIceSlots?: AdditionalIceSlot[]
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

  // Fetch teams for the season — only teams with active rosters in this season
  const { data: seasonRosters, error: rostersError } = await supabase
    .from('team_rosters')
    .select('team_id')
    .eq('season_id', seasonId)
    .eq('status', 'active');

  if (rostersError) {
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
      error: rostersError.message,
    };
  }

  const seasonTeamIds = [...new Set((seasonRosters ?? []).map((r) => r.team_id))];

  const { data: teamsData, error: teamsError } = seasonTeamIds.length > 0
    ? await supabase
        .from('teams')
        .select('id, name, short_name, division_id, home_venue_id')
        .in('id', seasonTeamIds)
    : { data: [], error: null };

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

  // Fetch enhanced constraints
  const [venueAvail, venueBlackoutsList, teamPrefs, constraintCfg] = await Promise.all([
    getVenueAvailability(leagueId, seasonId),
    getVenueBlackoutDates(leagueId),
    getTeamSchedulePreferences(leagueId, seasonId),
    getScheduleConstraintConfig(seasonId),
  ]);

  const hasEnhancedConstraints =
    venueAvail.length > 0 ||
    venueBlackoutsList.length > 0 ||
    teamPrefs.length > 0 ||
    constraintCfg !== null;

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

  // Generate the schedule - use enhanced algorithm when constraints exist
  const generationOptions = {
    seasonId,
    leagueId,
    teams,
    config,
    constraints,
    venues,
    ...(hasEnhancedConstraints && {
      venueAvailability: venueAvail,
      venueBlackouts: venueBlackoutsList,
      teamPreferences: teamPrefs,
      constraintConfig: constraintCfg ?? undefined,
    }),
    ...(additionalIceSlots && additionalIceSlots.length > 0 && {
      additionalIceSlots,
    }),
  };

  const result = hasEnhancedConstraints
    ? await generateScheduleEnhanced(generationOptions)
    : await generateSchedule(generationOptions);

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

  // Convert games to JSONB format for the database function
  // Handle both Date objects and ISO strings (serialization from server actions)
  const gamesJson = games.map((game) => ({
    home_team_id: game.homeTeamId,
    away_team_id: game.awayTeamId,
    scheduled_at: typeof game.scheduledAt === 'string'
      ? game.scheduledAt
      : game.scheduledAt.toISOString(),
    location: game.location,
    round_number: game.roundNumber,
    game_number: game.gameNumber,
  }));

  // Call atomic save function (handles locking internally)
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

  // RPC returns JSONB directly (not wrapped in an array)
  const result = data as { success: boolean; games_created: number; error_message: string | null } | null;
  if (!result?.success) {
    console.error('save_schedule_games returned failure:', result);
    return {
      success: false,
      gamesCreated: 0,
      error: result?.error_message ?? 'Unknown error saving schedule',
    };
  }

  revalidatePath('/dashboard');

  return { success: true, gamesCreated: result.games_created };
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

// ============================================================================
// VENUE AVAILABILITY ACTIONS
// ============================================================================

/**
 * Get venue availability for a league.
 */
export async function getVenueAvailability(
  leagueId: string,
  seasonId?: string
): Promise<VenueAvailability[]> {
  const supabase = await createClient();

  let query = supabase
    .from('venue_availability')
    .select('*')
    .eq('league_id', leagueId);

  if (seasonId) {
    query = query.or(`season_id.eq.${seasonId},season_id.is.null`);
  }

  const { data, error } = await query.order('day_of_week', { ascending: true });

  if (error) {
    console.error('Error fetching venue availability:', error);
    return [];
  }

  return (data ?? []).map((a) => ({
    id: a.id,
    leagueId: a.league_id,
    venueId: a.venue_id,
    seasonId: a.season_id,
    dayOfWeek: a.day_of_week,
    startTime: a.start_time,
    endTime: a.end_time,
    isAvailable: a.is_available,
    maxGames: a.max_games,
    notes: a.notes,
  }));
}

/**
 * Save venue availability (upsert).
 */
export async function saveVenueAvailability(
  leagueId: string,
  venueId: string,
  availability: Partial<VenueAvailability>
): Promise<{ success: boolean; availability?: VenueAvailability; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const insertData = {
    league_id: leagueId,
    venue_id: venueId,
    day_of_week: availability.dayOfWeek ?? 0,
    start_time: availability.startTime ?? '00:00',
    end_time: availability.endTime ?? '23:59',
    is_available: availability.isAvailable ?? true,
    max_games: availability.maxGames ?? null,
    season_id: availability.seasonId ?? null,
    notes: availability.notes ?? null,
    created_by: userData.user.id,
  };

  // If an id is provided, update; otherwise insert
  if (availability.id) {
    const { data, error } = await supabase
      .from('venue_availability')
      .update({
        day_of_week: insertData.day_of_week,
        start_time: insertData.start_time,
        end_time: insertData.end_time,
        is_available: insertData.is_available,
        max_games: insertData.max_games,
        season_id: insertData.season_id,
        notes: insertData.notes,
      })
      .eq('id', availability.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating venue availability:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      availability: {
        id: data.id,
        leagueId: data.league_id,
        venueId: data.venue_id,
        seasonId: data.season_id,
        dayOfWeek: data.day_of_week,
        startTime: data.start_time,
        endTime: data.end_time,
        isAvailable: data.is_available,
        maxGames: data.max_games,
        notes: data.notes,
      },
    };
  }

  const { data, error } = await supabase
    .from('venue_availability')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error saving venue availability:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    availability: {
      id: data.id,
      leagueId: data.league_id,
      venueId: data.venue_id,
      seasonId: data.season_id,
      dayOfWeek: data.day_of_week,
      startTime: data.start_time,
      endTime: data.end_time,
      isAvailable: data.is_available,
      maxGames: data.max_games,
      notes: data.notes,
    },
  };
}

/**
 * Delete venue availability.
 */
export async function deleteVenueAvailability(
  availabilityId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('venue_availability')
    .delete()
    .eq('id', availabilityId);

  if (error) {
    console.error('Error deleting venue availability:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// VENUE BLACKOUT DATE ACTIONS
// ============================================================================

/**
 * Get venue blackout dates for a league.
 */
export async function getVenueBlackoutDates(
  leagueId: string,
  venueId?: string
): Promise<VenueBlackoutDate[]> {
  const supabase = await createClient();

  let query = supabase
    .from('venue_blackout_dates')
    .select('*')
    .eq('league_id', leagueId);

  if (venueId) {
    query = query.eq('venue_id', venueId);
  }

  const { data, error } = await query.order('blackout_date', { ascending: true });

  if (error) {
    console.error('Error fetching venue blackout dates:', error);
    return [];
  }

  return (data ?? []).map((b) => ({
    id: b.id,
    leagueId: b.league_id,
    venueId: b.venue_id,
    blackoutDate: new Date(b.blackout_date),
    startTime: b.start_time,
    endTime: b.end_time,
    reason: b.reason,
  }));
}

/**
 * Add a venue blackout date.
 */
export async function addVenueBlackoutDate(
  leagueId: string,
  venueId: string,
  blackout: Partial<VenueBlackoutDate>
): Promise<{ success: boolean; blackout?: VenueBlackoutDate; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const blackoutDate = blackout.blackoutDate
    ? (typeof blackout.blackoutDate === 'string'
        ? blackout.blackoutDate
        : (blackout.blackoutDate as Date).toISOString().split('T')[0])
    : new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('venue_blackout_dates')
    .insert({
      league_id: leagueId,
      venue_id: venueId,
      blackout_date: blackoutDate,
      start_time: blackout.startTime ?? null,
      end_time: blackout.endTime ?? null,
      reason: blackout.reason ?? null,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding venue blackout date:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    blackout: {
      id: data.id,
      leagueId: data.league_id,
      venueId: data.venue_id,
      blackoutDate: new Date(data.blackout_date),
      startTime: data.start_time,
      endTime: data.end_time,
      reason: data.reason,
    },
  };
}

/**
 * Delete a venue blackout date.
 */
export async function deleteVenueBlackoutDate(
  blackoutId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('venue_blackout_dates')
    .delete()
    .eq('id', blackoutId);

  if (error) {
    console.error('Error deleting venue blackout date:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ============================================================================
// TEAM SCHEDULE PREFERENCES ACTIONS
// ============================================================================

/**
 * Get team schedule preferences for a season.
 */
export async function getTeamSchedulePreferences(
  leagueId: string,
  seasonId?: string
): Promise<TeamSchedulePreference[]> {
  const supabase = await createClient();

  let query = supabase
    .from('team_schedule_preferences')
    .select('*')
    .eq('league_id', leagueId);

  if (seasonId) {
    query = query.or(`season_id.eq.${seasonId},season_id.is.null`);
  }

  const { data, error } = await query.order('seniority_level', { ascending: false });

  if (error) {
    console.error('Error fetching team schedule preferences:', error);
    return [];
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    leagueId: p.league_id,
    teamId: p.team_id,
    seasonId: p.season_id,
    homeVenueId: p.home_venue_id,
    seniorityLevel: p.seniority_level,
    preferredGameTimes: (p.preferred_game_times as string[]) ?? [],
    avoidedGameTimes: (p.avoided_game_times as string[]) ?? [],
    preferredDays: (p.preferred_days as number[]) ?? [],
    avoidedDays: (p.avoided_days as number[]) ?? [],
    maxLateNightGames: p.max_late_night_games,
    maxEarlyMorningGames: p.max_early_morning_games,
    weekendPreference: p.weekend_preference ?? 0.5,
    minHoursBetweenGames: p.min_hours_between_games ?? 24,
    notes: p.notes,
  }));
}

/**
 * Save team schedule preference (upsert by team_id + league_id + season_id).
 */
export async function saveTeamSchedulePreference(
  leagueId: string,
  teamId: string,
  preference: Partial<TeamSchedulePreference>
): Promise<{ success: boolean; preference?: TeamSchedulePreference; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const rowData = {
    league_id: leagueId,
    team_id: teamId,
    season_id: preference.seasonId ?? null,
    home_venue_id: preference.homeVenueId ?? null,
    seniority_level: preference.seniorityLevel ?? 5,
    preferred_game_times: JSON.parse(JSON.stringify(preference.preferredGameTimes ?? [])),
    avoided_game_times: JSON.parse(JSON.stringify(preference.avoidedGameTimes ?? [])),
    preferred_days: JSON.parse(JSON.stringify(preference.preferredDays ?? [])),
    avoided_days: JSON.parse(JSON.stringify(preference.avoidedDays ?? [])),
    max_late_night_games: preference.maxLateNightGames ?? null,
    max_early_morning_games: preference.maxEarlyMorningGames ?? null,
    weekend_preference: preference.weekendPreference ?? 0.5,
    min_hours_between_games: preference.minHoursBetweenGames ?? 24,
    notes: preference.notes ?? null,
    created_by: userData.user.id,
  };

  // If an id is provided, update; otherwise insert
  if (preference.id) {

    const { data, error } = await supabase
      .from('team_schedule_preferences')
      .update(rowData)
      .eq('id', preference.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team schedule preference:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      preference: mapTeamPreferenceRow(data),
    };
  }

  const { data, error } = await supabase
    .from('team_schedule_preferences')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    console.error('Error saving team schedule preference:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    preference: mapTeamPreferenceRow(data),
  };
}

/**
 * Delete a team schedule preference.
 */
export async function deleteTeamSchedulePreference(
  preferenceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('team_schedule_preferences')
    .delete()
    .eq('id', preferenceId);

  if (error) {
    console.error('Error deleting team schedule preference:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/** Map a team_schedule_preferences row to TeamSchedulePreference. */
function mapTeamPreferenceRow(row: {
  id: string;
  league_id: string;
  team_id: string;
  season_id: string | null;
  home_venue_id: string | null;
  seniority_level: number;
  preferred_game_times: unknown;
  avoided_game_times: unknown;
  preferred_days: unknown;
  avoided_days: unknown;
  max_late_night_games: number | null;
  max_early_morning_games: number | null;
  weekend_preference: number | null;
  min_hours_between_games: number | null;
  notes: string | null;
}): TeamSchedulePreference {
  return {
    id: row.id,
    leagueId: row.league_id,
    teamId: row.team_id,
    seasonId: row.season_id,
    homeVenueId: row.home_venue_id,
    seniorityLevel: row.seniority_level,
    preferredGameTimes: (row.preferred_game_times as string[]) ?? [],
    avoidedGameTimes: (row.avoided_game_times as string[]) ?? [],
    preferredDays: (row.preferred_days as number[]) ?? [],
    avoidedDays: (row.avoided_days as number[]) ?? [],
    maxLateNightGames: row.max_late_night_games,
    maxEarlyMorningGames: row.max_early_morning_games,
    weekendPreference: row.weekend_preference ?? 0.5,
    minHoursBetweenGames: row.min_hours_between_games ?? 24,
    notes: row.notes,
  };
}

// ============================================================================
// CONSTRAINT CONFIG ACTIONS
// ============================================================================

/**
 * Get schedule constraint config for a season.
 */
export async function getScheduleConstraintConfig(
  seasonId: string
): Promise<ScheduleConstraintConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('schedule_constraint_configs')
    .select('*')
    .eq('season_id', seasonId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching schedule constraint config:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    leagueId: data.league_id,
    seasonId: data.season_id,
    maxGamesPerVenuePerDay: data.max_games_per_venue_per_day ?? 4,
    enforceHomeVenueAssignments: data.enforce_home_venue_assignments ?? true,
    earlyMorningEndTime: data.early_morning_end_time ?? '10:00',
    lateNightStartTime: data.late_night_start_time ?? '21:00',
    globalMaxLateNightGamesPerTeam: data.global_max_late_night_games_per_team,
    globalMaxEarlyMorningGamesPerTeam: data.global_max_early_morning_games_per_team,
    enforceSeniorityPreferences: data.enforce_seniority_preferences ?? false,
    seniorityWeight: data.seniority_weight ?? 0.5,
    targetWeekendGamePercentage: data.target_weekend_game_percentage ?? 50,
    weekendTolerancePercentage: data.weekend_tolerance_percentage ?? 10,
    newTeamPenaltyWeeks: data.new_team_penalty_weeks ?? 0,
  };
}

/**
 * Save schedule constraint config for a season (upsert).
 */
export async function saveScheduleConstraintConfig(
  leagueId: string,
  seasonId: string,
  config: Partial<ScheduleConstraintConfig>
): Promise<{ success: boolean; config?: ScheduleConstraintConfig; error?: string }> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const rowData = {
    league_id: leagueId,
    season_id: seasonId,
    max_games_per_venue_per_day: config.maxGamesPerVenuePerDay ?? 4,
    enforce_home_venue_assignments: config.enforceHomeVenueAssignments ?? true,
    early_morning_end_time: config.earlyMorningEndTime ?? '10:00',
    late_night_start_time: config.lateNightStartTime ?? '21:00',
    global_max_late_night_games_per_team: config.globalMaxLateNightGamesPerTeam ?? null,
    global_max_early_morning_games_per_team: config.globalMaxEarlyMorningGamesPerTeam ?? null,
    enforce_seniority_preferences: config.enforceSeniorityPreferences ?? false,
    seniority_weight: config.seniorityWeight ?? 0.5,
    target_weekend_game_percentage: config.targetWeekendGamePercentage ?? 50,
    weekend_tolerance_percentage: config.weekendTolerancePercentage ?? 10,
    new_team_penalty_weeks: config.newTeamPenaltyWeeks ?? 0,
    created_by: userData.user.id,
  };

  // Check if config already exists for this season
  const { data: existing } = await supabase
    .from('schedule_constraint_configs')
    .select('id')
    .eq('season_id', seasonId)
    .maybeSingle();

  if (existing) {

    const { data, error } = await supabase
      .from('schedule_constraint_configs')
      .update(rowData)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule constraint config:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');
    return {
      success: true,
      config: {
        id: data.id,
        leagueId: data.league_id,
        seasonId: data.season_id,
        maxGamesPerVenuePerDay: data.max_games_per_venue_per_day ?? 4,
        enforceHomeVenueAssignments: data.enforce_home_venue_assignments ?? true,
        earlyMorningEndTime: data.early_morning_end_time ?? '10:00',
        lateNightStartTime: data.late_night_start_time ?? '21:00',
        globalMaxLateNightGamesPerTeam: data.global_max_late_night_games_per_team,
        globalMaxEarlyMorningGamesPerTeam: data.global_max_early_morning_games_per_team,
        enforceSeniorityPreferences: data.enforce_seniority_preferences ?? false,
        seniorityWeight: data.seniority_weight ?? 0.5,
        targetWeekendGamePercentage: data.target_weekend_game_percentage ?? 50,
        weekendTolerancePercentage: data.weekend_tolerance_percentage ?? 10,
        newTeamPenaltyWeeks: data.new_team_penalty_weeks ?? 0,
      },
    };
  }

  const { data, error } = await supabase
    .from('schedule_constraint_configs')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    console.error('Error saving schedule constraint config:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return {
    success: true,
    config: {
      id: data.id,
      leagueId: data.league_id,
      seasonId: data.season_id,
      maxGamesPerVenuePerDay: data.max_games_per_venue_per_day ?? 4,
      enforceHomeVenueAssignments: data.enforce_home_venue_assignments ?? true,
      earlyMorningEndTime: data.early_morning_end_time ?? '10:00',
      lateNightStartTime: data.late_night_start_time ?? '21:00',
      globalMaxLateNightGamesPerTeam: data.global_max_late_night_games_per_team,
      globalMaxEarlyMorningGamesPerTeam: data.global_max_early_morning_games_per_team,
      enforceSeniorityPreferences: data.enforce_seniority_preferences ?? false,
      seniorityWeight: data.seniority_weight ?? 0.5,
      targetWeekendGamePercentage: data.target_weekend_game_percentage ?? 50,
      weekendTolerancePercentage: data.weekend_tolerance_percentage ?? 10,
      newTeamPenaltyWeeks: data.new_team_penalty_weeks ?? 0,
    },
  };
}

/**
 * Bulk save team schedule preferences for multiple teams.
 */
export async function bulkSaveTeamSchedulePreferences(
  leagueId: string,
  preferences: Array<{ teamId: string; preference: Partial<TeamSchedulePreference> }>
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  let savedCount = 0;

  for (const { teamId, preference } of preferences) {
    const result = await saveTeamSchedulePreference(leagueId, teamId, preference);
    if (result.success) {
      savedCount++;
    } else {
      console.error(`Failed to save preference for team ${teamId}:`, result.error);
    }
  }

  revalidatePath('/dashboard');
  return {
    success: savedCount === preferences.length,
    savedCount,
    error: savedCount < preferences.length
      ? `Saved ${savedCount}/${preferences.length} preferences`
      : undefined,
  };
}
