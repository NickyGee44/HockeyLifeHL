/**
 * Reschedule Game API
 *
 * POST /api/[tenant]/games/[gameId]/reschedule
 *
 * Reschedules a game to a new date/time with conflict validation.
 *
 * Flow:
 * 1. Validate user is league admin
 * 2. Load game and schedule rules
 * 3. Run conflict detection on new proposed time
 * 4. If conflicts with severity='error', return 409 with details
 * 5. In SERIALIZABLE transaction:
 *    a. Mark original game as 'postponed' (optimistic lock on status='scheduled')
 *    b. Create new game record with rescheduled_from pointer
 * 6. Return new game ID and any warnings
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireLeagueAdmin } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";
import { ConflictDetectionService } from "@/lib/games/conflict-detection.service";
import type { SchedulingConflict, ScheduleRules } from "@/lib/games/conflict-detection.types";
import { emitGameRescheduled } from "@/lib/events";

/**
 * Request body schema
 */
interface RescheduleRequest {
  newScheduledAt: string; // ISO 8601 date string
  reason: string;
  venueId?: string; // Optional: change venue during reschedule
  scorekeeperId?: string; // Optional: change scorekeeper
}

/**
 * Response schema
 */
interface RescheduleResponse {
  success: boolean;
  newGameId?: string;
  conflicts?: SchedulingConflict[];
  warnings?: SchedulingConflict[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; gameId: string }> }
) {
  try {
    // 1. Parse request body
    const body: RescheduleRequest = await request.json();
    const { newScheduledAt, reason, venueId, scorekeeperId } = body;

    // Validate required fields
    if (!newScheduledAt || !reason) {
      throw ErrorResponses.badRequest("newScheduledAt and reason are required");
    }

    // Validate date format
    const newDate = new Date(newScheduledAt);
    if (isNaN(newDate.getTime())) {
      throw ErrorResponses.badRequest("Invalid date format for newScheduledAt");
    }

    // Don't allow rescheduling to the past
    if (newDate < new Date()) {
      throw ErrorResponses.badRequest("Cannot reschedule game to a past date");
    }

    // 2. Authenticate and authorize
    const { tenant, gameId } = await params;

    const tenantAccess = await validateTenantAccess(tenant, ""); // Will be validated by requireLeagueAdmin
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;
    const { userId } = await requireLeagueAdmin(leagueId);

    const supabase = await createClient();

    // 3. Fetch original game
    const { data: originalGame, error: gameError } = (await supabase
      .from("games")
      .select("id, status, season_id, home_team_id, away_team_id, location, league_id, scheduled_at, rescheduled_from, reschedule_reason, rescheduled_at, rescheduled_by, cancelled_at, cancelled_by, cancellation_reason")
      .eq("id", gameId)
      .eq("league_id", leagueId)
      .single()) as any;

    if (gameError || !originalGame) {
      throw ErrorResponses.notFound("Game");
    }

    // 4. Validate game can be rescheduled
    if (originalGame.status === "completed") {
      throw ErrorResponses.gameNotReschedulable("Game is already completed");
    }

    if (originalGame.status === "cancelled") {
      throw ErrorResponses.gameNotReschedulable("Game is cancelled");
    }

    if (originalGame.status !== "scheduled") {
      throw ErrorResponses.gameNotReschedulable(
        `Game status must be 'scheduled' (current: ${originalGame.status})`
      );
    }

    // 5. Fetch schedule rules for conflict detection
    const scheduleRulesResult: any = await supabase
      .from("schedule_rules")
      .select("id, league_id, season_id, game_duration_minutes, buffer_minutes, min_hours_between_games, max_games_per_week, max_games_per_day, allowed_venue_ids, blackout_dates, preferred_start_times")
      .eq("league_id", leagueId)
      .or(`season_id.eq.${originalGame.season_id},season_id.is.null`)
      .order("season_id", { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    const scheduleRules = scheduleRulesResult.data;

    if (!scheduleRules) {
      throw ErrorResponses.badRequest("Schedule rules not configured for this league");
    }

    // Transform schedule rules to expected format
    const rules: ScheduleRules = {
      id: scheduleRules.id,
      leagueId: scheduleRules.league_id,
      seasonId: scheduleRules.season_id,
      gameDurationMinutes: scheduleRules.game_duration_minutes,
      bufferMinutes: scheduleRules.buffer_minutes,
      minHoursBetweenGames: scheduleRules.min_hours_between_games,
      maxGamesPerWeek: scheduleRules.max_games_per_week,
      maxGamesPerDay: scheduleRules.max_games_per_day,
      allowedVenueIds: scheduleRules.allowed_venue_ids,
      blackoutDates: scheduleRules.blackout_dates || [],
      preferredStartTimes: scheduleRules.preferred_start_times || [],
    };

    // 6. Run conflict detection on new game time
    const conflictService = new ConflictDetectionService(supabase);

    const newGameData = {
      id: undefined, // New game, no ID yet
      homeTeamId: originalGame.home_team_id,
      awayTeamId: originalGame.away_team_id,
      venueId: venueId, // Optional venue ID
      scorekeeperId: scorekeeperId, // Optional scorekeeper ID
      scheduledAt: newDate,
      status: "scheduled" as const,
      leagueId: originalGame.league_id,
      seasonId: originalGame.season_id,
      divisionId: undefined, // Division ID may not be on games table yet
    };

    const conflictResult = await conflictService.checkGameConflicts(newGameData, rules);

    // 7. Check for blocking conflicts (severity='error')
    const errorConflicts = conflictResult.conflicts.filter((c) => c.severity === "error");
    const warningConflicts = conflictResult.conflicts.filter((c) => c.severity === "warning");

    if (errorConflicts.length > 0) {
      // Return 409 with conflict details - do not proceed with reschedule
      return NextResponse.json(
        {
          success: false,
          conflicts: errorConflicts,
          warnings: warningConflicts,
        } as RescheduleResponse,
        { status: 409 }
      );
    }

    // 8. Execute reschedule in transaction
    // Note: Supabase client doesn't support explicit transactions via JS SDK
    // We use optimistic locking pattern with status check in WHERE clause
    // For true SERIALIZABLE isolation, would need to use postgres connection pool

    // Step 8a: Mark original game as postponed (optimistic lock)
    const { data: postponedGame, error: postponeError } = await supabase
      .from("games")
      .update({
        status: "postponed",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
      })
      .eq("id", gameId)
      .eq("league_id", leagueId)
      .eq("status", "scheduled") // Optimistic lock - only update if still scheduled
      .select()
      .single();

    if (postponeError || !postponedGame) {
      // Game was already modified by another request
      throw ErrorResponses.conflict(
        "Game was modified by another user. Please refresh and try again."
      );
    }

    // Step 8b: Create new game
    const { data: newGame, error: createError } = (await supabase
      .from("games")
      .insert({
        league_id: originalGame.league_id,
        season_id: originalGame.season_id,
        home_team_id: originalGame.home_team_id,
        away_team_id: originalGame.away_team_id,
        location: originalGame.location, // Use location (TEXT) instead of venue_id
        scheduled_at: newDate.toISOString(),
        status: "scheduled",
        rescheduled_from: originalGame.id,
        reschedule_reason: reason,
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: userId,
      })
      .select()
      .single()) as any;

    if (createError || !newGame) {
      console.error("[Reschedule API] Failed to create new game:", createError);

      // Attempt to rollback - restore original game status
      await supabase
        .from("games")
        .update({
          status: "scheduled",
          cancelled_at: null,
          cancelled_by: null,
          cancellation_reason: null,
        })
        .eq("id", gameId);

      throw new Error("Failed to create rescheduled game. Transaction aborted.");
    }

    // 9. Fetch team names, venue name, and division name for notification
    const { data: gameDetails, error: detailsError } = await supabase
      .from("games")
      .select(
        `
        id,
        scheduled_at,
        home_team:home_team_id(id, name),
        away_team:away_team_id(id, name),
        venue:venue_id(id, name),
        division:division_id(id, name)
      `
      )
      .eq("id", newGame.id)
      .single();

    if (!detailsError && gameDetails) {
      // 10. Emit GameRescheduled event for notification system
      try {
        // Type assertion for Supabase query with column hints
        const details = gameDetails as any;

        emitGameRescheduled(
          {
            leagueId: leagueId,
            userId: userId,
            source: `POST /api/${tenant}/games/${gameId}/reschedule`,
          },
          {
            gameId: newGame.id,
            oldScheduledAt: originalGame.scheduled_at,
            newScheduledAt: newGame.scheduled_at,
            reason: reason,
            homeTeamId: details.home_team.id,
            awayTeamId: details.away_team.id,
            homeTeamName: details.home_team.name,
            awayTeamName: details.away_team.name,
            venueName: details.venue?.name || originalGame.location || "TBD",
            divisionName: details.division?.name || "TBD",
          }
        );
      } catch (eventError) {
        // Don't fail the API request if event emission fails
        console.error("[Reschedule API] Failed to emit event:", eventError);
      }
    }

    // 11. Success - return new game ID and any warnings
    return NextResponse.json({
      success: true,
      newGameId: newGame.id,
      warnings: warningConflicts.length > 0 ? warningConflicts : undefined,
    } as RescheduleResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
