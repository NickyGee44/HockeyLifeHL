// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MessageResult = {
  error?: string;
  success?: boolean;
  messageId?: string;
};

// Check if user is captain of team
async function requireTeamCaptain(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", isCaptain: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Owners can send messages to any team
  if (profile?.role === "owner") {
    return { isCaptain: true, userId: user.id };
  }

  // Check if user is captain of this team
  if (profile?.role === "captain") {
    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", teamId)
      .single();

    if (team?.captain_id === user.id) {
      return { isCaptain: true, userId: user.id };
    }
  }

  return { error: "Not authorized - must be team captain", isCaptain: false };
}

// Send a message to a team
export async function sendTeamMessage(
  teamId: string,
  seasonId: string | null,
  messageType: "general" | "game_reminder" | "payment_reminder" | "roster_update" | "announcement",
  subject: string | null,
  message: string,
  isUrgent: boolean = false
): Promise<MessageResult> {
  const auth = await requireTeamCaptain(teamId);
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { data: teamMessage, error } = await supabase
    .from("team_messages")
    .insert({
      team_id: teamId,
      season_id: seasonId,
      sent_by: auth.userId!,
      message_type: messageType,
      subject: subject,
      message: message,
      is_urgent: isUrgent,
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending team message:", error);
    return { error: error.message };
  }

  revalidatePath("/captain/team");
  revalidatePath("/dashboard/team");
  return { success: true, messageId: teamMessage.id };
}

// Get messages for a team
export async function getTeamMessages(teamId: string, seasonId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("team_messages")
    .select(`
      *,
      sent_by_profile:profiles!team_messages_sent_by_fkey(id, full_name, avatar_url)
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error("Error fetching team messages:", error);
    return { error: error.message, messages: [] };
  }

  return { messages: messages || [] };
}

// Get messages for current user's team
export async function getMyTeamMessages() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated", messages: [] };
  }

  // Get user's team for active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (!activeSeason) {
    return { messages: [] };
  }

  const { data: roster } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", user.id)
    .eq("season_id", activeSeason.id)
    .single();

  if (!roster) {
    return { messages: [] };
  }

  return getTeamMessages(roster.team_id, activeSeason.id);
}
