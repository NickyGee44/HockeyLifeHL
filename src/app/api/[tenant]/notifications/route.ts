/**
 * Notifications API
 *
 * GET /api/[tenant]/notifications
 *
 * List notifications with filtering options.
 * Supports filtering by status, type, related entity, and date range.
 *
 * Query Parameters:
 * - status: pending | sent | failed | bounced
 * - type: game_rescheduled | game_cancelled | score_submitted | payment_due, etc.
 * - related_entity_type: game | invoice | team | player
 * - related_entity_id: UUID
 * - limit: number (default 50, max 200)
 * - offset: number (default 0)
 *
 * Access Control:
 * - League admins can view all notifications for their league
 * - Users can view their own notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireLeagueAdmin } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";

/**
 * Response schema
 */
interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    channel: string;
    status: string;
    subject?: string;
    body: string;
    recipient_email?: string;
    recipient_name?: string;
    sent_at?: string;
    failed_at?: string;
    failure_reason?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    created_at: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    // 1. Authenticate and authorize
    const { tenant } = await params;

    const tenantAccess = await validateTenantAccess(tenant, "");
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;

    // Require league admin to view notification log
    await requireLeagueAdmin(leagueId);

    const supabase = await createClient();

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const relatedEntityType = searchParams.get("related_entity_type");
    const relatedEntityId = searchParams.get("related_entity_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    // 3. Build query
    let query = supabase
      // @ts-ignore
      .from("notifications")
      .select(
        `
        id,
        type,
        channel,
        status,
        subject,
        body,
        sent_at,
        failed_at,
        failure_reason,
        related_entity_type,
        related_entity_id,
        created_at,
        user:user_id(id, email, full_name)
      `,
        { count: "exact" }
      )
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (relatedEntityType) {
      query = query.eq("related_entity_type", relatedEntityType);
    }

    if (relatedEntityId) {
      query = query.eq("related_entity_id", relatedEntityId);
    }

    // 4. Execute query
    const { data: notifications, error, count } = await query;

    if (error) {
      console.error("[Notifications API] Database error:", error);
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    // 5. Transform response
    const transformedNotifications = (notifications || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      channel: n.channel,
      status: n.status,
      subject: n.subject,
      body: n.body,
      recipient_email: n.user?.email,
      recipient_name: n.user?.full_name,
      sent_at: n.sent_at,
      failed_at: n.failed_at,
      failure_reason: n.failure_reason,
      related_entity_type: n.related_entity_type,
      related_entity_id: n.related_entity_id,
      created_at: n.created_at,
    }));

    // 6. Return response
    return NextResponse.json({
      notifications: transformedNotifications,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    } as NotificationsResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
