import { NextRequest, NextResponse } from "next/server";
import { getLeagueFromHostname } from "@/lib/context/league-context";

/**
 * API endpoint to get current league context based on hostname
 * This allows client components to access league context from server headers
 */
export async function GET(request: NextRequest) {
  try {
    const league = await getLeagueFromHostname();

    if (!league) {
      return NextResponse.json(
        { league: null, isPlatform: true },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        league: {
          id: league.id,
          name: league.name,
          slug: league.slug,
          subdomain: league.subdomain,
        },
        isPlatform: false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[League Context API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch league context" },
      { status: 500 }
    );
  }
}
