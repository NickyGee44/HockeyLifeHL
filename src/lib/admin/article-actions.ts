"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateGameRecap, generateDraftGrades, generateWeeklyWrap } from "@/lib/ai/content";
import { getActiveLeagueId } from "@/lib/auth/league-context";

type OwnerAuthResult =
  | { error: string; isOwner: false; userId?: never }
  | { error?: never; isOwner: true; userId: string };

async function requireOwner(): Promise<OwnerAuthResult> {
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

export async function getAllArticles() {
  const supabase = await createClient();
  
  const { data: articles, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching articles:", error);
    return { error: error.message, articles: [] };
  }

  return { articles: articles || [] };
}

export async function createArticle(formData: FormData) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const type = formData.get("type") as string;
  const published = formData.get("published") === "true";

  if (!title || !content || !type) {
    return { error: "Title, content, and type are required" };
  }

  // Validate article type
  const validTypes = ["game_recap", "weekly_wrap", "draft_grades", "announcement"] as const;
  if (!validTypes.includes(type as typeof validTypes[number])) {
    return { error: "Invalid article type" };
  }

  const leagueId = await getActiveLeagueId();
  if (!leagueId) {
    return { error: "No active league found" };
  }

  const { data: article, error } = await supabase
    .from("articles")
    .insert({
      title: title.trim(),
      content: content.trim(),
      type: type as "game_recap" | "weekly_wrap" | "draft_grades" | "announcement",
      published: published,
      published_at: published ? new Date().toISOString() : null,
      league_id: leagueId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating article:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/articles");
  revalidatePath("/news");
  return { success: true, article };
}

export async function updateArticle(articleId: string, formData: FormData) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const published = formData.get("published") === "true";

  const { error } = await supabase
    .from("articles")
    .update({
      title: title.trim(),
      content: content.trim(),
      published: published,
      published_at: published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (error) {
    console.error("Error updating article:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/articles");
  revalidatePath("/news");
  return { success: true };
}

export async function deleteArticle(articleId: string) {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  const supabase = await createClient();

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId);

  if (error) {
    console.error("Error deleting article:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/articles");
  revalidatePath("/news");
  return { success: true };
}

// Generate AI article
export async function generateAIArticle(
  type: "game_recap" | "draft_grades" | "weekly_wrap",
  contextId: string
): Promise<{ error?: string; success?: boolean; content?: string; title?: string }> {
  const auth = await requireOwner();
  if (auth.error) return { error: auth.error };

  let content: string;
  let title: string;

  try {
    if (type === "game_recap") {
      const result = await generateGameRecap(contextId);
      if (result.error) return { error: result.error };
      content = result.content || "";
      const supabase = await createClient();
      const { data: game } = await supabase
        .from("games")
        .select("id, home_team_id, away_team_id")
        .eq("id", contextId)
        .single();

      if (!game) {
        title = "Game Recap";
      } else {
        // Get team names separately
        const { data: homeTeam } = await supabase
          .from("teams")
          .select("name")
          .eq("id", game.home_team_id)
          .single();

        const { data: awayTeam } = await supabase
          .from("teams")
          .select("name")
          .eq("id", game.away_team_id)
          .single();

        title = `${homeTeam?.name || "Team"} vs ${awayTeam?.name || "Team"} - Game Recap`;
      }
    } else if (type === "draft_grades") {
      const result = await generateDraftGrades(contextId);
      if (result.error) return { error: result.error };
      content = result.content || "";
      title = "Draft Grades - Cycle Analysis";
    } else if (type === "weekly_wrap") {
      const supabase = await createClient();
      const { data: season } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("id", contextId)
        .single();

      const weekEnd = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekEnd.getDate() - 7);

      const result = await generateWeeklyWrap(contextId, weekStart, weekEnd);
      if (result.error) return { error: result.error };
      content = result.content || "";
      title = `Weekly Wrap - ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}`;
    } else {
      return { error: "Invalid article type" };
    }

    return { success: true, content, title };
  } catch (error) {
    console.error("Error generating AI article:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate article";
    return { error: errorMessage };
  }
}
