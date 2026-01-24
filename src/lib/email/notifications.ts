// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmailDraft } from "./actions";
import { generateEmailContent, type EmailGenerationContext } from "./ai-generator";
import { getBaseEmailTemplate } from "./templates/base";
import type { EmailDraft, EmailRecipient } from "./types";

/**
 * Send game reminder email to players
 */
export async function sendGameReminderEmail(
  gameId: string,
  recipientIds: string[]
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();

  // Get game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      location,
      home_team:teams!games_home_team_id_fkey(id, name),
      away_team:teams!games_away_team_id_fkey(id, name)
    `)
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return { error: "Game not found" };
  }

  // Get recipient emails
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", recipientIds);

  if (!profiles || profiles.length === 0) {
    return { error: "No recipients found" };
  }

  const gameDate = new Date(game.scheduled_at);
  const recipients: EmailRecipient[] = profiles
    .filter((p) => p.email)
    .map((p) => ({
      email: p.email!,
      name: p.full_name || undefined,
      role: "player",
    }));

  // Generate email content
  const context: EmailGenerationContext = {
    type: "game_reminder",
    gameDetails: {
      date: gameDate.toLocaleDateString("en-CA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: gameDate.toLocaleTimeString("en-CA", {
        hour: "numeric",
        minute: "2-digit",
      }),
      opponent: game.home_team?.name || game.away_team?.name || "Opponent",
      location: game.location || undefined,
    },
    tone: "friendly",
  };

  const generated = await generateEmailContent(context);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const checkInUrl = `${siteUrl}/dashboard`;

  const html = getBaseEmailTemplate({
    title: generated.subject,
    content: generated.html,
    buttonText: "Check In for Game",
    buttonUrl: checkInUrl,
  });

  const draft: EmailDraft = {
    type: "game_reminder",
    subject: generated.subject,
    html,
    recipients,
    isAutomated: true,
    context,
  };

  return await sendEmailDraft(draft, true); // Skip preview for automated
}

/**
 * Send stat entry reminder to captains
 */
export async function sendStatReminderEmail(
  gameId: string,
  captainId: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();

  // Get game and captain details
  const [gameResult, captainResult] = await Promise.all([
    supabase
      .from("games")
      .select(`
        id,
        scheduled_at,
        home_team:teams!games_home_team_id_fkey(id, name),
        away_team:teams!games_away_team_id_fkey(id, name)
      `)
      .eq("id", gameId)
      .single(),
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", captainId)
      .single(),
  ]);

  if (gameResult.error || !gameResult.data) {
    return { error: "Game not found" };
  }

  if (captainResult.error || !captainResult.data || !captainResult.data.email) {
    return { error: "Captain not found or no email" };
  }

  const game = gameResult.data;
  const captain = captainResult.data;

  const context: EmailGenerationContext = {
    type: "stat_reminder",
    recipientName: captain.full_name || undefined,
    recipientRole: "captain",
    gameDetails: {
      date: new Date(game.scheduled_at).toLocaleDateString(),
      time: new Date(game.scheduled_at).toLocaleTimeString(),
      opponent: game.home_team?.name || game.away_team?.name || "Opponent",
    },
    tone: "professional",
  };

  const generated = await generateEmailContent(context);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const statsUrl = `${siteUrl}/captain/stats`;

  const html = getBaseEmailTemplate({
    title: generated.subject,
    content: generated.html,
    buttonText: "Enter Stats",
    buttonUrl: statsUrl,
  });

  const draft: EmailDraft = {
    type: "stat_reminder",
    subject: generated.subject,
    html,
    recipients: [
      {
        email: captain.email,
        name: captain.full_name || undefined,
        role: "captain",
      },
    ],
    isAutomated: true,
    context,
  };

  return await sendEmailDraft(draft, true);
}

/**
 * Send draft notification to captains
 */
export async function sendDraftNotificationEmail(
  draftId: string,
  seasonName: string,
  draftLink?: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();

  // Get all team captains
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      captain:profiles!teams_captain_id_fkey(id, email, full_name)
    `)
    .not("captain_id", "is", null);

  if (teamsError) {
    return { error: teamsError.message };
  }

  if (!teams || teams.length === 0) {
    return { success: true, sent: 0 };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const draftUrl = draftLink
    ? `${siteUrl}/captain/draft?draft=${draftLink}`
    : `${siteUrl}/captain/draft`;

  const recipients: EmailRecipient[] = teams
    .filter((team) => team.captain && team.captain.email)
    .map((team) => ({
      email: team.captain.email!,
      name: team.captain.full_name || undefined,
      role: "captain",
    }));

  if (recipients.length === 0) {
    return { success: true, sent: 0 };
  }

  const context: EmailGenerationContext = {
    type: "draft_notification",
    seasonName,
    tone: "friendly",
    customContext: `Draft link: ${draftUrl}`,
  };

  const generated = await generateEmailContent(context);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const html = getBaseEmailTemplate({
    title: generated.subject,
    content: generated.html,
    buttonText: "Go to Draft Board",
    buttonUrl: draftUrl,
  });

  const draft: EmailDraft = {
    type: "draft_notification",
    subject: generated.subject,
    html,
    recipients,
    isAutomated: true,
    context,
  };

  return await sendEmailDraft(draft, true);
}

/**
 * Send payment reminder to players
 */
export async function sendPaymentReminderEmail(
  seasonId: string,
  playerIds: string[]
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();

  // Get season and player details
  const [seasonResult, playersResult] = await Promise.all([
    supabase.from("seasons").select("id, name").eq("id", seasonId).single(),
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", playerIds),
  ]);

  if (seasonResult.error || !seasonResult.data) {
    return { error: "Season not found" };
  }

  if (!playersResult.data || playersResult.data.length === 0) {
    return { success: true, sent: 0 };
  }

  const season = seasonResult.data;
  const recipients: EmailRecipient[] = playersResult.data
    .filter((p) => p.email)
    .map((p) => ({
      email: p.email!,
      name: p.full_name || undefined,
      role: "player",
    }));

  const context: EmailGenerationContext = {
    type: "payment_reminder",
    seasonName: season.name,
    tone: "professional",
  };

  const generated = await generateEmailContent(context);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const paymentUrl = `${siteUrl}/dashboard/payments`;

  const html = getBaseEmailTemplate({
    title: generated.subject,
    content: generated.html,
    buttonText: "View Payment Status",
    buttonUrl: paymentUrl,
  });

  const draft: EmailDraft = {
    type: "payment_reminder",
    subject: generated.subject,
    html,
    recipients,
    isAutomated: true,
    context,
  };

  return await sendEmailDraft(draft, true);
}

/**
 * Send season invite email to players
 */
export async function sendSeasonInviteEmail(
  seasonId: string,
  playerIds: string[]
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();

  // Get season and player details
  const [seasonResult, playersResult] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, name, start_date, draft_scheduled_at")
      .eq("id", seasonId)
      .single(),
    supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", playerIds),
  ]);

  if (seasonResult.error || !seasonResult.data) {
    return { error: "Season not found" };
  }

  if (!playersResult.data || playersResult.data.length === 0) {
    return { success: true, sent: 0 };
  }

  const season = seasonResult.data;
  const recipients: EmailRecipient[] = playersResult.data
    .filter((p) => p.email)
    .map((p) => ({
      email: p.email!,
      name: p.full_name || undefined,
      role: "player",
    }));

  const context: EmailGenerationContext = {
    type: "season_invite",
    seasonName: season.name,
    tone: "friendly",
    customContext: `Season starts: ${new Date(season.start_date).toLocaleDateString()}`,
  };

  const generated = await generateEmailContent(context);
  if ("error" in generated) {
    return { error: generated.error };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const optInUrl = `${siteUrl}/dashboard?opt_in=${seasonId}`;

  const html = getBaseEmailTemplate({
    title: generated.subject,
    content: generated.html,
    buttonText: "Opt In for Season",
    buttonUrl: optInUrl,
  });

  const draft: EmailDraft = {
    type: "season_invite",
    subject: generated.subject,
    html,
    recipients,
    isAutomated: true,
    context,
  };

  return await sendEmailDraft(draft, true);
}
