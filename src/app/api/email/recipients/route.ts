// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSeasonPlayers,
  getActiveSeasonCaptains,
  getAllAdmins,
  getTeamPlayers,
  getGamePlayers,
  getAllLeagueMembers,
  getAllTeams,
  getAllGames,
} from "@/lib/email/recipients";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // SECURITY: Require owner role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "owner") {
      return NextResponse.json(
        { error: "Unauthorized - owner access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    switch (type) {
      case "active-season-players":
        return NextResponse.json(await getActiveSeasonPlayers());
      case "active-season-captains":
        return NextResponse.json(await getActiveSeasonCaptains());
      case "all-admins":
        return NextResponse.json(await getAllAdmins());
      case "all-league":
        return NextResponse.json(await getAllLeagueMembers());
      case "teams":
        const teamIds = searchParams.get("teamIds")?.split(",").filter(Boolean);
        const seasonId = searchParams.get("seasonId");
        if (teamIds && teamIds.length > 0) {
          return NextResponse.json(await getTeamPlayers(teamIds, seasonId || undefined));
        }
        return NextResponse.json({ error: "Team IDs required" }, { status: 400 });
      case "games":
        const gameIds = searchParams.get("gameIds")?.split(",").filter(Boolean);
        if (gameIds && gameIds.length > 0) {
          return NextResponse.json(await getGamePlayers(gameIds));
        }
        return NextResponse.json({ error: "Game IDs required" }, { status: 400 });
      case "list-teams":
        return NextResponse.json(await getAllTeams());
      case "list-games":
        const listSeasonId = searchParams.get("seasonId");
        return NextResponse.json(await getAllGames(listSeasonId || undefined));
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}
