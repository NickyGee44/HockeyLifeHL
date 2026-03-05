import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Brand colors from BRAND-KIT.md
const BRAND = {
  gold: "#D4AF37",
  goldLight: "#FFD54F",
  goldDark: "#C19A00",
  bgDark: "#0a0a0a",
  cardDark: "#111111",
  cardBorder: "rgba(212, 175, 55, 0.3)",
  textPrimary: "#fafafa",
  textSecondary: "#a3a3a3",
  textMuted: "#525252",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
} as const;

interface Notification {
  id: string;
  league_id: string;
  user_id: string;
  type: string;
  channel: string;
  subject: string;
  body: string;
  template_id: string | null;
  template_data: Record<string, unknown> | null;
  priority: number;
  retry_count: number;
}

interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
}

interface NotificationPreferences {
  email_enabled: boolean;
  email_game_updates: boolean;
  email_registration: boolean;
  email_draft: boolean;
  email_billing: boolean;
}

// Email template renderer
function renderEmailTemplate(
  templateId: string,
  data: Record<string, unknown>,
  preferences: { unsubscribeToken?: string } = {}
): { subject: string; html: string } {
  const templates: Record<
    string,
    (data: Record<string, unknown>) => { subject: string; html: string }
  > = {
    game_rescheduled_v1: renderGameRescheduledEmail,
    game_cancelled_v1: renderGameCancelledEmail,
    registration_confirmed_v1: renderRegistrationConfirmedEmail,
    draft_pick_v1: renderDraftPickEmail,
    invoice_due_reminder_v1: renderInvoiceDueEmail,
    payment_due_v1: renderPaymentDueEmail,
    score_verification_v1: renderScoreVerificationEmail,
  };

  const renderer = templates[templateId];
  if (!renderer) {
    // Fallback to generic template
    return renderGenericEmail(data);
  }

  const result = renderer({ ...data, unsubscribeToken: preferences.unsubscribeToken });
  return result;
}

// Base email wrapper with BRAND-KIT styling
function wrapEmailHtml(
  content: string,
  options: {
    preheader?: string;
    showUnsubscribe?: boolean;
    unsubscribeToken?: string;
  } = {}
): string {
  const unsubscribeSection = options.showUnsubscribe && options.unsubscribeToken
    ? `
      <tr>
        <td style="padding: 16px 32px; text-align: center;">
          <a href="https://beerleaguehockey.ca/unsubscribe/${options.unsubscribeToken}"
             style="color: ${BRAND.textMuted}; font-size: 12px; text-decoration: underline;">
            Unsubscribe from these emails
          </a>
        </td>
      </tr>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Beer League Hockey</title>
  ${options.preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${options.preheader}</span>` : ""}
  <style>
    body { margin: 0; padding: 0; background-color: ${BRAND.bgDark}; }
    table { border-collapse: collapse; }
    img { border: 0; line-height: 100%; text-decoration: none; }
    a { color: ${BRAND.gold}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .content { padding: 24px 16px !important; }
      .button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bgDark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.bgDark};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.cardDark}; border-radius: 12px; border: 1px solid ${BRAND.cardBorder}; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldDark}); padding: 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; color: #000000; font-weight: 700;">Beer League Hockey</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td class="content" style="padding: 32px; color: ${BRAND.textPrimary};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: ${BRAND.bgDark}; border-top: 1px solid #333333;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; color: ${BRAND.textMuted}; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">&copy; ${new Date().getFullYear()} Beer League Hockey. All rights reserved.</p>
                    <p style="margin: 0;">
                      <a href="https://beerleaguehockey.ca" style="color: ${BRAND.gold};">beerleaguehockey.ca</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${unsubscribeSection}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Primary CTA button
function renderButton(text: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background: linear-gradient(to right, ${BRAND.gold}, ${BRAND.goldDark}); border-radius: 8px;">
          <a href="${href}" class="button" style="display: inline-block; padding: 14px 28px; color: #000000; font-weight: 600; font-size: 16px; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// Info box for key details
function renderInfoBox(items: Array<{ label: string; value: string }>): string {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 12px; color: ${BRAND.textSecondary}; font-size: 14px;">${item.label}</td>
        <td style="padding: 8px 12px; color: ${BRAND.textPrimary}; font-size: 14px; font-weight: 500;">${item.value}</td>
      </tr>
    `
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 8px; margin: 16px 0; border: 1px solid #333333;">
      ${rows}
    </table>
  `;
}

// Alert box for important notices
function renderAlertBox(
  message: string,
  type: "warning" | "info" | "success" = "info"
): string {
  const colors = {
    warning: { bg: "rgba(245, 158, 11, 0.15)", border: BRAND.warning, icon: "" },
    info: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", icon: "" },
    success: { bg: "rgba(34, 197, 94, 0.15)", border: BRAND.success, icon: "" },
  };
  const style = colors[type];

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${style.bg}; border-radius: 8px; border-left: 4px solid ${style.border}; margin: 16px 0;">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0; color: ${BRAND.textPrimary}; font-size: 14px;">${style.icon} ${message}</p>
        </td>
      </tr>
    </table>
  `;
}

// ====== EMAIL TEMPLATE RENDERERS ======

function renderGameRescheduledEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Game Rescheduled: ${data.home_team} vs ${data.away_team}`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">Game Rescheduled</h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      Your game has been rescheduled to a new date and time.
    </p>

    ${renderInfoBox([
      { label: "Home Team", value: String(data.home_team) },
      { label: "Away Team", value: String(data.away_team) },
      { label: "Original Date", value: String(data.old_date) },
      { label: "New Date", value: String(data.new_date) },
      { label: "Venue", value: String(data.venue_name) },
    ])}

    ${renderAlertBox("Please update your calendar and inform your teammates of the schedule change.", "warning")}

    <p style="margin: 24px 0 0 0; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.6;">
      If you have any questions, contact your league administrator.
    </p>

    <p style="margin: 24px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      See you on the ice!<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `Game rescheduled from ${data.old_date} to ${data.new_date}`,
    }),
  };
}

function renderGameCancelledEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Game Cancelled: ${data.home_team} vs ${data.away_team}`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">Game Cancelled</h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      We regret to inform you that your game has been cancelled.
    </p>

    ${renderInfoBox([
      { label: "Home Team", value: String(data.home_team) },
      { label: "Away Team", value: String(data.away_team) },
      { label: "Scheduled Date", value: String(data.scheduled_date) },
      { label: "Reason", value: String(data.cancellation_reason || "Not specified") },
    ])}

    ${renderAlertBox("You will be notified if this game is rescheduled.", "info")}

    <p style="margin: 24px 0 0 0; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.6;">
      If you have any questions, contact your league administrator.
    </p>

    <p style="margin: 24px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      Thanks for your understanding,<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `Your game on ${data.scheduled_date} has been cancelled`,
    }),
  };
}

function renderRegistrationConfirmedEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Welcome to ${data.league_name}!`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">Registration Confirmed!</h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      Hi ${data.player_name}, your registration has been successfully processed.
    </p>

    ${renderInfoBox([
      { label: "Season", value: String(data.season_name) },
      { label: "Amount Paid", value: String(data.amount_paid) },
      { label: "Transaction ID", value: String(data.transaction_id) },
    ])}

    <h2 style="margin: 32px 0 16px 0; font-size: 18px; color: ${BRAND.gold};">What's Next?</h2>
    <ol style="margin: 0; padding-left: 20px; color: ${BRAND.textSecondary}; line-height: 1.8;">
      <li>Wait for the draft or team assignment</li>
      <li>Check your schedule once teams are finalized</li>
      <li>Get ready to play!</li>
    </ol>

    ${renderButton("View Your Dashboard", "https://beerleaguehockey.ca/dashboard")}

    <p style="margin: 24px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      See you on the ice!<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `Your registration for ${data.season_name} is confirmed`,
      showUnsubscribe: false,
    }),
  };
}

function renderDraftPickEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Welcome to ${data.team_name}!`;

  const content = `
    <div style="text-align: center; margin-bottom: 32px;">
      <span style="font-size: 48px;">🏒</span>
      <h1 style="margin: 16px 0 0 0; font-size: 28px; color: ${BRAND.gold};">Congratulations!</h1>
    </div>

    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6; text-align: center;">
      Hi ${data.player_name}, you've been drafted to <strong style="color: ${BRAND.textPrimary};">${data.team_name}</strong>!
    </p>

    ${renderInfoBox([
      { label: "Draft", value: String(data.draft_name) },
      { label: "Round", value: String(data.round_number) },
      { label: "Pick", value: `#${data.pick_number}` },
    ])}

    <p style="margin: 24px 0; color: ${BRAND.textSecondary}; font-size: 14px; line-height: 1.6;">
      Your team captain will reach out with more information about practice schedules and game times.
    </p>

    ${renderButton("View Your Team", "https://beerleaguehockey.ca/dashboard/team")}

    <p style="margin: 24px 0 0 0; color: ${BRAND.gold}; font-size: 14px; text-align: center;">
      Good luck this season!<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `You've been drafted to ${data.team_name}!`,
    }),
  };
}

function renderInvoiceDueEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Payment Reminder: ${data.amount} due in ${data.days_until_due} days`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">Payment Reminder</h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      Hi ${data.recipient_name}, this is a friendly reminder about your upcoming payment.
    </p>

    ${renderInfoBox([
      { label: "Amount Due", value: String(data.amount) },
      { label: "Due Date", value: String(data.due_date) },
      { label: "Description", value: String(data.description) },
    ])}

    ${renderButton("Pay Now", String(data.payment_link))}

    <p style="margin: 24px 0 0 0; color: ${BRAND.textMuted}; font-size: 12px;">
      If you have already paid, please disregard this message.
    </p>

    <p style="margin: 16px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      Thanks,<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `Your payment of ${data.amount} is due ${data.due_date}`,
      showUnsubscribe: true,
      unsubscribeToken: String(data.unsubscribeToken || ""),
    }),
  };
}

function renderPaymentDueEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const isOverdue = data.overdue === true || data.overdue === "true";
  const subject = isOverdue
    ? `OVERDUE: ${data.amount} - ${data.league_name}`
    : `Payment Due: ${data.amount} - ${data.league_name}`;

  const overdueAlert = isOverdue
    ? renderAlertBox(
        `This payment is ${data.days_overdue} days overdue. Please pay as soon as possible.`,
        "warning"
      )
    : "";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">
      ${isOverdue ? "Payment Overdue" : "Payment Due"}
    </h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      Hi ${data.recipient_name}, you have an outstanding payment.
    </p>

    ${overdueAlert}

    ${renderInfoBox([
      { label: "Amount Due", value: String(data.amount) },
      { label: "Due Date", value: String(data.due_date) },
      { label: "Description", value: String(data.description) },
    ])}

    ${renderButton("Pay Now", String(data.payment_link))}

    <p style="margin: 24px 0 0 0; color: ${BRAND.textMuted}; font-size: 12px;">
      If you have already paid, please disregard this message.
    </p>

    <p style="margin: 16px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      Thanks,<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: isOverdue
        ? `OVERDUE: Payment of ${data.amount} is ${data.days_overdue} days past due`
        : `Your payment of ${data.amount} is due ${data.due_date}`,
      showUnsubscribe: true,
      unsubscribeToken: String(data.unsubscribeToken || ""),
    }),
  };
}

function renderScoreVerificationEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = `Verify Game Score: ${data.home_team} vs ${data.away_team}`;

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">Score Verification Needed</h1>
    <p style="margin: 0 0 24px 0; color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      Hi ${data.captain_name}, the score for your game has been submitted by the scorekeeper.
    </p>

    <div style="text-align: center; margin: 24px 0; padding: 24px; background-color: #1a1a1a; border-radius: 12px;">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: ${BRAND.textSecondary};">Final Score</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width: 45%; text-align: right; padding-right: 16px;">
            <span style="font-size: 14px; color: ${BRAND.textSecondary};">${data.home_team}</span><br>
            <span style="font-size: 48px; font-weight: 700; color: ${BRAND.textPrimary};">${data.home_score}</span>
          </td>
          <td style="width: 10%; text-align: center; vertical-align: middle;">
            <span style="font-size: 24px; color: ${BRAND.textMuted};">-</span>
          </td>
          <td style="width: 45%; text-align: left; padding-left: 16px;">
            <span style="font-size: 14px; color: ${BRAND.textSecondary};">${data.away_team}</span><br>
            <span style="font-size: 48px; font-weight: 700; color: ${BRAND.textPrimary};">${data.away_score}</span>
          </td>
        </tr>
      </table>
    </div>

    ${renderInfoBox([
      { label: "Game Date", value: String(data.game_date) },
      { label: "Venue", value: String(data.venue_name) },
    ])}

    ${renderButton("Verify Score", String(data.verification_link))}

    ${renderAlertBox("This verification link expires in 48 hours.", "warning")}

    <p style="margin: 24px 0 0 0; color: ${BRAND.textSecondary}; font-size: 14px;">
      If you have any concerns about the score, contact your league administrator.
    </p>

    <p style="margin: 16px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      Thanks,<br>
      <strong>${data.league_name}</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content, {
      preheader: `Verify score: ${data.home_team} ${data.home_score} - ${data.away_score} ${data.away_team}`,
    }),
  };
}

function renderGenericEmail(
  data: Record<string, unknown>
): { subject: string; html: string } {
  const subject = String(data.subject || "Notification from Beer League Hockey");

  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; color: ${BRAND.textPrimary};">${data.title || "Notification"}</h1>
    <div style="color: ${BRAND.textSecondary}; font-size: 16px; line-height: 1.6;">
      ${data.body || data.message || "You have a new notification."}
    </div>

    <p style="margin: 24px 0 0 0; color: ${BRAND.gold}; font-size: 14px;">
      Thanks,<br>
      <strong>Beer League Hockey</strong>
    </p>
  `;

  return {
    subject,
    html: wrapEmailHtml(content),
  };
}

// ====== MAIN HANDLER ======

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify authorization (cron secret or service role token)
  const authHeader = req.headers.get("Authorization");
  const cronSecret = req.headers.get("X-Cron-Secret");
  const configuredCronSecret = Deno.env.get("CRON_SECRET");
  const isValidCron = Boolean(configuredCronSecret) && cronSecret === configuredCronSecret;
  const isValidServiceRole =
    Boolean(SUPABASE_SERVICE_ROLE_KEY) &&
    authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isValidCron && !isValidServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate environment
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { action, batch_size = 10 } = await req.json();

    // Queue invoice reminders action — calls DB function, no email sending
    if (action === "queue_invoice_reminders") {
      const { data, error } = await supabase.rpc("queue_invoice_due_reminders");
      if (error) {
        return new Response(
          JSON.stringify({ error: `Failed to queue invoice reminders: ${error.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ message: "Invoice reminders queued", queued: data }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;
    let failedCount = 0;
    const results: Array<{ id: string; status: string; error?: string }> = [];

    // Claim notifications based on action
    let notificationIds: string[] = [];

    if (action === "process_pending") {
      const { data } = await supabase.rpc("claim_pending_notifications", {
        p_batch_size: batch_size,
      });
      notificationIds = data || [];
    } else if (action === "process_retry") {
      const { data } = await supabase.rpc("claim_retry_notifications", {
        p_batch_size: batch_size,
      });
      notificationIds = data || [];
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'process_pending', 'process_retry', or 'queue_invoice_reminders'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (notificationIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to process", processed: 0, failed: 0 }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Fetch full notification data
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .in("id", notificationIds);

    if (fetchError || !notifications) {
      throw new Error(`Failed to fetch notifications: ${fetchError?.message}`);
    }

    // Process each notification
    for (const notification of notifications as Notification[]) {
      try {
        // Get user profile for email address
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, first_name, last_name")
          .eq("id", notification.user_id)
          .single();

        if (!profile?.email) {
          throw new Error("User email not found");
        }

        // Check user notification preferences
        const { data: prefs } = await supabase
          .from("user_notification_preferences")
          .select("*")
          .eq("user_id", notification.user_id)
          .single();

        // Check if user has opted out of this notification type
        if (prefs) {
          const typePrefs: Record<string, keyof NotificationPreferences> = {
            game_rescheduled: "email_game_updates",
            game_cancelled: "email_game_updates",
            registration_confirmed: "email_registration",
            draft_pick: "email_draft",
            invoice_due_reminder: "email_billing",
            payment_due: "email_billing",
          };

          const prefKey = typePrefs[notification.type];
          if (prefKey && prefs[prefKey] === false) {
            // User opted out - mark as cancelled instead of sent
            await supabase
              .from("notifications")
              .update({ status: "cancelled" })
              .eq("id", notification.id);
            results.push({ id: notification.id, status: "cancelled_opted_out" });
            continue;
          }

          if (prefs.email_enabled === false) {
            await supabase
              .from("notifications")
              .update({ status: "cancelled" })
              .eq("id", notification.id);
            results.push({ id: notification.id, status: "cancelled_opted_out" });
            continue;
          }
        }

        // Render email template
        const templateData = {
          ...(notification.template_data || {}),
          captain_name: `${profile.first_name} ${profile.last_name}`,
          player_name: `${profile.first_name} ${profile.last_name}`,
          recipient_name: `${profile.first_name} ${profile.last_name}`,
        };

        const { subject, html } = notification.template_id
          ? renderEmailTemplate(notification.template_id, templateData, {
              unsubscribeToken: prefs?.unsubscribe_token,
            })
          : {
              subject: notification.subject || "Notification from Beer League Hockey",
              html: wrapEmailHtml(`<div>${notification.body}</div>`),
            };

        // Send via Resend
        const startTime = Date.now();
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Beer League Hockey <noreply@beerleaguehockey.ca>",
            to: [profile.email],
            subject,
            html,
          }),
        });

        const duration = Date.now() - startTime;

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${errorText}`);
        }

        const resendResult = await resendResponse.json();

        // Mark as sent
        await supabase.rpc("mark_notification_sent", {
          p_notification_id: notification.id,
          p_provider_message_id: resendResult.id,
          p_provider_response: resendResult,
        });

        // Log delivery
        await supabase.from("notification_delivery_log").insert({
          notification_id: notification.id,
          attempt_number: notification.retry_count + 1,
          status: "success",
          provider: "resend",
          provider_message_id: resendResult.id,
          provider_response: resendResult,
          duration_ms: duration,
        });

        processedCount++;
        results.push({ id: notification.id, status: "sent" });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Mark as failed with retry
        await supabase.rpc("mark_notification_failed", {
          p_notification_id: notification.id,
          p_error_message: errorMessage,
          p_provider_response: { error: errorMessage },
        });

        // Log failure
        await supabase.from("notification_delivery_log").insert({
          notification_id: notification.id,
          attempt_number: notification.retry_count + 1,
          status: "failed",
          provider: "resend",
          error_message: errorMessage,
        });

        failedCount++;
        results.push({ id: notification.id, status: "failed", error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} notifications, ${failedCount} failed`,
        processed: processedCount,
        failed: failedCount,
        results,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );

  } catch (error) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
