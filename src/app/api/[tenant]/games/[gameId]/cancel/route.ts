/**
 * Cancel Game API
 *
 * POST /api/[tenant]/games/[gameId]/cancel
 *
 * Permanently cancels a game (cannot be undone).
 * Unlike reschedule, cancellation does not create a new game.
 *
 * Valid status transitions:
 * - scheduled → cancelled
 * - postponed → cancelled
 *
 * Invalid transitions:
 * - completed → cancelled (cannot cancel finished games)
 * - cancelled → cancelled (idempotent, but no-op)
 *
 * Audit trail:
 * - cancelled_at: timestamp (auto-set by trigger if not provided)
 * - cancelled_by: user_id (auto-set by trigger if not provided)
 * - cancellation_reason: required reason (e.g., 'weather', 'venue_unavailable', 'other')
 * - cancellation_notes: optional additional details
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireLeagueAdmin } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";
import { emitGameCancelled } from "@/lib/events";

/**
 * Request body schema
 */
interface CancelGameRequest {
  reason: string; // Required: reason for cancellation
  notes?: string; // Optional: additional details
}

/**
 * Response schema
 */
interface CancelGameResponse {
  success: boolean;
  gameId: string;
  status: string;
  cancelledAt: string;
}

/**
 * Valid cancellation reasons
 */
const VALID_REASONS = [
  "weather",
  "venue_unavailable",
  "team_forfeit",
  "insufficient_players",
  "emergency",
  "other",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; gameId: string }> }
) {
  try {
    // 1. Parse request body
    const body: CancelGameRequest = await request.json();
    const { reason, notes } = body;

    // Validate required fields
    if (!reason || reason.trim().length === 0) {
      throw ErrorResponses.badRequest("reason is required");
    }

    // Optional: validate reason is one of predefined values
    // Commented out to allow custom reasons, but keeping validation logic for reference
    // if (!VALID_REASONS.includes(reason)) {
    //   throw ErrorResponses.badRequest(
    //     `reason must be one of: ${VALID_REASONS.join(', ')}`
    //   );
    // }

    // 2. Authenticate and authorize
    const { tenant, gameId } = await params;

    const tenantAccess = await validateTenantAccess(tenant, "");
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;
    const { userId } = await requireLeagueAdmin(leagueId);

    const supabase = await createClient();

    // 3. Fetch game to validate it exists and can be cancelled
    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("id, status, scheduled_at")
      .eq("id", gameId)
      .eq("league_id", leagueId)
      .single();

    if (fetchError || !game) {
      throw ErrorResponses.notFound("Game");
    }

    // 4. Validate game can be cancelled
    if (game.status === "completed") {
      throw ErrorResponses.badRequest("Cannot cancel a completed game");
    }

    if (game.status === "cancelled") {
      // Game already cancelled - idempotent response
      return NextResponse.json({
        success: true,
        gameId: game.id,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      } as CancelGameResponse);
    }

    // Valid statuses to cancel: 'scheduled', 'postponed'
    if (!["scheduled", "postponed"].includes(game.status)) {
      throw ErrorResponses.badRequest(
        `Cannot cancel game with status '${game.status}'. Only scheduled or postponed games can be cancelled.`
      );
    }

    // 5. Cancel the game
    // Note: The database trigger auto_set_cancellation_timestamp() will set:
    // - cancelled_at to NOW() if not provided
    // - cancelled_by to auth.uid() if not provided
    // We explicitly set them here for clarity and to override if needed
    const { data: cancelledGame, error: cancelError } = await supabase
      .from("games")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason: reason,
        cancellation_notes: notes || null,
      })
      .eq("id", gameId)
      .eq("league_id", leagueId)
      .in("status", ["scheduled", "postponed"]) // Double-check status hasn't changed
      .select("id, status, cancelled_at")
      .single();

    if (cancelError || !cancelledGame) {
      // Game was likely modified concurrently
      if (cancelError?.code === "PGRST116") {
        // No rows returned - game status changed
        throw ErrorResponses.conflict(
          "Game was modified by another user. Please refresh and try again."
        );
      }

      console.error("[Cancel Game API] Update error:", cancelError);
      throw new Error(`Failed to cancel game: ${cancelError?.message || "Unknown error"}`);
    }

    // 6. Fetch game details for notification
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
      .eq("id", gameId)
      .single();

    if (!detailsError && gameDetails) {
      // 7. Emit GameCancelled event for notification system
      try {
        // Determine if game will be rescheduled (postponed) or permanently cancelled
        const willReschedule = game.status === "postponed";

        // Type assertion for Supabase query with column hints
        const details = gameDetails as any;

        emitGameCancelled(
          {
            leagueId: leagueId,
            userId: userId,
            source: `POST /api/${tenant}/games/${gameId}/cancel`,
          },
          {
            gameId: gameId,
            scheduledAt: details.scheduled_at,
            reason: reason,
            willReschedule: willReschedule,
            homeTeamId: details.home_team.id,
            awayTeamId: details.away_team.id,
            homeTeamName: details.home_team.name,
            awayTeamName: details.away_team.name,
            venueName: details.venue?.name || "TBD",
            divisionName: details.division?.name || "TBD",
            notes: notes,
          }
        );
      } catch (eventError) {
        // Don't fail the API request if event emission fails
        console.error("[Cancel Game API] Failed to emit event:", eventError);
      }
    }

    // 8. Success
    console.log(`[Cancel Game API] Successfully cancelled game ${gameId} for league ${leagueId}`);

    return NextResponse.json({
      success: true,
      gameId: cancelledGame.id,
      status: cancelledGame.status,
      cancelledAt: cancelledGame.cancelled_at,
    } as CancelGameResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
