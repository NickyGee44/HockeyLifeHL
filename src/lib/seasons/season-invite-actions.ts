// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InviteActionResult = {
  error?: string;
  success?: boolean;
  message?: string;
  count?: number;
};

// Check if current user is an owner
async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isOwner: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Not authorized - owner access required", isOwner: false };
  }

  return { isOwner: true, userId: user.id };
}

/**
 * Get the most recently completed season
 */
export async function getPreviousSeason() {
  const supabase = await createClient();
  
  const { data: previousSeason, error } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date")
    .eq("status", "completed")
    .order("end_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching previous season:", error);
    return { error: error.message, season: null };
  }

  return { season: previousSeason || null };
}

/**
 * Get all players from the previous season (from team_rosters or opt-ins)
 */
export async function getPreviousSeasonPlayers(previousSeasonId: string) {
  const supabase = await createClient();
  
  // Get players who were on team rosters in the previous season
  const { data: rosterPlayers, error: rosterError } = await supabase
    .from("team_rosters")
    .select(`
      player_id,
      player:profiles!team_rosters_player_id_fkey(
        id,
        email,
        full_name
      )
    `)
    .eq("season_id", previousSeasonId);

  if (rosterError) {
    console.error("Error fetching roster players:", rosterError);
    return { error: rosterError.message, players: [] };
  }

  // Also get players who opted in to the previous season
  const { data: optInPlayers, error: optInError } = await supabase
    .from("season_opt_ins")
    .select(`
      player_id,
      player:profiles!season_opt_ins_player_id_fkey(
        id,
        email,
        full_name
      )
    `)
    .eq("season_id", previousSeasonId);

  if (optInError) {
    console.error("Error fetching opt-in players:", optInError);
    return { error: optInError.message, players: [] };
  }

  // Combine and deduplicate players
  const playerMap = new Map();
  
  [...(rosterPlayers || []), ...(optInPlayers || [])].forEach(entry => {
    if (entry.player && entry.player.id) {
      playerMap.set(entry.player.id, entry.player);
    }
  });

  const uniquePlayers = Array.from(playerMap.values());
  
  return { players: uniquePlayers };
}

/**
 * Bulk opt-in all players from the previous season into the new season
 * (Admin override - no email sent)
 */
export async function bulkOptInPreviousSeasonPlayers(
  newSeasonId: string,
  previousSeasonId?: string
): Promise<InviteActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // If no previous season ID provided, get the most recent completed season
  let targetPreviousSeasonId = previousSeasonId;
  if (!targetPreviousSeasonId) {
    const { season } = await getPreviousSeason();
    if (!season) {
      return { error: "No previous season found to import players from" };
    }
    targetPreviousSeasonId = season.id;
  }

  // Get all players from the previous season
  const { players, error: playersError } = await getPreviousSeasonPlayers(targetPreviousSeasonId);
  
  if (playersError) {
    return { error: playersError };
  }

  if (!players || players.length === 0) {
    return { error: "No players found in the previous season" };
  }

  // Create opt-in entries for all players
  const optInEntries = players.map(player => ({
    player_id: player.id,
    season_id: newSeasonId,
    opt_in_type: "full_time" as const,
    opted_in_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Insert with upsert to avoid duplicates
  const { error: insertError } = await supabase
    .from("season_opt_ins")
    .upsert(optInEntries, {
      onConflict: "player_id,season_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    console.error("Error bulk opting in players:", insertError);
    return { error: insertError.message };
  }

  revalidatePath("/admin/seasons");
  revalidatePath("/dashboard");
  
  return { 
    success: true, 
    message: `Successfully opted in ${players.length} players from the previous season`,
    count: players.length
  };
}

/**
 * Send email invites to all players from the previous season
 * Players must click the link to opt in themselves
 */
export async function sendSeasonInviteEmails(
  newSeasonId: string,
  previousSeasonId?: string
): Promise<InviteActionResult> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  // Get the new season details
  const { data: newSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, start_date, draft_scheduled_at")
    .eq("id", newSeasonId)
    .single();

  if (seasonError || !newSeason) {
    return { error: "Could not find the new season" };
  }

  // If no previous season ID provided, get the most recent completed season
  let targetPreviousSeasonId = previousSeasonId;
  if (!targetPreviousSeasonId) {
    const { season } = await getPreviousSeason();
    if (!season) {
      return { error: "No previous season found to invite players from" };
    }
    targetPreviousSeasonId = season.id;
  }

  // Get all players from the previous season
  const { players, error: playersError } = await getPreviousSeasonPlayers(targetPreviousSeasonId);
  
  if (playersError) {
    return { error: playersError };
  }

  if (!players || players.length === 0) {
    return { error: "No players found in the previous season to invite" };
  }

  // Filter to only players with valid emails
  const playersWithEmails = players.filter(p => p.email && p.email.includes("@"));

  if (playersWithEmails.length === 0) {
    return { error: "No players with valid emails found" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const optInUrl = `${siteUrl}/dashboard?opt_in=${newSeasonId}`;
  
  // Format dates for email
  const startDate = new Date(newSeason.start_date).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const draftDate = newSeason.draft_scheduled_at 
    ? new Date(newSeason.draft_scheduled_at).toLocaleDateString("en-CA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "TBD";

  // Email template
  const emailSubject = `🏒 HockeyLifeHL - New Season Starting: ${newSeason.name}`;
  const emailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #E31837 0%, #003E7E 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #E31837; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .info-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #E31837; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏒 New Season Starting! 🏒</h1>
          <p>${newSeason.name}</p>
        </div>
        <div class="content">
          <p>Hey there!</p>
          <p>A new season of <strong>HockeyLifeHL</strong> is starting and we want YOU back on the ice!</p>
          
          <div class="info-box">
            <h3>📅 Season Details</h3>
            <ul>
              <li><strong>Season:</strong> ${newSeason.name}</li>
              <li><strong>Start Date:</strong> ${startDate}</li>
              <li><strong>Draft Date:</strong> ${draftDate}</li>
            </ul>
          </div>

          <p><strong>Ready to play?</strong> Click the button below to opt in for this season:</p>
          
          <p style="text-align: center;">
            <a href="${optInUrl}" class="button">Opt In for ${newSeason.name} →</a>
          </p>

          <p style="font-size: 14px; color: #666;">
            <strong>Note:</strong> You can choose to opt in as a full-time player (eligible for the draft) 
            or as a call-up (available as a substitute when needed).
          </p>

          <p>See you on the ice! 🍁</p>
          <p><em>For Fun, For Beers, For Glory</em></p>
        </div>
        <div class="footer">
          <p>HockeyLifeHL - Men's Recreational Hockey League</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p style="font-size: 10px; margin-top: 10px;">
            <a href="${siteUrl}" style="color: #666;">Visit HockeyLifeHL</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Log emails that would be sent (in production, integrate with email service)
  console.log(`\n📧 Season Invite Emails to be sent for ${newSeason.name}:`);
  console.log(`   Total recipients: ${playersWithEmails.length}`);
  console.log(`   Opt-in URL: ${optInUrl}`);
  
  playersWithEmails.forEach(player => {
    console.log(`   - ${player.full_name || "Unknown"} <${player.email}>`);
  });

  // TODO: Implement actual email sending with Resend, SendGrid, etc.
  // Example with Resend:
  // for (const player of playersWithEmails) {
  //   await resend.emails.send({
  //     from: 'HockeyLifeHL <noreply@hockeylifehl.com>',
  //     to: player.email,
  //     subject: emailSubject,
  //     html: emailBody,
  //   });
  // }

  return { 
    success: true, 
    message: `Email invites prepared for ${playersWithEmails.length} players. Check server logs for details.`,
    count: playersWithEmails.length
  };
}

/**
 * Get count of players from the previous season (for UI display)
 */
export async function getPreviousSeasonPlayerCount(): Promise<{ count: number; seasonName: string | null }> {
  const { season } = await getPreviousSeason();
  
  if (!season) {
    return { count: 0, seasonName: null };
  }

  const { players } = await getPreviousSeasonPlayers(season.id);
  
  return { 
    count: players?.length || 0, 
    seasonName: season.name 
  };
}
