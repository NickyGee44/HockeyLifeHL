// @ts-nocheck
"use server";

import { createClient } from "@/lib/supabase/server";
import type { EmailRecipient } from "./types";

/**
 * Get all active season players
 */
export async function getActiveSeasonPlayers(): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .in("status", ["active", "playoffs", "draft"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (seasonError || !activeSeason) {
    return { error: "No active season found" };
  }

  // Get all players from team rosters in active season
  const { data: rosters, error: rosterError } = await supabase
    .from("team_rosters")
    .select(`
      player_id,
      player:profiles!team_rosters_player_id_fkey(
        id,
        email,
        full_name,
        role
      )
    `)
    .eq("season_id", activeSeason.id);

  if (rosterError) {
    return { error: rosterError.message };
  }

  const recipients: EmailRecipient[] = (rosters || [])
    .filter((r) => r.player && r.player.email)
    .map((r) => ({
      email: r.player.email!,
      name: r.player.full_name || undefined,
      role: (r.player.role as any) || "player",
    }));

  return { recipients };
}

/**
 * Get all active season captains
 */
export async function getActiveSeasonCaptains(): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason, error: seasonError } = await supabase
    .from("seasons")
    .select("id")
    .in("status", ["active", "playoffs", "draft"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (seasonError || !activeSeason) {
    return { error: "No active season found" };
  }

  // Get all teams with captains in active season
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(`
      id,
      captain:profiles!teams_captain_id_fkey(
        id,
        email,
        full_name
      )
    `)
    .not("captain_id", "is", null);

  if (teamsError) {
    return { error: teamsError.message };
  }

  // Verify captains are in active season rosters
  const captainIds = teams
    .filter((t) => t.captain)
    .map((t) => t.captain.id);

  if (captainIds.length === 0) {
    return { recipients: [] };
  }

  const { data: rosters } = await supabase
    .from("team_rosters")
    .select("player_id")
    .eq("season_id", activeSeason.id)
    .in("player_id", captainIds);

  const activeCaptainIds = new Set((rosters || []).map((r) => r.player_id));

  const recipients: EmailRecipient[] = teams
    .filter((t) => t.captain && activeCaptainIds.has(t.captain.id) && t.captain.email)
    .map((t) => ({
      email: t.captain!.email!,
      name: t.captain!.full_name || undefined,
      role: "captain",
    }));

  return { recipients };
}

/**
 * Get all admins/owners
 */
export async function getAllAdmins(): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "owner");

  if (error) {
    return { error: error.message };
  }

  const recipients: EmailRecipient[] = (admins || [])
    .filter((a) => a.email)
    .map((a) => ({
      email: a.email!,
      name: a.full_name || undefined,
      role: "admin",
    }));

  return { recipients };
}

/**
 * Get all players from specific teams
 */
export async function getTeamPlayers(
  teamIds: string[],
  seasonId?: string
): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("team_rosters")
    .select(`
      player_id,
      team_id,
      player:profiles!team_rosters_player_id_fkey(
        id,
        email,
        full_name,
        role
      )
    `)
    .in("team_id", teamIds);

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  } else {
    // Get active season if not specified
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .in("status", ["active", "playoffs", "draft"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (activeSeason) {
      query = query.eq("season_id", activeSeason.id);
    }
  }

  const { data: rosters, error } = await query;

  if (error) {
    return { error: error.message };
  }

  const recipients: EmailRecipient[] = (rosters || [])
    .filter((r) => r.player && r.player.email)
    .map((r) => ({
      email: r.player.email!,
      name: r.player.full_name || undefined,
      role: (r.player.role as any) || "player",
    }));

  return { recipients };
}

/**
 * Get all players from specific games
 */
export async function getGamePlayers(
  gameIds: string[]
): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get games with team info
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(`
      id,
      home_team_id,
      away_team_id,
      season_id
    `)
    .in("id", gameIds);

  if (gamesError) {
    return { error: gamesError.message };
  }

  if (!games || games.length === 0) {
    return { recipients: [] };
  }

  // Get all unique team IDs from games
  const teamIds = new Set<string>();
  const seasonIds = new Set<string>();

  games.forEach((game) => {
    if (game.home_team_id) teamIds.add(game.home_team_id);
    if (game.away_team_id) teamIds.add(game.away_team_id);
    if (game.season_id) seasonIds.add(game.season_id);
  });

  // Get players from those teams in those seasons
  const { data: rosters, error: rosterError } = await supabase
    .from("team_rosters")
    .select(`
      player_id,
      player:profiles!team_rosters_player_id_fkey(
        id,
        email,
        full_name,
        role
      )
    `)
    .in("team_id", Array.from(teamIds))
    .in("season_id", Array.from(seasonIds));

  if (rosterError) {
    return { error: rosterError.message };
  }

  // Deduplicate by player ID
  const playerMap = new Map<string, EmailRecipient>();

  (rosters || []).forEach((r) => {
    if (r.player && r.player.email && !playerMap.has(r.player.id)) {
      playerMap.set(r.player.id, {
        email: r.player.email,
        name: r.player.full_name || undefined,
        role: (r.player.role as any) || "player",
      });
    }
  });

  return { recipients: Array.from(playerMap.values()) };
}

/**
 * Get all league members (all players ever registered)
 */
export async function getAllLeagueMembers(): Promise<{
  recipients?: EmailRecipient[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .not("email", "is", null);

  if (error) {
    return { error: error.message };
  }

  const recipients: EmailRecipient[] = (profiles || [])
    .filter((p) => p.email && p.email.includes("@"))
    .map((p) => ({
      email: p.email!,
      name: p.full_name || undefined,
      role: (p.role as any) || "player",
    }));

  return { recipients };
}

/**
 * Get all teams for selection
 */
export async function getAllTeams(seasonId?: string): Promise<{
  teams?: Array<{ id: string; name: string }>;
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase.from("teams").select("id, name").order("name");

  const { data: teams, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { teams: teams || [] };
}

/**
 * Get all games for selection
 */
export async function getAllGames(seasonId?: string): Promise<{
  games?: Array<{
    id: string;
    scheduled_at: string;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("games")
    .select(`
      id,
      scheduled_at,
      home_team:teams!games_home_team_id_fkey(name),
      away_team:teams!games_away_team_id_fkey(name)
    `)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  } else {
    // Get active season if not specified
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .in("status", ["active", "playoffs", "draft"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (activeSeason) {
      query = query.eq("season_id", activeSeason.id);
    }
  }

  const { data: games, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { games: games || [] };
}
