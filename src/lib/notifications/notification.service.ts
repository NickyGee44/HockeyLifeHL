/**
 * Notification Service
 *
 * Purpose: Process domain events and send notifications (email, SMS, push)
 *
 * Architecture:
 * 1. Subscribe to domain events via EventBus
 * 2. Determine recipients (e.g., team captains for game events)
 * 3. Render notification content from templates
 * 4. Create notification records in database (status: pending)
 * 5. Send notifications via external service (Resend for email)
 * 6. Update notification status (sent/failed)
 * 7. Retry on failure (exponential backoff)
 *
 * Phase 1 (Current):
 * - Email only (via Resend)
 * - Immediate delivery (no queue)
 * - Simple retry logic (3 attempts)
 *
 * Phase 2 (Future):
 * - SMS via Twilio
 * - Push notifications via Firebase
 * - Job queue (Bull/Redis) for async processing
 * - Advanced retry with dead letter queue
 * - Delivery tracking and analytics
 *
 * Configuration:
 * - Set RESEND_API_KEY in environment variables
 * - Set FROM_EMAIL for notification sender address
 *
 * Usage:
 * ```typescript
 * import { notificationService } from '@/lib/notifications/notification.service';
 *
 * // Service auto-starts and subscribes to events
 * // No manual initialization needed
 * ```
 */

import { createClient } from "@/lib/supabase/server";
import { eventBus } from "@/lib/events";
import type {
  GameRescheduledEvent,
  GameCancelledEvent,
  ScoreSubmittedEvent,
  InvoiceCreatedEvent,
} from "@/lib/events";

// =====================================================
// TYPES
// =====================================================

interface NotificationRecord {
  id: string;
  league_id: string;
  user_id: string;
  type: string;
  channel: "email" | "sms" | "push";
  subject?: string;
  body: string;
  template_id?: string;
  template_data?: Record<string, any>;
  status: "pending" | "sent" | "failed" | "bounced";
  sent_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  related_entity_type?: string;
  related_entity_id?: string;
  created_by?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  idempotencyKey?: string;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Simple email format validation
 */
function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  // Basic email regex - covers most common cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate idempotency key for email sends
 * Uses notification ID + retry attempt to prevent duplicate sends
 */
function generateIdempotencyKey(notificationId: string, retryCount: number = 0): string {
  return `notif_${notificationId}_retry_${retryCount}`;
}

// =====================================================
// TEMPLATE RENDERING
// =====================================================

/**
 * Simple template renderer
 * Replaces {{variable}} with values from data object
 *
 * Example:
 * renderTemplate("Hi {{name}}", { name: "John" }) => "Hi John"
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

// =====================================================
// RECIPIENT RESOLUTION
// =====================================================

/**
 * Get captain user IDs and email addresses for a game
 */
async function getCaptainsForGame(
  leagueId: string,
  gameId: string
): Promise<Array<{ userId: string; email: string; name: string; teamName: string }>> {
  const supabase = await createClient();

  // @ts-ignore
  const { data, error } = await supabase.rpc("get_captain_user_ids_for_game", {
    p_game_id: gameId,
  });

  if (error) {
    console.error("[NotificationService] Error fetching captains:", error);
    return [];
  }

  const captainData = data as any[];
  if (!captainData || captainData.length === 0) {
    console.warn(`[NotificationService] No captains found for game ${gameId}`);
    return [];
  }

  // Fetch profile details for captains
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", captainData);

  if (profileError) {
    console.error("[NotificationService] Error fetching captain profiles:", profileError);
    return [];
  }

  // Get team names
  // @ts-ignore
  const gameResult: any = await supabase
    .from("games")
    .select(
      `
      home_team:home_team_id(id, name),
      away_team:away_team_id(id, name)
    `
    )
    .eq("id", gameId)
    .single();
  const game = gameResult.data;
  const gameError = gameResult.error;

  if (gameError) {
    console.error("[NotificationService] Error fetching game teams:", gameError);
    return [];
  }

  // Match captains to teams
  // @ts-ignore
  const membershipsResult: any = await supabase
    .from("league_memberships")
    .select("user_id, team_id, teams(name)")
    .in("user_id", captainData)
    .eq("role", "captain");
  const memberships = membershipsResult.data;
  const membershipError = membershipsResult.error;

  if (membershipError) {
    console.error("[NotificationService] Error fetching memberships:", membershipError);
    return [];
  }

  // Filter out captains without valid emails and map to result
  const results: Array<{ userId: string; email: string; name: string; teamName: string }> = [];

  for (const profile of profiles) {
    // Skip captains without valid email addresses
    if (!isValidEmail(profile.email)) {
      console.warn(`[NotificationService] Captain ${profile.id} has invalid/missing email, skipping`);
      continue;
    }

    const membership = memberships.find((m) => m.user_id === profile.id);
    results.push({
      userId: profile.id,
      email: profile.email,
      name: profile.full_name || "Captain",
      teamName: membership?.teams?.name || "Unknown Team",
    });
  }

  if (results.length < profiles.length) {
    console.warn(`[NotificationService] ${profiles.length - results.length} captains skipped due to invalid emails`);
  }

  return results;
}

// =====================================================
// EMAIL SENDING
// =====================================================

/**
 * Send email via Resend API
 *
 * Configuration:
 * - RESEND_API_KEY environment variable
 * - FROM_EMAIL environment variable (defaults to noreply@beerleaguehockey.ca)
 */
async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; isRetryable?: boolean }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@beerleaguehockey.ca";

  if (!RESEND_API_KEY) {
    console.error("[NotificationService] RESEND_API_KEY not configured. Set RESEND_API_KEY environment variable.");
    return { success: false, error: "Email service not configured", isRetryable: false };
  }

  // Validate recipient email before sending
  if (!isValidEmail(payload.to)) {
    console.error(`[NotificationService] Invalid recipient email: ${payload.to}`);
    return { success: false, error: "Invalid recipient email address", isRetryable: false };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Add idempotency key to prevent duplicate sends on retry
    if (payload.idempotencyKey) {
      headers["Idempotency-Key"] = payload.idempotencyKey;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: payload.from || FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NotificationService] Resend API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      // Determine if error is retryable
      // 4xx errors (except 429) are usually permanent, 5xx and 429 are retryable
      const isRetryable = response.status === 429 || response.status >= 500;

      return {
        success: false,
        error: `Resend API error: ${response.status} - ${errorText}`,
        isRetryable,
      };
    }

    const data = await response.json();

    // Validate response has expected id field
    if (!data?.id) {
      console.warn("[NotificationService] Resend response missing id:", data);
    }

    console.log(`[NotificationService] Email sent successfully:`, {
      messageId: data?.id,
      to: payload.to,
    });

    return { success: true };
  } catch (error) {
    console.error("[NotificationService] Email send error:", error);

    // Network errors are typically retryable
    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error && error.message.includes("fetch"));

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      isRetryable: isNetworkError,
    };
  }
}

// =====================================================
// NOTIFICATION CREATION
// =====================================================

/**
 * Create notification record in database
 */
async function createNotification(
  notification: Omit<NotificationRecord, "id">
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert(notification)
    .select("id")
    .single();

  if (error) {
    console.error("[NotificationService] Error creating notification:", error);
    return null;
  }

  return data.id;
}

/**
 * Update notification status
 */
async function updateNotificationStatus(
  notificationId: string,
  status: "sent" | "failed",
  failureReason?: string,
  retryCount?: number
): Promise<void> {
  const supabase = await createClient();

  const updates: any = {
    status,
    ...(retryCount !== undefined && { retry_count: retryCount }),
    ...(status === "sent" && { sent_at: new Date().toISOString() }),
    ...(status === "failed" && {
      failed_at: new Date().toISOString(),
      failure_reason: failureReason,
    }),
  };

  const { error } = await supabase.from("notifications").update(updates).eq("id", notificationId);

  if (error) {
    console.error("[NotificationService] Error updating notification status:", error);
  }
}

// =====================================================
// RETRY LOGIC
// =====================================================

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

/**
 * Send email with retry logic using exponential backoff
 */
async function sendEmailWithRetry(
  payload: EmailPayload,
  notificationId: string
): Promise<{ success: boolean; error?: string; retryCount: number }> {
  let lastError: string | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Add idempotency key based on notification ID and attempt
    const idempotencyKey = generateIdempotencyKey(notificationId, attempt);

    const result = await sendEmail({
      ...payload,
      idempotencyKey,
    });

    if (result.success) {
      return { success: true, retryCount: attempt };
    }

    lastError = result.error;
    retryCount = attempt;

    // Don't retry if error is not retryable
    if (!result.isRetryable) {
      console.log(`[NotificationService] Non-retryable error, giving up after attempt ${attempt + 1}`);
      break;
    }

    // Don't wait after last attempt
    if (attempt < MAX_RETRIES) {
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`[NotificationService] Retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { success: false, error: lastError, retryCount };
}

// =====================================================
// EVENT HANDLERS
// =====================================================

/**
 * Handle Game Rescheduled Event
 *
 * 1. Get captains for both teams
 * 2. Render email template with game details
 * 3. Create notification records
 * 4. Send emails
 */
async function handleGameRescheduled(event: GameRescheduledEvent): Promise<void> {
  console.log(`[NotificationService] Handling game.rescheduled: ${event.payload?.gameId}`);

  // Validate event payload
  if (!event.payload) {
    console.error("[NotificationService] game.rescheduled event missing payload");
    return;
  }

  const {
    gameId,
    oldScheduledAt,
    newScheduledAt,
    reason,
    homeTeamName,
    awayTeamName,
    venueName,
    divisionName,
  } = event.payload;

  // Validate required fields
  if (!gameId) {
    console.error("[NotificationService] game.rescheduled event missing gameId");
    return;
  }

  if (!oldScheduledAt || !newScheduledAt) {
    console.error("[NotificationService] game.rescheduled event missing date fields");
    return;
  }

  // Get captains
  const captains = await getCaptainsForGame(event.leagueId, gameId);

  if (captains.length === 0) {
    console.warn(`[NotificationService] No captains to notify for game ${gameId}`);
    return;
  }

  // Template data
  const templateData = {
    game_id: gameId,
    old_date: new Date(oldScheduledAt).toLocaleString(),
    new_date: new Date(newScheduledAt).toLocaleString(),
    reschedule_reason: reason,
    home_team: homeTeamName,
    away_team: awayTeamName,
    venue_name: venueName,
    division_name: divisionName,
    league_name: "Hockey League", // TODO: Get from league settings
  };

  // Track send results for summary logging
  const sendResults = { sent: 0, failed: 0 };

  // Send to each captain
  for (const captain of captains) {
    const captainData = {
      ...templateData,
      captain_name: captain.name,
      team_name: captain.teamName,
    };

    // Render email
    const subject = renderTemplate(
      "Game Rescheduled: {{home_team}} vs {{away_team}}",
      captainData
    );

    const body = renderTemplate(
      `Hi {{captain_name}},

Your game has been rescheduled:

**Original Date:** {{old_date}}
**New Date:** {{new_date}}

**Game Details:**
- Home: {{home_team}}
- Away: {{away_team}}
- Venue: {{venue_name}}
- Division: {{division_name}}

**Reason:** {{reschedule_reason}}

Please ensure your team is aware of the new date and time.

If you have any questions, contact your league administrator.

Thanks,
{{league_name}}`,
      captainData
    );

    // Create notification record
    const notificationId = await createNotification({
      league_id: event.leagueId,
      user_id: captain.userId,
      type: "game_rescheduled",
      channel: "email",
      subject,
      body,
      template_id: "game_rescheduled_v1",
      template_data: captainData,
      status: "pending",
      retry_count: 0,
      related_entity_type: "game",
      related_entity_id: gameId,
    });

    if (!notificationId) {
      console.error(`[NotificationService] Failed to create notification for ${captain.email}`);
      sendResults.failed++;
      continue;
    }

    // Send email with retry logic
    const result = await sendEmailWithRetry(
      {
        to: captain.email,
        subject,
        html: body.replace(/\n/g, "<br>"),
      },
      notificationId
    );

    // Update status
    if (result.success) {
      await updateNotificationStatus(notificationId, "sent", undefined, result.retryCount);
      console.log(`[NotificationService] Email sent to ${captain.email}${result.retryCount > 0 ? ` (after ${result.retryCount} retries)` : ""}`);
      sendResults.sent++;
    } else {
      await updateNotificationStatus(notificationId, "failed", result.error, result.retryCount);
      console.error(`[NotificationService] Failed to send email to ${captain.email} after ${result.retryCount + 1} attempts: ${result.error}`);
      sendResults.failed++;
    }
  }

  // Log summary
  console.log(`[NotificationService] game.rescheduled notification summary for game ${gameId}:`, {
    totalCaptains: captains.length,
    sent: sendResults.sent,
    failed: sendResults.failed,
  });
}

/**
 * Handle Game Cancelled Event
 *
 * Similar to rescheduled, but with cancellation template
 */
async function handleGameCancelled(event: GameCancelledEvent): Promise<void> {
  console.log(`[NotificationService] Handling game.cancelled: ${event.payload?.gameId}`);

  // Validate event payload
  if (!event.payload) {
    console.error("[NotificationService] game.cancelled event missing payload");
    return;
  }

  const {
    gameId,
    scheduledAt,
    reason,
    willReschedule,
    homeTeamName,
    awayTeamName,
    venueName,
    divisionName,
  } = event.payload;

  // Validate required fields
  if (!gameId) {
    console.error("[NotificationService] game.cancelled event missing gameId");
    return;
  }

  if (!scheduledAt) {
    console.error("[NotificationService] game.cancelled event missing scheduledAt");
    return;
  }

  // Get captains
  const captains = await getCaptainsForGame(event.leagueId, gameId);

  if (captains.length === 0) {
    console.warn(`[NotificationService] No captains to notify for game ${gameId}`);
    return;
  }

  // Template data
  const templateData = {
    game_id: gameId,
    scheduled_date: new Date(scheduledAt).toLocaleString(),
    cancellation_reason: reason || "No reason provided",
    will_reschedule: willReschedule,
    home_team: homeTeamName || "Home Team",
    away_team: awayTeamName || "Away Team",
    venue_name: venueName || "TBD",
    division_name: divisionName || "League",
    league_name: "Hockey League",
  };

  // Track send results for summary logging
  const sendResults = { sent: 0, failed: 0 };

  // Send to each captain
  for (const captain of captains) {
    const captainData = {
      ...templateData,
      captain_name: captain.name,
      team_name: captain.teamName,
    };

    const subject = renderTemplate("Game Cancelled: {{home_team}} vs {{away_team}}", captainData);

    const body = renderTemplate(
      `Hi {{captain_name}},

Your game on {{scheduled_date}} has been cancelled.

**Game Details:**
- Home: {{home_team}}
- Away: {{away_team}}
- Venue: {{venue_name}}
- Division: {{division_name}}

**Reason:** {{cancellation_reason}}

${willReschedule ? "This game will be rescheduled. You will receive another notification once a new date is confirmed." : ""}

If you have any questions, contact your league administrator.

Thanks,
{{league_name}}`,
      captainData
    );

    const notificationId = await createNotification({
      league_id: event.leagueId,
      user_id: captain.userId,
      type: "game_cancelled",
      channel: "email",
      subject,
      body,
      template_id: "game_cancelled_v1",
      template_data: captainData,
      status: "pending",
      retry_count: 0,
      related_entity_type: "game",
      related_entity_id: gameId,
    });

    if (!notificationId) {
      console.error(`[NotificationService] Failed to create notification for ${captain.email}`);
      sendResults.failed++;
      continue;
    }

    // Send email with retry logic
    const result = await sendEmailWithRetry(
      {
        to: captain.email,
        subject,
        html: body.replace(/\n/g, "<br>"),
      },
      notificationId
    );

    if (result.success) {
      await updateNotificationStatus(notificationId, "sent", undefined, result.retryCount);
      console.log(`[NotificationService] Email sent to ${captain.email}${result.retryCount > 0 ? ` (after ${result.retryCount} retries)` : ""}`);
      sendResults.sent++;
    } else {
      await updateNotificationStatus(notificationId, "failed", result.error, result.retryCount);
      console.error(`[NotificationService] Failed to send email to ${captain.email} after ${result.retryCount + 1} attempts: ${result.error}`);
      sendResults.failed++;
    }
  }

  // Log summary
  console.log(`[NotificationService] game.cancelled notification summary for game ${gameId}:`, {
    totalCaptains: captains.length,
    sent: sendResults.sent,
    failed: sendResults.failed,
  });
}

// =====================================================
// SERVICE INITIALIZATION
// =====================================================

/**
 * Initialize notification service
 * Subscribe to domain events and start processing
 */
export function initializeNotificationService(): void {
  console.log("[NotificationService] Initializing...");

  // Subscribe to game events
  eventBus.on("game.rescheduled", handleGameRescheduled);
  eventBus.on("game.cancelled", handleGameCancelled);

  // TODO: Add more event handlers as needed
  // eventBus.on("game.score_submitted", handleScoreSubmitted);
  // eventBus.on("invoice.created", handleInvoiceCreated);
  // eventBus.on("payment.overdue", handlePaymentOverdue);

  console.log("[NotificationService] Ready - subscribed to events");
}

// Auto-initialize in production/development
// (Disabled in test environment)
if (process.env.NODE_ENV !== "test") {
  initializeNotificationService();
}

// =====================================================
// EXPORTS
// =====================================================

export const notificationService = {
  initialize: initializeNotificationService,
  sendEmail,
  createNotification,
  updateNotificationStatus,
};
