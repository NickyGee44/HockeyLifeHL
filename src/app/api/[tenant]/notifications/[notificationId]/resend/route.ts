/**
 * Resend Notification API
 *
 * POST /api/[tenant]/notifications/[notificationId]/resend
 *
 * Manually resend a notification (typically used for failed notifications).
 *
 * Process:
 * 1. Fetch notification record
 * 2. Validate it can be resent (status=failed or status=bounced)
 * 3. Render email from template data
 * 4. Send email via Resend
 * 5. Update notification status
 *
 * Access Control:
 * - League admins only
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateTenantAccess } from "@/lib/api/tenant-validation";
import { requireLeagueAdmin } from "@/lib/api/auth";
import { handleApiError, ErrorResponses } from "@/lib/api/error-handling";

/**
 * Response schema
 */
interface ResendNotificationResponse {
  success: boolean;
  notificationId: string;
  status: string;
  sentAt?: string;
}

/**
 * Send email via Resend API
 */
async function sendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@beerleaguehockey.ca";

  if (!RESEND_API_KEY) {
    console.error("[Resend Notification API] RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Resend Notification API] Resend API error:", error);
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("[Resend Notification API] Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; notificationId: string }> }
) {
  try {
    // 1. Authenticate and authorize
    const { tenant, notificationId } = await params;

    const tenantAccess = await validateTenantAccess(tenant, "");
    if (!tenantAccess) {
      throw ErrorResponses.invalidTenant();
    }

    const { leagueId } = tenantAccess;
    const { userId } = await requireLeagueAdmin(leagueId);

    const supabase = await createClient();

    // 2. Fetch notification
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select(
        `
        id,
        type,
        channel,
        status,
        subject,
        body,
        user:user_id(id, email, full_name)
      `
      )
      .eq("id", notificationId)
      .eq("league_id", leagueId)
      .single();

    if (fetchError || !notification) {
      throw ErrorResponses.notFound("Notification");
    }

    // 3. Validate notification can be resent
    if (notification.status === "sent") {
      throw ErrorResponses.badRequest(
        "Cannot resend a notification that was already sent successfully"
      );
    }

    if (!["failed", "bounced", "pending"].includes(notification.status)) {
      throw ErrorResponses.badRequest(
        `Cannot resend notification with status '${notification.status}'`
      );
    }

    // 4. Validate email channel (SMS/push not supported yet)
    if (notification.channel !== "email") {
      throw ErrorResponses.badRequest(`Channel '${notification.channel}' not supported for resend`);
    }

    // 5. Get recipient email
    const recipientEmail = notification.user?.email;
    if (!recipientEmail) {
      throw ErrorResponses.badRequest("Recipient email not found");
    }

    // 6. Send email
    const result = await sendEmail({
      to: recipientEmail,
      subject: notification.subject || "Notification from Hockey League",
      html: notification.body.replace(/\n/g, "<br>"),
    });

    // 7. Update notification status
    const updateData: any = {
      retry_count: supabase.raw("retry_count + 1"),
      created_by: userId, // Track who manually resent
    };

    if (result.success) {
      updateData.status = "sent";
      updateData.sent_at = new Date().toISOString();
      updateData.failed_at = null;
      updateData.failure_reason = null;
    } else {
      updateData.status = "failed";
      updateData.failed_at = new Date().toISOString();
      updateData.failure_reason = result.error;
    }

    const { data: updatedNotification, error: updateError } = await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", notificationId)
      .select("id, status, sent_at")
      .single();

    if (updateError) {
      console.error("[Resend Notification API] Update error:", updateError);
      throw new Error(`Failed to update notification: ${updateError.message}`);
    }

    // 8. Return response
    if (result.success) {
      return NextResponse.json({
        success: true,
        notificationId: updatedNotification.id,
        status: updatedNotification.status,
        sentAt: updatedNotification.sent_at,
      } as ResendNotificationResponse);
    } else {
      return NextResponse.json(
        {
          success: false,
          notificationId: updatedNotification.id,
          status: updatedNotification.status,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
