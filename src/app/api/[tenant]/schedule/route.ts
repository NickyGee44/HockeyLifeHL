/**
 * Schedule Query API
 *
 * GET /api/[tenant]/schedule
 *
 * Multi-tenant endpoint for querying game schedules with filtering and pagination.
 * Supports filtering by division, team, venue, date range, and status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess, isLeagueAdmin } from "@/lib/api/tenant-validation";
import { requireAuth } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";

/**
 * Game response type
 */
interface GameResponse {
  id: string;
  scheduledAt: string;
  status: string;
  homeTeam: {
    id: string;
    name: string;
    logoUrl: string | null;
    score?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    logoUrl: string | null;
    score?: number;
  };
  venue: {
    id: string;
    name: string;
  };
  division?: {
    id: string;
    name: string;
  };
  hasConflicts?: boolean; // Admin-only view
}

/**
 * Query parameters interface
 */
interface ScheduleQueryParams {
  division_id?: string;
  team_id?: string;
  venue_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    // 1. Authenticate user
    const { userId } = await requireAuth();

    // 2. Resolve tenant slug
    const { tenant } = await params;

    // 3. Validate tenant access
    const tenantAccess = await validateTenantAccess(tenant, userId);
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;

    // 4. Check if user is admin (to include conflict indicators)
    const userIsAdmin = await isLeagueAdmin(leagueId, userId);

    // 5. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const divisionId = searchParams.get("division_id") || undefined;
    const teamId = searchParams.get("team_id") || undefined;
    const venueId = searchParams.get("venue_id") || undefined;
    const startDate = searchParams.get("start_date") || undefined;
    const endDate = searchParams.get("end_date") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate parameters
    if (limit < 1 || limit > 100) {
      throw ErrorResponses.badRequest("Limit must be between 1 and 100");
    }

    if (offset < 0) {
      throw ErrorResponses.badRequest("Offset must be non-negative");
    }

    if (status && !["scheduled", "in_progress", "completed", "cancelled", "postponed"].includes(status)) {
      throw ErrorResponses.badRequest("Invalid status value");
    }

    // 6. Build query
    const supabase = await createClient();

    // Base query - select games with joined data
    let query = supabase
      .from("games")
      .select(
        `
        id,
        scheduled_at,
        status,
        home_score,
        away_score,
        home_team:teams!games_home_team_id_fkey(id, name, logo_url),
        away_team:teams!games_away_team_id_fkey(id, name, logo_url),
        venue:venues(id, name),
        division:divisions(id, name)
      `,
        { count: "exact" }
      )
      .eq("league_id", leagueId);

    // Apply filters
    if (divisionId) {
      query = query.eq("division_id", divisionId);
    }

    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`);
    }

    if (venueId) {
      query = query.eq("venue_id", venueId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("scheduled_at", startDate);
    }

    if (endDate) {
      query = query.lte("scheduled_at", endDate);
    }

    // Order by scheduled_at ascending
    query = query.order("scheduled_at", { ascending: true });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: games, error, count } = await query;

    if (error) {
      console.error("[Schedule API] Database error:", error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    // 7. Transform response
    const gamesResponse: GameResponse[] = (games || []).map((game: any) => ({
      id: game.id,
      scheduledAt: game.scheduled_at,
      status: game.status,
      homeTeam: {
        id: game.home_team.id,
        name: game.home_team.name,
        logoUrl: game.home_team.logo_url,
        score: game.home_score,
      },
      awayTeam: {
        id: game.away_team.id,
        name: game.away_team.name,
        logoUrl: game.away_team.logo_url,
        score: game.away_score,
      },
      venue: {
        id: game.venue.id,
        name: game.venue.name,
      },
      division: game.division
        ? {
            id: game.division.id,
            name: game.division.name,
          }
        : undefined,
      // Admin-only: include conflict indicators (stub for now, requires conflict check)
      hasConflicts: userIsAdmin ? false : undefined,
    }));

    // 8. Return response
    return NextResponse.json({
      games: gamesResponse,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
