/**
 * Auto-Pick Monitor Edge Function
 *
 * Purpose: Monitors active drafts for expired pick timers and triggers auto-picks
 *
 * Schedule: Run every 10 seconds via cron or external trigger
 *
 * Features:
 * - Finds drafts with expired pick timers
 * - Triggers auto_pick_player() for each
 * - Logs all operations for monitoring
 * - Handles concurrent execution gracefully
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiredPick {
  draft_id: string;
  expires_at: string;
  team_id: string;
  round: number;
  pick: number;
}

interface AutoPickResult {
  draft_id: string;
  success: boolean;
  player_name?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[auto-pick-monitor] Starting check for expired picks...");

    // Find all drafts with expired picks
    const { data: expiredPicks, error: fetchError } = await supabase.rpc(
      "get_expired_draft_picks"
    );

    if (fetchError) {
      console.error("[auto-pick-monitor] Error fetching expired picks:", fetchError);
      throw fetchError;
    }

    const picks = expiredPicks as ExpiredPick[] | null;

    if (!picks || picks.length === 0) {
      console.log("[auto-pick-monitor] No expired picks found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No expired picks",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[auto-pick-monitor] Found ${picks.length} expired picks`);

    // Process each expired pick
    const results: AutoPickResult[] = [];

    for (const pick of picks) {
      console.log(
        `[auto-pick-monitor] Processing draft ${pick.draft_id}, round ${pick.round}, pick ${pick.pick}`
      );

      try {
        const { data: autoPickResult, error: autoPickError } = await supabase.rpc(
          "auto_pick_player",
          { p_draft_id: pick.draft_id }
        );

        if (autoPickError) {
          console.error(
            `[auto-pick-monitor] Error auto-picking for draft ${pick.draft_id}:`,
            autoPickError
          );
          results.push({
            draft_id: pick.draft_id,
            success: false,
            error: autoPickError.message,
          });
          continue;
        }

        const result = autoPickResult as {
          success: boolean;
          error?: string;
          player_name?: string;
        };

        if (result.success) {
          console.log(
            `[auto-pick-monitor] Auto-picked ${result.player_name} for draft ${pick.draft_id}`
          );
          results.push({
            draft_id: pick.draft_id,
            success: true,
            player_name: result.player_name,
          });
        } else {
          console.warn(
            `[auto-pick-monitor] Auto-pick failed for draft ${pick.draft_id}: ${result.error}`
          );
          results.push({
            draft_id: pick.draft_id,
            success: false,
            error: result.error,
          });
        }
      } catch (err) {
        console.error(
          `[auto-pick-monitor] Exception processing draft ${pick.draft_id}:`,
          err
        );
        results.push({
          draft_id: pick.draft_id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[auto-pick-monitor] Completed: ${successCount} successful, ${failureCount} failed`
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failureCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[auto-pick-monitor] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
