// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";

export type DraftOrderResult = {
  error?: string;
  success?: boolean;
  order?: Array<{ teamId: string; position: number }>;
};

// Get all teams with captains for a draft
export async function getDraftTeamsWithCaptains() {
  const supabase = await createClient();

  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      id,
      name,
      short_name,
      primary_color,
      secondary_color,
      logo_url,
      captain:profiles!teams_captain_id_fkey(
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .not("captain_id", "is", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching teams with captains:", error);
    return { error: error.message, teams: [] };
  }

  return { teams: teams || [] };
}

// Randomly assign draft order
export async function assignDraftOrder(draftId: string): Promise<DraftOrderResult> {
  const supabase = await createClient();

  // Get all teams with captains
  const { teams, error: teamsError } = await getDraftTeamsWithCaptains();

  if (teamsError || !teams || teams.length === 0) {
    return { error: "No teams with captains found" };
  }

  // Check if order already assigned
  const { data: existingOrder } = await supabase
    .from("draft_order")
    .select("id")
    .eq("draft_id", draftId)
    .limit(1);

  if (existingOrder && existingOrder.length > 0) {
    return { error: "Draft order has already been assigned" };
  }

  // Randomize team order (Fisher-Yates shuffle)
  const shuffledTeams = [...teams];
  for (let i = shuffledTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
  }

  // Create draft order entries
  const orderEntries = shuffledTeams.map((team, index) => ({
    draft_id: draftId,
    team_id: team.id,
    pick_position: index + 1,
  }));

  const { error: insertError } = await supabase
    .from("draft_order")
    .insert(orderEntries);

  if (insertError) {
    console.error("Error assigning draft order:", insertError);
    return { error: insertError.message };
  }

  // Mark draft as having order assigned
  await supabase
    .from("drafts")
    .update({ draft_order_assigned: true })
    .eq("id", draftId);

  return {
    success: true,
    order: shuffledTeams.map((team, index) => ({
      teamId: team.id,
      position: index + 1,
    })),
  };
}

// Get draft order for a draft
export async function getDraftOrder(draftId: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("draft_order")
    .select(`
      *,
      team:teams!draft_order_team_id_fkey(
        id,
        name,
        short_name,
        primary_color,
        secondary_color,
        logo_url,
        captain:profiles!teams_captain_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      )
    `)
    .eq("draft_id", draftId)
    .order("pick_position", { ascending: true });

  if (error) {
    console.error("Error fetching draft order:", error);
    return { error: error.message, order: [] };
  }

  return { order: order || [] };
}
