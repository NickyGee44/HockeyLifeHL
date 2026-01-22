import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";
import { getAllTeams } from "@/lib/teams/actions";
import { getActiveSeason } from "@/lib/seasons/actions";
import { ScheduleView } from "@/components/schedule/ScheduleView";

// Cache this page for 60 seconds
export const revalidate = 60;

export default async function SchedulePage() {
  // Get active season first
  const activeSeasonResult = await getActiveSeason();
  const activeSeason = activeSeasonResult.season;
  const activeSeasonId = activeSeason?.id;

  const [upcomingResult, recentResult, teamsResult] = await Promise.all([
    getUpcomingGames(50, activeSeasonId),
    getRecentGames(50, activeSeasonId),
    getAllTeams(),
  ]);

  const upcomingGames = upcomingResult.games || [];
  const recentGames = recentResult.games || [];
  const teams = teamsResult.teams || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">Game </span>
          <span className="text-canada-red">Schedule</span>
        </h1>
        <p className="text-muted-foreground">
          {activeSeason 
            ? `${activeSeason.name} - View upcoming games and recent results`
            : "View upcoming games and recent results"}
        </p>
      </div>

      <ScheduleView 
        upcomingGames={upcomingGames} 
        recentGames={recentGames} 
        teams={teams} 
      />
    </div>
  );
}
