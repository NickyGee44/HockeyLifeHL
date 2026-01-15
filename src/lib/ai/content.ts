// @ts-nocheck
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
      player:profiles!player_stats_player_id_fkey(id, full_name, jersey_number, position),
      game:games!player_stats_game_id_fkey(id, home_captain_verified, away_captain_verified, home_verified_by_owner, away_verified_by_owner)
    `)
    .in("game_id", gameIds);

  // Get goalie stats for the week
  const { data: goalieStats } = await supabase
    .from("goalie_stats")
    .select(`
      *,
      player:profiles!goalie_stats_player_id_fkey(id, full_name, jersey_number),
      game:games!goalie_stats_game_id_fkey(id, home_captain_verified, away_captain_verified, home_verified_by_owner, away_verified_by_owner),
      team:teams!goalie_stats_team_id_fkey(id, name, short_name)
    `)
    .in("game_id", gameIds);

  // Only count verified games (captain verified OR owner verified)
  const verifiedPlayerStats = playerStats?.filter(s => {
    if (!s.game) return false;
    const homeVerified = s.game.home_captain_verified || s.game.home_verified_by_owner;
    const awayVerified = s.game.away_captain_verified || s.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  }) || [];

  const verifiedGoalieStats = goalieStats?.filter(s => {
    if (!s.game) return false;
    const homeVerified = s.game.home_captain_verified || s.game.home_verified_by_owner;
    const awayVerified = s.game.away_captain_verified || s.game.away_verified_by_owner;
    return homeVerified && awayVerified;
  }) || [];

  // Aggregate player stats
  const topScorers = verifiedPlayerStats
    .reduce((acc: Record<string, { player: any; goals: number; assists: number; points: number; games: number }>, stat: any) => {
      const playerId = stat.player_id;
      if (!acc[playerId]) {
        acc[playerId] = {
          player: stat.player,
          goals: 0,
          assists: 0,
          points: 0,
          games: 0,
        };
      }
      acc[playerId].goals += stat.goals || 0;
      acc[playerId].assists += stat.assists || 0;
      acc[playerId].points += (stat.goals || 0) + (stat.assists || 0);
      acc[playerId].games += 1;
      return acc;
    }, {});
  
  const topPerformers = Object.values(topScorers)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  // Aggregate goalie stats
  const goaliePerformance = verifiedGoalieStats
    .reduce((acc: Record<string, { player: any; games: number; goalsAgainst: number; saves: number; shutouts: number; gaa: number; savePercentage: number }>, stat: any) => {
      const goalieId = stat.player_id;
      if (!acc[goalieId]) {
        acc[goalieId] = {
          player: stat.player,
          games: 0,
          goalsAgainst: 0,
          saves: 0,
          shutouts: 0,
          gaa: 0,
          savePercentage: 0,
        };
      }
      acc[goalieId].games += 1;
      acc[goalieId].goalsAgainst += stat.goals_against || 0;
      acc[goalieId].saves += stat.saves || 0;
      if (stat.shutout) acc[goalieId].shutouts += 1;
      return acc;
    }, {});

  // Calculate GAA and save percentage for each goalie
  Object.values(goaliePerformance).forEach(goalie => {
    goalie.gaa = goalie.games > 0 ? goalie.goalsAgainst / goalie.games : 0;
    const totalShots = goalie.goalsAgainst + goalie.saves;
    goalie.savePercentage = totalShots > 0 ? (goalie.saves / totalShots) * 100 : 0;
  });

  const topGoalies = Object.values(goaliePerformance)
    .filter(g => g.games > 0)
    .sort((a, b) => {
      // Sort by shutouts first, then by GAA (lower is better)
      if (b.shutouts !== a.shutouts) return b.shutouts - a.shutouts;
      return a.gaa - b.gaa;
    })
    .slice(0, 5);

  // Identify close matches (score difference of 1-2 goals)
  const closeMatches = games.filter(g => {
    const diff = Math.abs(g.home_score - g.away_score);
    return diff <= 2;
  });

  // Build detailed game context with individual player highlights
  const gamesContext = games.map(g => {
    const gamePlayerStats = verifiedPlayerStats.filter(s => s.game_id === g.id);
    const gameGoalieStats = verifiedGoalieStats.filter(s => s.game_id === g.id);
    
    const topGameScorers = [...gamePlayerStats]
      .sort((a, b) => ((b.goals || 0) + (b.assists || 0)) - ((a.goals || 0) + (a.assists || 0)))
      .slice(0, 3)
      .map(s => `${s.player?.full_name} (${s.goals || 0}G, ${s.assists || 0}A)`);
    
    const goalies = gameGoalieStats.map(gs => {
      const totalShots = (gs.goals_against || 0) + (gs.saves || 0);
      const svPct = totalShots > 0 ? ((gs.saves || 0) / totalShots * 100).toFixed(1) : "0.0";
      return `${gs.player?.full_name} (${gs.goals_against || 0} GA, ${gs.saves || 0} saves, ${svPct}%${gs.shutout ? ", SHUTOUT" : ""})`;
    });

    const isClose = Math.abs(g.home_score - g.away_score) <= 2;
    const closeNote = isClose ? " [CLOSE MATCH]" : "";
    
    return `${g.home_team?.name} ${g.home_score} - ${g.away_score} ${g.away_team?.name}${closeNote}\n  Top Scorers: ${topGameScorers.join(", ")}\n  Goalies: ${goalies.join("; ")}`;
  }).join("\n\n");

  const performersContext = topPerformers.map((p, i) => 
    `${i + 1}. ${p.player?.full_name} (${p.player?.position || "F"}): ${p.goals}G, ${p.assists}A, ${p.points}PTS in ${p.games} game${p.games > 1 ? "s" : ""}`
  ).join("\n");

  const goaliesContext = topGoalies.length > 0 
    ? topGoalies.map((g, i) => 
        `${i + 1}. ${g.player?.full_name}: ${g.games} GP, ${g.gaa.toFixed(2)} GAA, ${g.savePercentage.toFixed(1)}% SV%, ${g.shutouts} shutout${g.shutouts !== 1 ? "s" : ""}`
      ).join("\n")
    : "No goalie stats available for this week";

  const closeMatchesContext = closeMatches.length > 0
    ? closeMatches.map(g => 
        `${g.home_team?.name} ${g.home_score} - ${g.away_score} ${g.away_team?.name} (${Math.abs(g.home_score - g.away_score)} goal difference)`
      ).join("\n")
    : "No close matches this week";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a hockey writer for HockeyLifeHL, a men's recreational hockey league. Write engaging weekly wrap articles that recap the week's games with a Canadian hockey theme. Use phrases like "For Fun, For Beers, For Glory" and keep it lighthearted but exciting. 

IMPORTANT: You MUST call out specific players by name when highlighting their performances. Mention individual player achievements, standout goalie performances, and close matches. Make the article personal and celebrate individual contributions. Write in a style that makes players feel recognized and celebrated.`,
        },
        {
          role: "user",
          content: `Write a weekly wrap article for this week (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}).

Games with Details:
${gamesContext}

Top Weekly Performers (Players):
${performersContext}

Top Weekly Performers (Goalies):
${goaliesContext}

Close Matches (1-2 goal difference):
${closeMatchesContext}

Make it 500-700 words. Be sure to:
- Call out specific players by name when mentioning their performances
- Highlight standout goalie performances (shutouts, low GAA, high save %)
- Mention close matches and the competitive nature of those games
- Celebrate individual achievements and make players feel recognized
- Keep it fun, engaging, and celebrate the competitive spirit
- Use player names throughout, not just in lists`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || "";
    return { content };
  } catch (error: any) {
    console.error("Error generating weekly wrap:", error);
    return { error: error.message || "Failed to generate article" };
  }
}
