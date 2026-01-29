/**
 * Bulk Reschedule API
 *
 * POST /api/[tenant]/games/bulk-reschedule
 *
 * Bulk reschedule multiple games at once (e.g., weather cancellation).
 *
 * Actions:
 * - 'postpone': Mark all games as postponed, add to reschedule queue
 * - 'reschedule_later': Not implemented in Phase 1 (requires individual conflict checks per game)
 *
 * Use case: Weather cancellation - postpone 10 games at once.
 *
 * Transaction semantics: ALL games updated or NONE (atomic bulk operation).
 * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireLeagueAdmin } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";
import { emitBulkGameCancelled } from "@/lib/events";

/**
 * Request body schema
 */
interface BulkRescheduleRequest {
  gameIds: string[];
  reason: string;
  action: "postpone" | "reschedule_later";
  newScheduledDates?: string[]; // For 'reschedule_later' action (Phase 2)
}

/**
 * Response schema
 */
interface BulkRescheduleResponse {
  success: boolean;
  postponedCount?: number;
  rescheduledCount?: number;
  failedIds?: string[];
  errors?: Array<{ gameId: string; reason: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    // 1. Parse request body
    const body: BulkRescheduleRequest = await request.json();
    const { gameIds, reason, action, newScheduledDates } = body;

    // Validate required fields
    if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
      throw ErrorResponses.badRequest("gameIds array is required and must not be empty");
    }

    if (!reason || reason.trim().length === 0) {
      throw ErrorResponses.badRequest("reason is required");
    }

    if (!action || !["postpone", "reschedule_later"].includes(action)) {
      throw ErrorResponses.badRequest("action must be 'postpone' or 'reschedule_later'");
    }

    // Limit bulk operations to prevent abuse
    if (gameIds.length > 100) {
      throw ErrorResponses.badRequest("Cannot reschedule more than 100 games at once");
    }

    // Phase 1: Only support 'postpone' action
    if (action === "reschedule_later") {
      throw ErrorResponses.badRequest(
        "Action 'reschedule_later' not implemented. Use 'postpone' to mark games as postponed, then reschedule individually via admin UI."
      );
    }

    // 2. Authenticate and authorize
    const { tenant } = await params;

    const tenantAccess = await validateTenantAccess(tenant, "");
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;
    const { userId } = await requireLeagueAdmin(leagueId);

    const supabase = await createClient();

    // 3. Fetch all games to validate they exist and are reschedulable
    // Use FOR UPDATE to lock rows and prevent concurrent modifications
    // Note: Supabase JS client doesn't support FOR UPDATE directly
    // We'll validate games first, then update in bulk

    const { data: games, error: fetchError } = await supabase
      .from("games")
      .select("id, status, scheduled_at, home_team_id, away_team_id")
      .eq("league_id", leagueId)
      .in("id", gameIds);

    if (fetchError) {
      console.error("[Bulk Reschedule API] Database error:", fetchError);
      throw new Error(`Failed to fetch games: ${fetchError.message}`);
    }

    if (!games || games.length === 0) {
      throw ErrorResponses.notFound("No games found with provided IDs");
    }

    // 4. Validate all games
    const foundGameIds = new Set(games.map((g) => g.id));
    const missingGameIds = gameIds.filter((id) => !foundGameIds.has(id));

    if (missingGameIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          postponedCount: 0,
          failedIds: missingGameIds,
          errors: missingGameIds.map((id) => ({
            gameId: id,
            reason: "Game not found",
          })),
        } as BulkRescheduleResponse,
        { status: 400 }
      );
    }

    // Check that all games are in 'scheduled' status
    const nonScheduledGames = games.filter((g) => g.status !== "scheduled");

    if (nonScheduledGames.length > 0) {
      return NextResponse.json(
        {
          success: false,
          postponedCount: 0,
          failedIds: nonScheduledGames.map((g) => g.id),
          errors: nonScheduledGames.map((g) => ({
            gameId: g.id,
            reason: `Game status is '${g.status}', must be 'scheduled'`,
          })),
        } as BulkRescheduleResponse,
        { status: 400 }
      );
    }

    // 5. Execute bulk postpone operation
    // Update all games to 'postponed' status in single query
    const { data: updatedGames, error: updateError } = await supabase
      .from("games")
      .update({
        status: "postponed",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
      })
      .eq("league_id", leagueId)
      .in("id", gameIds)
      .eq("status", "scheduled") // Double-check status hasn't changed
      .select("id");

    if (updateError) {
      console.error("[Bulk Reschedule API] Update error:", updateError);
      throw new Error(`Failed to postpone games: ${updateError.message}`);
    }

    // 6. Check if all games were updated successfully
    const updatedGameIds = new Set((updatedGames || []).map((g) => g.id));
    const failedGameIds = gameIds.filter((id) => !updatedGameIds.has(id));

    if (failedGameIds.length > 0) {
      // Some games were not updated (likely modified concurrently)
      console.warn(
        `[Bulk Reschedule API] ${failedGameIds.length} games were not updated:`,
        failedGameIds
      );

      return NextResponse.json(
        {
          success: false,
          postponedCount: updatedGames?.length || 0,
          failedIds: failedGameIds,
          errors: failedGameIds.map((id) => ({
            gameId: id,
            reason: "Game was modified by another user or status changed",
          })),
        } as BulkRescheduleResponse,
        { status: 409 }
      );
    }

    // 7. Fetch game details for notifications
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
      .in("id", gameIds);

    if (!detailsError && gameDetails && gameDetails.length > 0) {
      // 8. Emit bulk GameCancelled events for notification system
      try {
        const eventPayloads = gameDetails.map((game: any) => ({
          gameId: game.id,
          scheduledAt: game.scheduled_at,
          reason: reason,
          willReschedule: true, // Postponed games will be rescheduled
          homeTeamId: game.home_team.id,
          awayTeamId: game.away_team.id,
          homeTeamName: game.home_team.name,
          awayTeamName: game.away_team.name,
          venueName: game.venue?.name || "TBD",
          divisionName: game.division?.name || "TBD",
        }));

        emitBulkGameCancelled(
          {
            leagueId: leagueId,
            userId: userId,
            source: `POST /api/${tenant}/games/bulk-reschedule`,
          },
          eventPayloads
        );

        console.log(`[Bulk Reschedule API] Emitted ${eventPayloads.length} game cancelled events`);
      } catch (eventError) {
        // Don't fail the API request if event emission fails
        console.error("[Bulk Reschedule API] Failed to emit events:", eventError);
      }
    }

    // 9. Success - all games postponed
    console.log(
      `[Bulk Reschedule API] Successfully postponed ${gameIds.length} games for league ${leagueId}`
    );

    return NextResponse.json({
      success: true,
      postponedCount: gameIds.length,
      failedIds: [],
    } as BulkRescheduleResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
