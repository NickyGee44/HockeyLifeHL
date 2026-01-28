import { notFound } from "next/navigation";
import { getPlayerStats, getGoalieStats } from "@/lib/stats/queries";
import { getAllSeasons } from "@/lib/seasons/actions";
import { createClient } from "@/lib/supabase/server";
import { PlayerStatsView } from "@/components/stats/PlayerStatsView";
import { generatePlayerMetadata, generatePlayerStructuredData, renderStructuredData } from "@/lib/seo/metadata";
import { getLeagueFromHostname } from "@/lib/context/league-context";

type Props = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
};

/**
 * Generate metadata for player stats page
 */
export async function generateMetadata({ params }: Props) {
  const { playerId } = await params;
  const supabase = await createClient();
  const league = await getLeagueFromHostname();

  const { data: player } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", playerId)
    .single();

  if (!player || !league) {
    return { title: "Player Not Found", robots: { index: false } };
  }

  // Get player stats for description
  const { seasons } = await getAllSeasons();
  const activeSeason = seasons.find((s) => s.status === "active" || s.status === "playoffs");

  if (activeSeason) {
    const { totals } = await getPlayerStats(playerId, activeSeason.id);
    return generatePlayerMetadata({
      playerName: player.full_name || "Unknown Player",
      leagueName: league.name,
      playerId,
      stats: totals
        ? {
            goals: totals.goals,
            assists: totals.assists,
            gamesPlayed: totals.games,
          }
        : undefined,
    });
  }

  return generatePlayerMetadata({
    playerName: player.full_name || "Unknown Player",
    leagueName: league.name,
    playerId,
  });
}

async function getPlayerData(playerId: string) {
  const supabase = await createClient();
  const { data: player, error } = await supabase.from("profiles").select("*").eq("id", playerId).single();
  if (error || !player) return { player: null };
  return { player };
}

export default async function PlayerStatsPage({ params, searchParams }: Props) {
  const { playerId } = await params;
  const { season: seasonId } = await searchParams;
  
  const { player } = await getPlayerData(playerId);
  if (!player) notFound();

  const { seasons } = await getAllSeasons();
  const activeSeason = seasons.find(s => s.status === "active" || s.status === "playoffs");
  const selectedSeasonId = seasonId || activeSeason?.id;
  
  const [playerStatsResult, goalieStatsResult] = await Promise.all([
    getPlayerStats(playerId, selectedSeasonId || undefined),
    getGoalieStats(playerId, selectedSeasonId || undefined),
  ]);

  return (
    <PlayerStatsView 
      player={player}
      seasons={seasons}
      selectedSeasonId={selectedSeasonId}
      playerStats={playerStatsResult.stats || []}
      goalieStats={goalieStatsResult.stats || []}
      playerTotals={playerStatsResult.totals || { games: 0, goals: 0, assists: 0, points: 0 }}
      goalieTotals={goalieStatsResult.totals || { games: 0, goalsAgainst: 0, saves: 0, shutouts: 0, gaa: 0, savePercentage: 0 }}
      playerId={playerId}
    />
  );
}