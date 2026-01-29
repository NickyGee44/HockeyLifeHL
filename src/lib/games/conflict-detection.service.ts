/**
 * Conflict Detection Service
 *
 * Detects scheduling conflicts for BMHL games including:
 * - Team scheduling conflicts (overlapping games, back-to-back violations)
 * - Venue double-booking
 * - Scorekeeper double-booking
 * - Schedule rule violations (blackout dates, max games per week, etc.)
 *
 * Usage:
 *   const service = new ConflictDetectionService(supabaseClient);
 *   const result = await service.checkGameConflicts(gameData, scheduleRules);
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { addMinutes, isWithinInterval, startOfWeek, endOfWeek, differenceInHours, format, parseISO, getDay } from "date-fns";
import type {
  SchedulingConflict,
  ScheduleRules,
  GameForConflictCheck,
  ConflictCheckResult,
  TeamScheduleSummary,
  VenueAvailability,
  ScorekeeperAvailability,
  ConflictType,
} from "./conflict-detection.types";

export class ConflictDetectionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Main entry point: Check all conflicts for a game
   */
  async checkGameConflicts(
    game: GameForConflictCheck,
    rules: ScheduleRules
  ): Promise<ConflictCheckResult> {
    const conflicts: SchedulingConflict[] = [];

    // Run all conflict checks in parallel
    const [
      teamConflicts,
      venueConflicts,
      scorekeeperConflicts,
      ruleConflicts,
    ] = await Promise.all([
      this.checkTeamConflicts(game, rules),
      this.checkVenueConflicts(game, rules),
      this.checkScorekeeperConflicts(game, rules),
      this.checkScheduleRuleConflicts(game, rules),
    ]);

    conflicts.push(
      ...teamConflicts,
      ...venueConflicts,
      ...scorekeeperConflicts,
      ...ruleConflicts
    );

    const errorCount = conflicts.filter((c) => c.severity === "error").length;
    const warningCount = conflicts.filter((c) => c.severity === "warning").length;
    const infoCount = conflicts.filter((c) => c.severity === "info").length;

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkedAt: new Date(),
      gameId: game.id,
      errorCount,
      warningCount,
      infoCount,
    };
  }

  /**
   * Check for team scheduling conflicts
   * - Overlapping games
   * - Back-to-back violations
   * - Max games per week/day
   */
  private async checkTeamConflicts(
    game: GameForConflictCheck,
    rules: ScheduleRules
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];
    const teamIds = [game.homeTeamId, game.awayTeamId];

    for (const teamId of teamIds) {
      // Get team's schedule for conflict checking
      const teamSchedule = await this.getTeamSchedule(
        teamId,
        game.leagueId,
        game.seasonId,
        game.id // Exclude current game if editing
      );

      // Check for overlapping games
      const overlappingGames = this.findOverlappingGames(
        game.scheduledAt,
        rules.gameDurationMinutes,
        teamSchedule.games
      );

      if (overlappingGames.length > 0) {
        conflicts.push({
          type: "team_overlap",
          severity: "error",
          message: `Team has an overlapping game at ${format(overlappingGames[0].scheduledAt, "h:mm a")}`,
          affectedEntities: {
            teamIds: [teamId],
            gameIds: overlappingGames.map((g) => g.id),
          },
          suggestion: "Choose a different time slot or reschedule the conflicting game",
        });
      }

      // Check back-to-back violations
      const backToBackViolations = this.findBackToBackViolations(
        game.scheduledAt,
        rules.minHoursBetweenGames,
        teamSchedule.games
      );

      if (backToBackViolations.length > 0) {
        const violatingGame = backToBackViolations[0];
        const hoursBetween = differenceInHours(
          game.scheduledAt,
          violatingGame.scheduledAt
        );

        conflicts.push({
          type: "back_to_back_violation",
          severity: "error",
          message: `Team has a game ${Math.abs(hoursBetween)} hours ${
            hoursBetween > 0 ? "before" : "after"
          } this game (minimum ${rules.minHoursBetweenGames} hours required)`,
          affectedEntities: {
            teamIds: [teamId],
            gameIds: [violatingGame.id],
          },
          suggestion: `Schedule games at least ${rules.minHoursBetweenGames} hours apart`,
        });
      }

      // Check max games per day
      const gamesOnSameDay = this.countGamesOnSameDay(
        game.scheduledAt,
        teamSchedule.games
      );

      if (gamesOnSameDay >= rules.maxGamesPerDay) {
        conflicts.push({
          type: "max_games_per_day",
          severity: "error",
          message: `Team already has ${gamesOnSameDay} game(s) on this day (max ${rules.maxGamesPerDay})`,
          affectedEntities: {
            teamIds: [teamId],
          },
          suggestion: "Schedule game on a different day",
        });
      }

      // Check max games per week
      const gamesThisWeek = this.countGamesInWeek(
        game.scheduledAt,
        teamSchedule.games
      );

      if (gamesThisWeek >= rules.maxGamesPerWeek) {
        conflicts.push({
          type: "max_games_per_week",
          severity: "warning",
          message: `Team will have ${gamesThisWeek + 1} games this week (max ${rules.maxGamesPerWeek} recommended)`,
          affectedEntities: {
            teamIds: [teamId],
          },
          suggestion: "Consider spacing games across multiple weeks",
        });
      }
    }

    return conflicts;
  }

  /**
   * Check for venue conflicts (double-booking)
   */
  private async checkVenueConflicts(
    game: GameForConflictCheck,
    rules: ScheduleRules
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];

    // Check if venue is in allowed list
    if (rules.allowedVenueIds && rules.allowedVenueIds.length > 0) {
      if (!rules.allowedVenueIds.includes(game.venueId)) {
        conflicts.push({
          type: "invalid_time_window",
          severity: "error",
          message: "Venue is not in the allowed venues list for this league",
          affectedEntities: {
            venueId: game.venueId,
          },
          suggestion: "Choose a venue from the allowed venues list",
        });
        return conflicts; // Don't check further if venue not allowed
      }
    }

    // Get venue availability
    const venueAvailability = await this.getVenueAvailability(
      game.venueId,
      game.leagueId,
      game.seasonId,
      game.id
    );

    // Check for overlapping bookings
    const gameStart = game.scheduledAt;
    const gameEnd = addMinutes(gameStart, rules.gameDurationMinutes + rules.bufferMinutes);

    const overlappingBookings = venueAvailability.bookedWindows.filter((window) =>
      this.timeWindowsOverlap(gameStart, gameEnd, window.start, window.end)
    );

    if (overlappingBookings.length > 0) {
      conflicts.push({
        type: "venue_overlap",
        severity: "error",
        message: `Venue is already booked at this time (game at ${format(
          overlappingBookings[0].start,
          "h:mm a"
        )})`,
        affectedEntities: {
          venueId: game.venueId,
          gameIds: overlappingBookings.map((b) => b.gameId),
        },
        suggestion: "Choose a different time slot or venue",
      });
    }

    return conflicts;
  }

  /**
   * Check for scorekeeper conflicts (double-booking)
   */
  private async checkScorekeeperConflicts(
    game: GameForConflictCheck,
    rules: ScheduleRules
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];

    if (!game.scorekeeperId) {
      return conflicts; // No scorekeeper assigned, no conflicts
    }

    // Get scorekeeper availability
    const scorekeeperAvailability = await this.getScorekeeperAvailability(
      game.scorekeeperId,
      game.leagueId,
      game.seasonId,
      game.id
    );

    // Check for overlapping bookings
    const gameStart = game.scheduledAt;
    const gameEnd = addMinutes(gameStart, rules.gameDurationMinutes);

    const overlappingBookings = scorekeeperAvailability.bookedWindows.filter((window) =>
      this.timeWindowsOverlap(gameStart, gameEnd, window.start, window.end)
    );

    if (overlappingBookings.length > 0) {
      conflicts.push({
        type: "scorekeeper_overlap",
        severity: "warning",
        message: `Scorekeeper is already assigned to another game at ${format(
          overlappingBookings[0].start,
          "h:mm a"
        )}`,
        affectedEntities: {
          scorekeeperId: game.scorekeeperId,
          gameIds: overlappingBookings.map((b) => b.gameId),
        },
        suggestion: "Assign a different scorekeeper or adjust the time",
      });
    }

    return conflicts;
  }

  /**
   * Check schedule rule violations
   * - Blackout dates
   * - Preferred time windows
   */
  private async checkScheduleRuleConflicts(
    game: GameForConflictCheck,
    rules: ScheduleRules
  ): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];

    // Check blackout dates
    const gameDate = format(game.scheduledAt, "yyyy-MM-dd");
    const blackoutDate = rules.blackoutDates.find((bd) => bd.date === gameDate);

    if (blackoutDate) {
      conflicts.push({
        type: "blackout_date",
        severity: "error",
        message: `Cannot schedule game on blackout date: ${blackoutDate.reason}`,
        affectedEntities: {},
        suggestion: "Choose a different date",
      });
    }

    // Check preferred time windows (warning only)
    if (rules.preferredStartTimes && rules.preferredStartTimes.length > 0) {
      const dayOfWeek = format(game.scheduledAt, "EEEE").toLowerCase();
      const gameTime = format(game.scheduledAt, "HH:mm");

      const preferredWindow = rules.preferredStartTimes.find(
        (window) => window.day === dayOfWeek
      );

      if (preferredWindow) {
        const isInWindow =
          gameTime >= preferredWindow.start && gameTime <= preferredWindow.end;

        if (!isInWindow) {
          conflicts.push({
            type: "invalid_time_window",
            severity: "info",
            message: `Game is outside preferred time window (${preferredWindow.start} - ${preferredWindow.end})`,
            affectedEntities: {},
            suggestion: `Schedule games between ${preferredWindow.start} and ${preferredWindow.end} on ${dayOfWeek}s`,
          });
        }
      }
    }

    return conflicts;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get team's schedule for conflict checking
   */
  private async getTeamSchedule(
    teamId: string,
    leagueId: string,
    seasonId?: string,
    excludeGameId?: string
  ): Promise<TeamScheduleSummary> {
    let query = this.supabase
      .from("games")
      .select("id, scheduled_at, home_team_id, away_team_id")
      .eq("league_id", leagueId)
      .in("status", ["scheduled", "in_progress"])
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    if (excludeGameId) {
      query = query.neq("id", excludeGameId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch team schedule: ${error.message}`);
    }

    return {
      teamId,
      games: (data || []).map((game) => ({
        id: game.id,
        scheduledAt: new Date(game.scheduled_at),
        opponentId:
          game.home_team_id === teamId ? game.away_team_id : game.home_team_id,
        isHome: game.home_team_id === teamId,
      })),
    };
  }

  /**
   * Get venue availability (booked time windows)
   */
  private async getVenueAvailability(
    venueId: string,
    leagueId: string,
    seasonId?: string,
    excludeGameId?: string
  ): Promise<VenueAvailability> {
    let query = this.supabase
      .from("games")
      .select("id, scheduled_at")
      .eq("venue_id", venueId)
      .eq("league_id", leagueId)
      .in("status", ["scheduled", "in_progress"]);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    if (excludeGameId) {
      query = query.neq("id", excludeGameId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch venue availability: ${error.message}`);
    }

    // Get schedule rules to calculate game duration
    const rulesResult = await this.getScheduleRules(leagueId, seasonId);
    const gameDuration = rulesResult?.gameDurationMinutes || 60;
    const buffer = rulesResult?.bufferMinutes || 15;

    return {
      venueId,
      bookedWindows: (data || []).map((game) => {
        const start = new Date(game.scheduled_at);
        const end = addMinutes(start, gameDuration + buffer);
        return {
          gameId: game.id,
          start,
          end,
        };
      }),
    };
  }

  /**
   * Get scorekeeper availability (booked time windows)
   */
  private async getScorekeeperAvailability(
    scorekeeperId: string,
    leagueId: string,
    seasonId?: string,
    excludeGameId?: string
  ): Promise<ScorekeeperAvailability> {
    let query = this.supabase
      .from("games")
      .select("id, scheduled_at")
      .eq("scorekeeper_id", scorekeeperId)
      .eq("league_id", leagueId)
      .in("status", ["scheduled", "in_progress"]);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }

    if (excludeGameId) {
      query = query.neq("id", excludeGameId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch scorekeeper availability: ${error.message}`);
    }

    // Get schedule rules to calculate game duration
    const rulesResult = await this.getScheduleRules(leagueId, seasonId);
    const gameDuration = rulesResult?.gameDurationMinutes || 60;

    return {
      scorekeeperId,
      bookedWindows: (data || []).map((game) => {
        const start = new Date(game.scheduled_at);
        const end = addMinutes(start, gameDuration);
        return {
          gameId: game.id,
          start,
          end,
        };
      }),
    };
  }

  /**
   * Get schedule rules for a league/season
   */
  private async getScheduleRules(
    leagueId: string,
    seasonId?: string
  ): Promise<ScheduleRules | null> {
    let query = this.supabase
      .from("schedule_rules")
      .select("*")
      .eq("league_id", leagueId);

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    } else {
      query = query.is("season_id", null);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      leagueId: data.league_id,
      seasonId: data.season_id,
      gameDurationMinutes: data.game_duration_minutes,
      bufferMinutes: data.buffer_minutes,
      minHoursBetweenGames: data.min_hours_between_games,
      maxGamesPerWeek: data.max_games_per_week,
      maxGamesPerDay: data.max_games_per_day,
      allowedVenueIds: data.allowed_venue_ids,
      blackoutDates: data.blackout_dates || [],
      preferredStartTimes: data.preferred_start_times || [],
    };
  }

  /**
   * Find overlapping games in team schedule
   */
  private findOverlappingGames(
    scheduledAt: Date,
    gameDurationMinutes: number,
    teamGames: TeamScheduleSummary["games"]
  ): TeamScheduleSummary["games"] {
    const gameEnd = addMinutes(scheduledAt, gameDurationMinutes);

    return teamGames.filter((game) => {
      const otherGameEnd = addMinutes(game.scheduledAt, gameDurationMinutes);
      return this.timeWindowsOverlap(
        scheduledAt,
        gameEnd,
        game.scheduledAt,
        otherGameEnd
      );
    });
  }

  /**
   * Find back-to-back violations
   */
  private findBackToBackViolations(
    scheduledAt: Date,
    minHoursBetween: number,
    teamGames: TeamScheduleSummary["games"]
  ): TeamScheduleSummary["games"] {
    return teamGames.filter((game) => {
      const hoursBetween = Math.abs(
        differenceInHours(scheduledAt, game.scheduledAt)
      );
      return hoursBetween < minHoursBetween && hoursBetween > 0;
    });
  }

  /**
   * Count games on same day
   */
  private countGamesOnSameDay(
    scheduledAt: Date,
    teamGames: TeamScheduleSummary["games"]
  ): number {
    const targetDate = format(scheduledAt, "yyyy-MM-dd");
    return teamGames.filter((game) => {
      const gameDate = format(game.scheduledAt, "yyyy-MM-dd");
      return gameDate === targetDate;
    }).length;
  }

  /**
   * Count games in same week
   */
  private countGamesInWeek(
    scheduledAt: Date,
    teamGames: TeamScheduleSummary["games"]
  ): number {
    const weekStart = startOfWeek(scheduledAt);
    const weekEnd = endOfWeek(scheduledAt);

    return teamGames.filter((game) =>
      isWithinInterval(game.scheduledAt, { start: weekStart, end: weekEnd })
    ).length;
  }

  /**
   * Check if two time windows overlap
   */
  private timeWindowsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}
