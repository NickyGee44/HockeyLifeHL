"use server";

import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate game recap article
export async function generateGameRecap(gameId: string): Promise<{ error?: string; content?: string }> {
  const supabase = await createClient();

  // Get game details
  const { data: game } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_name),
      season:seasons!games_season_id_fkey(id, name)
    `)
    .eq("id", gameId)
    .single();

  if (!game || game.status !== "completed") {
    return { error: "Game not found or not completed" };
  }

  // Get player stats for this game
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      *,
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number, position)
    `)
    .eq("game_id", gameId)
    .order("goals", { ascending: false })
    .order("assists", { ascending: false });

  // Get goalie stats
  const { data: goalieStats } = await supabase
    .from("goalie_stats")
    .select(`
      *,
      player:profiles!goalie_stats_player_id_fkey(id, full_name, jersey_number)
    `)
    .eq("game_id", gameId);

  // Build context for AI
  const homeTeamStats = playerStats?.filter(s => s.team_id === game.home_team_id) || [];
  const awayTeamStats = playerStats?.filter(s => s.team_id === game.away_team_id) || [];
  
  const topScorers = [...homeTeamStats, ...awayTeamStats]
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
    .slice(0, 5);

  const context = `
Game: ${game.home_team?.name} vs ${game.away_team?.name}
Final Score: ${game.home_team?.name} ${game.home_score} - ${game.away_score} ${game.away_team?.name}
Date: ${new Date(game.scheduled_at).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}

Top Performers:
${topScorers.map((s, i) => `${i + 1}. ${s.player?.full_name} (${s.goals}G, ${s.assists}A)`).join("\n")}

${goalieStats && goalieStats.length > 0 ? `Goalie Stats: ${goalieStats.map(gs => `${gs.player?.full_name}: ${gs.goals_against} GA, ${gs.saves} saves${gs.shutout ? ", SHUTOUT" : ""}`).join("; ")}` : ""}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a hockey writer for HockeyLifeHL, a men's recreational hockey league. Write engaging, fun game recap articles with a Canadian hockey theme. Use phrases like "For Fun, For Beers, For Glory" and keep it lighthearted but exciting. Highlight top performers, key moments, and the competitive spirit. Write in a style that celebrates the game and the players.`,
        },
        {
          role: "user",
          content: `Write a game recap article for this game:\n\n${context}\n\nMake it 300-500 words, engaging, and fun. Include player highlights and celebrate the competitive spirit.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "";
    return { content };
  } catch (error: any) {
    console.error("Error generating game recap:", error);
    return { error: error.message || "Failed to generate article" };
  }
}

// Generate draft grades article
export async function generateDraftGrades(draftId: string): Promise<{ error?: string; content?: string }> {
  const supabase = await createClient();

  // Get draft picks
  const { data: picks } = await supabase
    .from("draft_picks")
    .select(`
      *,
      team:teams!draft_picks_team_id_fkey(id, name, short_name),
      player:profiles!draft_picks_player_id_fkey(id, full_name, jersey_number, position)
    `)
    .eq("draft_id", draftId)
    .order("pick_number", { ascending: true });

  if (!picks || picks.length === 0) {
    return { error: "No draft picks found" };
  }

  // Group picks by team
  const teamPicks: Record<string, any[]> = {};
  picks.forEach(pick => {
    if (!teamPicks[pick.team_id]) {
      teamPicks[pick.team_id] = [];
    }
    teamPicks[pick.team_id].push(pick);
  });

  // Build context
  const teamsContext = Object.entries(teamPicks).map(([teamId, teamPicksList]) => {
    const team = teamPicksList[0].team;
    const players = teamPicksList.map(p => `${p.player?.full_name} (${p.player?.position || "F"})`).join(", ");
    return `${team.name}: ${players}`;
  }).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a hockey analyst for HockeyLifeHL. Write draft grade articles that evaluate each team's draft performance. Give each team a grade (A+ to D) and write 2-3 sentences about their draft strategy and picks. Be fun and engaging, use Canadian hockey references, and keep it lighthearted.`,
        },
        {
          role: "user",
          content: `Write draft grades for this draft. Here are the teams and their picks:\n\n${teamsContext}\n\nGive each team a grade and a brief analysis. Make it fun and engaging!`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || "";
    return { content };
  } catch (error: any) {
    console.error("Error generating draft grades:", error);
    return { error: error.message || "Failed to generate article" };
  }
}

// Generate weekly wrap article
export async function generateWeeklyWrap(seasonId: string, weekStart: Date, weekEnd: Date): Promise<{ error?: string; content?: string }> {
  const supabase = await createClient();

  // Get games from this week
  const { data: games } = await supabase
    .from("games")
    .select(`
      *,
      home_team:teams!games_home_team_id_fkey(id, name, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_name)
    `)
    .eq("season_id", seasonId)
    .eq("status", "completed")
    .gte("scheduled_at", weekStart.toISOString())
    .lte("scheduled_at", weekEnd.toISOString());

  if (!games || games.length === 0) {
    return { error: "No games found for this week" };
  }

  // Get top performers for the week
  const gameIds = games.map(g => g.id);
  const { data: playerStats } = await supabase
    .from("player_stats")
    .select(`
      *,
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number),
      game:games!player_stats_game_id_fkey(id, home_captain_verified, away_captain_verified)
    `)
    .in("game_id", gameIds);

  // Only count verified games
  const verifiedStats = playerStats?.filter(s => 
    s.game.home_captain_verified && s.game.away_captain_verified
  ) || [];

  const topScorers = verifiedStats
    .reduce((acc: Record<string, { player: any; goals: number; assists: number; points: number }>, stat: any) => {
      const playerId = stat.player_id;
      if (!acc[playerId]) {
        acc[playerId] = {
          player: stat.player,
          goals: 0,
          assists: 0,
          points: 0,
        };
      }
      acc[playerId].goals += stat.goals || 0;
      acc[playerId].assists += stat.assists || 0;
      acc[playerId].points += (stat.goals || 0) + (stat.assists || 0);
      return acc;
    }, {});
  
  const topPerformers = Object.values(topScorers)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const gamesContext = games.map(g => 
    `${g.home_team?.name} ${g.home_score} - ${g.away_score} ${g.away_team?.name}`
  ).join("\n");

  const performersContext = topPerformers.map((p, i) => 
    `${i + 1}. ${p.player?.full_name}: ${p.goals}G, ${p.assists}A (${p.points} points)`
  ).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a hockey writer for HockeyLifeHL. Write engaging weekly wrap articles that recap the week's games, highlight top performers, and celebrate the competitive spirit. Use a fun, Canadian hockey theme with phrases like "For Fun, For Beers, For Glory". Keep it engaging and celebrate the players.`,
        },
        {
          role: "user",
          content: `Write a weekly wrap article for this week (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}):\n\nGames:\n${gamesContext}\n\nTop Performers:\n${performersContext}\n\nMake it 400-600 words, engaging, and fun!`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || "";
    return { content };
  } catch (error: any) {
    console.error("Error generating weekly wrap:", error);
    return { error: error.message || "Failed to generate article" };
  }
}
