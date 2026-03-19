import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ProgressReport {
  email: string;
  subject?: string;
  type?: "test" | "progress" | "completion";
  stats?: {
    completed: number;
    running: number;
    pending: number;
    failed: number;
    testsRun: number;
  };
  steps?: Array<{ title: string; status: string }>;
  logs?: Array<{ time: string; type: string; message: string }>;
  sessionDuration?: string;
}

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify caller is authenticated with service role key
  const authHeader = req.headers.get("Authorization");
  if (!SUPABASE_SERVICE_ROLE_KEY || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const report: ProgressReport = await req.json();

    if (!report.email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate email HTML
    const html = generateEmailHtml(report);

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HockeyLifeHL Orchestrator <noreply@hockeylifehl.com>",
        to: [report.email],
        subject:
          report.subject ||
          `Orchestrator Progress Report - ${new Date().toLocaleString()}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
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

function generateEmailHtml(report: ProgressReport): string {
  const { stats, steps, logs, sessionDuration, type } = report;

  if (type === "test") {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fafafa; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: #111; border-radius: 12px; padding: 32px; border: 1px solid rgba(212, 175, 55, 0.3); }
          h1 { color: #D4AF37; margin: 0 0 16px 0; }
          p { color: #a3a3a3; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏒 Test Email</h1>
          <p>This is a test email from the HockeyLifeHL Agentic Orchestrator.</p>
          <p>If you received this, your email notifications are configured correctly!</p>
          <p style="color: #D4AF37; margin-top: 24px;">— HockeyLifeHL Team</p>
        </div>
      </body>
      </html>
    `;
  }

  const completedCount = stats?.completed || 0;
  const pendingCount = stats?.pending || 0;
  const failedCount = stats?.failed || 0;
  const totalSteps = steps?.length || 0;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const stepRows =
    steps
      ?.map(
        (s) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #333;">
        ${s.status === "complete" ? "✅" : s.status === "running" ? "🔄" : s.status === "error" ? "❌" : "⏳"}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #333;">${s.title}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #333; text-transform: capitalize;">${s.status}</td>
    </tr>
  `
      )
      .join("") || "";

  const recentLogs =
    logs
      ?.slice(-10)
      .map(
        (l) => `
    <div style="padding: 4px 0; border-bottom: 1px solid #222; font-family: monospace; font-size: 12px;">
      <span style="color: #525252;">[${l.time}]</span>
      <span style="color: ${l.type === "error" ? "#ef4444" : l.type === "success" ? "#22c55e" : "#3b82f6"};">${l.type.toUpperCase()}</span>
      <span style="color: #a3a3a3;">${l.message}</span>
    </div>
  `
      )
      .join("") || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fafafa; padding: 40px; margin: 0; }
        .container { max-width: 700px; margin: 0 auto; background: #111; border-radius: 12px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.3); }
        .header { background: linear-gradient(135deg, #D4AF37, #C19A00); color: #000; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; opacity: 0.8; }
        .content { padding: 32px; }
        .stats { display: flex; gap: 16px; margin-bottom: 32px; }
        .stat { flex: 1; background: #1a1a1a; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #333; }
        .stat-value { font-size: 32px; font-weight: 700; color: #D4AF37; }
        .stat-label { font-size: 12px; color: #a3a3a3; margin-top: 4px; }
        .progress-bar { background: #1a1a1a; border-radius: 8px; height: 12px; overflow: hidden; margin-bottom: 24px; }
        .progress-fill { background: linear-gradient(90deg, #D4AF37, #FFD54F); height: 100%; border-radius: 8px; }
        h2 { color: #D4AF37; font-size: 16px; margin: 24px 0 12px 0; border-bottom: 1px solid #333; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
        th { text-align: left; padding: 12px; background: #242424; color: #D4AF37; font-size: 12px; text-transform: uppercase; }
        td { padding: 8px 12px; color: #fafafa; }
        .logs { background: #0a0a0a; border-radius: 8px; padding: 16px; max-height: 300px; overflow-y: auto; }
        .footer { padding: 24px 32px; background: #0a0a0a; border-top: 1px solid #333; text-align: center; color: #525252; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏒 HockeyLifeHL Progress Report</h1>
          <p>${new Date().toLocaleString()} • Session: ${sessionDuration || "--:--:--"}</p>
        </div>

        <div class="content">
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${completedCount}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
              <div class="stat-value">${stats?.running || 0}</div>
              <div class="stat-label">Running</div>
            </div>
            <div class="stat">
              <div class="stat-value">${pendingCount}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat">
              <div class="stat-value" style="color: ${failedCount > 0 ? "#ef4444" : "#D4AF37"};">${failedCount}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>

          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <p style="text-align: center; color: #a3a3a3; margin-bottom: 24px;">${progressPercent}% Complete</p>

          <h2>📋 Step Progress</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">Status</th>
                <th>Step</th>
                <th style="width: 100px;">State</th>
              </tr>
            </thead>
            <tbody>
              ${stepRows}
            </tbody>
          </table>

          ${
            logs && logs.length > 0
              ? `
            <h2>📝 Recent Logs</h2>
            <div class="logs">
              ${recentLogs}
            </div>
          `
              : ""
          }
        </div>

        <div class="footer">
          <p>This is an automated progress report from the HockeyLifeHL Agentic Orchestrator.</p>
          <p style="color: #D4AF37;">View full progress at your orchestrator dashboard.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
